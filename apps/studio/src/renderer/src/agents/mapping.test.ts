import { describe, expect, it } from 'bun:test';
import { CLAUDE_API_KEY_PLAN, CLAUDE_LOGIN_COMMAND, CODEX_API_KEY_PLAN, type ClaudeSetupState, type ClaudeSetupVerdict, type CodexSetupState } from '@studio/events';
import { footerFor, type SetupState } from '@studio/onboarding-ui/state';
import { CODEX_DEVICE_AUTH_COMMAND, chatGptSetupState, claudeMark, claudePlanId, claudeSetupState, codexMark, isClaudeConnected } from './mapping.js';
import { agentSetupStrings } from '../agent-setup/strings.js';

const strings = agentSetupStrings();

it('a missing bundled runtime offers recovery instead of an unavailable Terminal command', () => {
  expect(claudeSetupState({ status: 'failed', detail: 'spawn', command: CLAUDE_LOGIN_COMMAND }, strings).state).toEqual({
    harness: 'claude', state: 'cannot-connect', detail: '', runtimeUnavailable: true,
  });
});

function claude<Verdict extends ClaudeSetupVerdict>(verdict: Verdict): Verdict & { command: string } {
  return { ...verdict, command: CLAUDE_LOGIN_COMMAND };
}

describe('the codex table', () => {
  it('carries the machine bytes into downloading and draws indeterminate as zero', () => {
    expect(chatGptSetupState({ status: 'downloading', percent: 42 }, strings).state).toEqual({ harness: 'codex', state: 'downloading', percent: 42 });
    expect(chatGptSetupState({ status: 'downloading' }, strings).state).toEqual({ harness: 'codex', state: 'downloading', percent: 0 });
  });

  it("puts the agent's own words under the three failure headlines", () => {
    expect(chatGptSetupState({ status: 'broken', message: 'exit 1' }, strings).state).toEqual({ harness: 'codex', state: 'wont-start', detail: 'exit 1' });
    expect(chatGptSetupState({ status: 'failed' }, strings).state).toEqual({ harness: 'codex', state: 'setup-failed', detail: '' });
    expect(chatGptSetupState({ status: 'unsupported', message: 'unsupported platform' }, strings, { otherReady: false }).state).toEqual({ harness: 'codex', state: 'setup-failed', detail: 'unsupported platform', other: { harness: 'claude', ready: false } });
  });

  it('synthesizes fallback only when a sign-in attempt ended back in signed-out with a detail', () => {
    const rejected: CodexSetupState = { status: 'signed-out', message: 'sign-in did not complete' };
    expect(chatGptSetupState(rejected, strings, { attemptedSignIn: true }).state).toEqual({ harness: 'codex', state: 'fallback', command: CODEX_DEVICE_AUTH_COMMAND, detail: rejected.message });
    expect(chatGptSetupState(rejected, strings).state.state).toBe('not-signed-in');
    expect(chatGptSetupState({ status: 'signed-out' }, strings, { attemptedSignIn: true }).state.state).toBe('not-signed-in');
  });

  it('gives a key account its own line rather than capitalising it into the plan template', () => {
    expect(chatGptSetupState({ status: 'ready', plan: CODEX_API_KEY_PLAN }, strings).state).toMatchObject({ state: 'connected', plan: strings.codexApiKeyPlan });
  });

  it("draws the machine's device-auth line on the fallback when it resolved its binary, the bare one before", () => {
    const attempted = { attemptedSignIn: true };
    const resolved: CodexSetupState = { status: 'signed-out', message: 'refused', command: '/cache/codex login --device-auth' };
    expect(chatGptSetupState(resolved, strings, attempted).state).toEqual({ harness: 'codex', state: 'fallback', command: '/cache/codex login --device-auth', detail: 'refused' });
    expect(chatGptSetupState({ status: 'signed-out', message: 'refused' }, strings, attempted).state).toMatchObject({ command: CODEX_DEVICE_AUTH_COMMAND });
  });
});

describe('the Claude table', () => {
  it('draws not-signed-in busy from idle, the only status with nothing asked yet', () => {
    expect(claudeSetupState(claude({ status: 'idle' }), strings)).toEqual({ state: { harness: 'claude', state: 'not-signed-in' }, busy: true });
    expect(claudeSetupState(claude({ status: 'idle' }), strings, { previous: claude({ status: 'idle' }) }).state.state).toBe('not-signed-in');
  });

  it('a check in flight says so instead of redrawing the last verdict (ONL-2496)', () => {
    const previous = claude({ status: 'signed-in', email: 'a@b.c', plan: 'max' });
    for (const status of ['checking', 'verifying'] as const) {
      const drawn = claudeSetupState(claude({ status }), strings, { previous, busy: true });
      expect(drawn, status).toEqual({ state: { harness: 'claude', state: 'checking' }, busy: true });
    }
  });

  it('counts neither the running check nor its failure as a connection (ONL-2496)', () => {
    expect(isClaudeConnected(claude({ status: 'verifying' }))).toBe(false);
    expect(isClaudeConnected(claude({ status: 'verification-failed', detail: 'turn-service-error' }))).toBe(false);
  });

  it('reads the plan from subscriptionType, a key account as its own and anything else as unknown', () => {
    expect(claudePlanId('max')).toBe('max');
    expect(claudePlanId(CLAUDE_API_KEY_PLAN)).toBe('api-key');
    expect(claudePlanId('something-new')).toBe('unknown');
    expect(claudePlanId(undefined)).toBe('unknown');
  });

  it('draws failed as the fallback with the command and the detail naming why', () => {
    expect(claudeSetupState(claude({ status: 'failed', detail: 'did-not-answer' }), strings).state).toEqual({
      harness: 'claude',
      state: 'fallback',
      command: CLAUDE_LOGIN_COMMAND,
      detail: strings.claudeDetail['did-not-answer'],
    });
  });
});

describe('a failed verification', () => {
  it('sends the signed-out verdict to the sign-in sheet carrying its reason (ONL-2496)', () => {
    expect(claudeSetupState(claude({ status: 'verification-failed', detail: 'turn-signed-out' }), strings).state).toEqual({
      harness: 'claude',
      state: 'not-signed-in',
      detail: strings.claudeDetail['turn-signed-out'],
    });
  });

  type Sheet = Extract<SetupState, { state: 'cannot-connect' }>;
  const sheet = (rest: Omit<Extract<ClaudeSetupState, { status: 'verification-failed' }>, 'status' | 'command'>, otherReady: boolean | undefined = false, now = 1_000_000): Sheet => {
    const mapped = claudeSetupState(claude({ status: 'verification-failed', plan: 'max', ...rest }), strings, { ...(otherReady === undefined ? {} : { otherReady }), now }).state;
    if (mapped.harness !== 'claude' || mapped.state !== 'cannot-connect') throw new Error('Expected a Claude connection failure');
    return mapped;
  };

  // Each verdict a sign-in cannot fix gets the sheet that names its cause, the footer that can fix it, and the other agent only where it helps (ONL-2903).
  it('gives each cause its own footer and offers the other agent everywhere but a brief service error', () => {
    const cases = [
      ['turn-usage-limit', 'usage-limit', { ghost: 'see-usage', primary: 'check-again' }, true],
      ['turn-rate-limited', 'rate-limited', { primary: 'check-again' }, true],
      ['turn-billing', 'billing', { ghost: 'open-billing', primary: 'check-again' }, true],
      ['turn-no-answer', 'no-answer', { primary: 'check-again' }, true],
      ['turn-service-error', 'service-error', { primary: 'check-again' }, false],
      ['turn-provider-refused', 'agent-error', { primary: 'check-again' }, true],
      ['turn-agent-error', 'agent-error', { primary: 'check-again' }, true],
    ] as const;
    for (const [detail, cause, footer, offers] of cases) {
      const drawn = sheet({ detail });
      expect([detail, drawn.cause, footerFor(drawn), drawn.other !== undefined]).toEqual([detail, cause, footer, offers]);
    }
  });

  it("boxes the provider's words or status, never Studio's own sentence", () => {
    expect(sheet({ detail: 'turn-rate-limited', turn: { diagnostic: { kind: 'rate_limit', status: 429 } } }).diagnostic).toBe('HTTP 429 rate_limit');
    expect(sheet({ detail: 'turn-service-error', turn: { diagnostic: { kind: 'overloaded', status: 529 } } }).diagnostic).toBe('HTTP 529 overloaded');
    const said = sheet({ detail: 'turn-agent-error', turn: { sentence: 'API Error: disabled' } });
    expect([said.diagnostic, footerFor(said)]).toEqual(['API Error: disabled', { ghost: 'copy-details', primary: 'check-again' }]);
    for (const detail of ['turn-usage-limit', 'turn-billing', 'turn-no-answer', 'turn-agent-error'] as const) {
      const drawn = sheet({ detail });
      expect([detail, drawn.diagnostic, drawn.detail]).toEqual([detail, undefined, '']);
    }
  });

  it('holds Check again until a known reset, and drops the usage link that would only show the same time', () => {
    const now = 1_000_000;
    const resetsAt = (now + 3_600_000) / 1000;
    const waiting = sheet({ detail: 'turn-usage-limit', turn: { limit: { window: 'session', resetsAt } } }, false, now);
    expect([waiting.retryAt, footerFor(waiting)]).toEqual([resetsAt * 1000, { primary: 'check-again' }]);
    expect(waiting.retryLabel).toBeDefined();
    const passed = sheet({ detail: 'turn-usage-limit', turn: { limit: { window: 'session', resetsAt } } }, false, resetsAt * 1000 + 1);
    expect(passed.retryAt).toBeUndefined();
  });

  it('offers no account page where the plan has none', () => {
    for (const plan of ['bedrock', 'custom-endpoint'] as const) {
      expect(footerFor(sheet({ detail: 'turn-billing', plan })), plan).toEqual({ primary: 'check-again' });
      expect(footerFor(sheet({ detail: 'turn-usage-limit', plan })), plan).toEqual({ primary: 'check-again' });
    }
    expect(footerFor(sheet({ detail: 'turn-billing', plan: CLAUDE_API_KEY_PLAN }))).toEqual({ ghost: 'open-billing', primary: 'check-again' });
  });

  it("says whether the other agent is already set up, and offers none on a host that cannot open it", () => {
    expect(sheet({ detail: 'turn-no-answer' }, true).other).toEqual({ harness: 'codex', ready: true });
    const hostWithoutSwitch = claudeSetupState(claude({ status: 'verification-failed', detail: 'turn-no-answer' }), strings).state;
    expect('other' in hostWithoutSwitch ? hostWithoutSwitch.other : undefined).toBeUndefined();
  });

  it('sends a refused sign-in to the sign-in sheet with its status in the box (ONL-2903)', () => {
    const drawn = claudeSetupState(claude({ status: 'verification-failed', detail: 'turn-sign-in-rejected', turn: { diagnostic: { kind: 'authentication_failed', status: 401 } } }), strings).state;
    expect(drawn.state).toBe('not-signed-in');
    expect(drawn.harness === 'claude' && drawn.state === 'not-signed-in' ? [drawn.diagnostic, drawn.copy !== undefined, footerFor(drawn)] : undefined).toEqual(['HTTP 401 authentication_failed', true, { primary: 'sign-in' }]);
  });

  it('offers Claude on a ChatGPT setup that failed or will not start', () => {
    for (const status of ['failed', 'broken'] as const) {
      const drawn = chatGptSetupState({ status, message: 'x' }, strings, { otherReady: false }).state;
      expect('other' in drawn ? drawn.other : undefined, status).toEqual({ harness: 'claude', ready: false });
    }
  });
});

describe('the tile marks', () => {
  const touched = { claude: true, codex: true };
  const untouched = { claude: false, codex: false };

  it('paints nothing before a tap, whatever the machine knows (ONL-2186)', () => {
    expect(claudeMark({ claude: claude({ status: 'signed-in' }), touched: untouched })).toBeUndefined();
    expect(codexMark({ codex: { status: 'ready' }, touched: untouched })).toBeUndefined();
  });

  it("paints the package's mark after a tap", () => {
    expect(claudeMark({ claude: claude({ status: 'signed-in' }), touched })).toBe('connected');
    expect(claudeMark({ claude: claude({ status: 'failed', detail: 'exited' }), touched })).toBe('attention');
    expect(claudeMark({ claude: claude({ status: 'signed-out' }), touched })).toBeUndefined();
    expect(codexMark({ codex: { status: 'ready' }, touched })).toBe('connected');
    expect(codexMark({ codex: { status: 'broken', message: 'x' }, touched })).toBe('attention');
  });

  it('drops the connected mark while a check runs, so the tile never outlives its proof (ONL-2496)', () => {
    for (const status of ['checking', 'verifying'] as const) {
      expect(claudeMark({ claude: claude({ status }), claudeSettled: claude({ status: 'signed-in' }), touched }), status).toBeUndefined();
      expect(claudeMark({ claude: claude({ status }), touched }), status).toBeUndefined();
    }
  });

  it('a failed verification needs the user, and reads as the sign-in sheet does when a sign-in is the remedy (ONL-2496)', () => {
    expect(claudeMark({ claude: claude({ status: 'verification-failed', detail: 'turn-provider-refused' }), touched })).toBe('attention');
    expect(claudeMark({ claude: claude({ status: 'verification-failed', detail: 'turn-signed-out' }), touched })).toBeUndefined();
  });
});
