
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { CliResult } from '../env/cli.js';
import {
  initTelemetry,
  peekQueueForTesting,
  resetTelemetryForTesting,
  setAppForTesting,
  type AppLike,
} from '../telemetry/index.js';
import {
  checkSetupAbandoned,
  recordAgentSetupStep,
  recordCodexSetupState,
  resetSetupTelemetryForTesting,
} from '../telemetry/setup-step.js';
import type { ClaudeVerifyVerdict } from '../agent-host/claude-verify.js';
import { ClaudeHost, type TurnRunner } from './index.js';
import { hasCompletedAgentSetup } from '../telemetry/setup-completion.js';
import { registerCodexHost } from '../codex/index.js';
import type { ClaudeLoginHandle, ClaudeLoginOutcome, StartClaudeLoginOptions } from './login.js';

const SIGNED_IN_JSON = JSON.stringify({
  loggedIn: true,
  email: 'wren@example.com',
  subscriptionType: 'max',
});
const SIGNED_OUT_JSON = JSON.stringify({ loggedIn: false });

function cliResult(verdict: 'signed-in' | 'signed-out'): CliResult {
  return verdict === 'signed-in'
    ? { ok: true, out: SIGNED_IN_JSON, err: '', timedOut: false, missing: false, exitCode: 0 }
    : { ok: false, out: SIGNED_OUT_JSON, err: '', timedOut: false, missing: false, exitCode: 1 };
}

class FakeLogin implements ClaudeLoginHandle {
  readonly authUrl = 'https://claude.com/cai/oauth/authorize?state=fixture-only-in-main';
  readonly completed: Promise<ClaudeLoginOutcome>;
  readonly codes: string[] = [];
  private settle: (outcome: ClaudeLoginOutcome) => void = () => undefined;
  private readonly rejected: Array<() => void> = [];
  private failed = false;

  constructor(private readonly openExternal: StartClaudeLoginOptions['openExternal']) {
    this.completed = new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  exitCode(): number | null {
    return null;
  }

  loginFailed(): boolean {
    return this.failed;
  }

  submitCode(code: string): boolean {
    this.codes.push(code);
    return true;
  }

  cancel(): void {
    this.settle('cancelled');
  }

  onRejected(cb: () => void): void {
    this.rejected.push(cb);
  }

  async openPage(): Promise<void> {
    await this.openExternal?.(this.authUrl);
  }

  reject(): void {
    for (const cb of this.rejected) cb();
  }

  exit(): void {
    this.settle('exited');
  }
}

function rig(options: {
  turn?: ClaudeVerifyVerdict;
  runTurn?: TurnRunner;
  startLogin?: (options: StartClaudeLoginOptions) => Promise<ClaudeLoginHandle>;
} = {}): {
  host: ClaudeHost;
  logins: FakeLogin[];
  answer: (v: 'signed-in' | 'signed-out') => void;
  onTurn: (fn: () => void) => void;
} {
  const logins: FakeLogin[] = [];
  let verdict: 'signed-in' | 'signed-out' = 'signed-out';
  let duringTurn: (() => void) | undefined;
  const host = new ClaudeHost({
    emit: () => undefined,
    openExternal: async () => undefined,
    bin: () => '/bin/claude',
    env: async () => ({ PATH: '/usr/bin' }),
    runStatus: async () => cliResult(verdict),
    // Without the seam a verification reaches the real SDK (ONL-2496).
    runTurn: async (request) => {
      duringTurn?.();
      if (options.runTurn !== undefined) return options.runTurn(request);
      return options.turn ?? { outcome: 'ok' };
    },
    startLogin: options.startLogin ?? (async (loginOptions) => {
      const login = new FakeLogin(loginOptions.openExternal);
      logins.push(login);
      return login;
    }),
  });
  return {
    host,
    logins,
    answer: (v) => {
      verdict = v;
    },
    onTurn: (fn) => {
      duringTurn = fn;
    },
  };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-claude-telemetry-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return {
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  };
}

const ENV_KEYS = ['STUDIO_POSTHOG_KEY', 'STUDIO_TELEMETRY', 'MAIN_VITE_POSTHOG_KEY', 'STUDIO_AGENT_VERIFY', 'STUDIO_STATE_ROOT'] as const;
const originalEnv = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;

beforeEach(() => {
  resetTelemetryForTesting();
  resetSetupTelemetryForTesting();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  setAppForTesting(fakeApp(makeRoot('userdata')));
  globalThis.fetch = (() => Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
});

afterEach(() => {
  resetTelemetryForTesting();
  resetSetupTelemetryForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function setupSteps(): Array<{ step: unknown; outcome: unknown; entry_point: unknown; provider: unknown }> {
  return peekQueueForTesting()
    .filter((event) => event.event === 'agent_setup_step')
    .map((event) => ({
      step: event.properties['step'],
      outcome: event.properties['outcome'],
      entry_point: event.properties['entry_point'],
      provider: event.properties['provider'],
    }));
}

describe('agent_setup_step (Claude)', () => {
  it('a full paste flow captures opened, sign_in_started, page_reopened, code_submitted x2, connected, in order, with no email/code/URL anywhere in the queue', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig();
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
    r.host.signIn({ entryPoint: 'onboarding' });
    await settle();
    r.host.openPageAgain();
    expect(r.host.submitCode('WRONG-CODE')).toEqual({ accepted: true });
    r.logins[0]!.reject();
    expect(r.host.submitCode('RIGHT-CODE')).toEqual({ accepted: true });
    r.answer('signed-in');
    r.logins[0]!.exit();
    await settle();

    expect(setupSteps()).toEqual([
      { step: 'opened', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
      { step: 'sign_in_started', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
      { step: 'page_reopened', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
      { step: 'code_submitted', outcome: 'invalid_code', entry_point: 'onboarding', provider: 'claude' },
      { step: 'code_submitted', outcome: 'ok', entry_point: 'onboarding', provider: 'claude' },
      { step: 'verify_started', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
      { step: 'connected', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
    ]);

    const serialized = JSON.stringify(peekQueueForTesting());
    expect(serialized).not.toContain('wren@example.com');
    expect(serialized).not.toContain('WRONG-CODE');
    expect(serialized).not.toContain('RIGHT-CODE');
    expect(serialized).not.toContain('https://');
  });

  it('a verification reports the connection once per transition, not once per check (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig();
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });

    const steps = setupSteps().map((s) => s.step);
    expect(steps.filter((step) => step === 'verify_started')).toHaveLength(2);
    expect(steps.filter((step) => step === 'connected')).toHaveLength(1);
  });

  it('a failed verification reports the family that failed, not a sign-in failure (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig({ turn: { outcome: 'failed', detail: 'turn-provider-refused' } });
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });

    expect(setupSteps().filter((s) => s.step === 'fallback')).toEqual([
      { step: 'fallback', outcome: 'provider_refused', entry_point: 'onboarding', provider: 'claude' },
    ]);
  });

  for (const [detail, outcome] of [
    ['turn-usage-limit', 'agent_busy'],
    ['turn-rate-limited', 'agent_busy'],
    ['turn-service-error', 'agent_busy'],
    ['turn-billing', 'agent_error'],
    ['turn-sign-in-rejected', 'provider_refused'],
  ] as const) {
    it(`${detail} reports the outcome its cause reported before the split (ONL-2903)`, async () => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
      const r = rig({ turn: { outcome: 'failed', detail } });
      r.answer('signed-in');
      await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
      expect(setupSteps().filter((s) => s.step === 'fallback').map((s) => s.outcome)).toEqual([outcome]);
    });
  }

  it('a cheap read that finds a credential reports no connection, because no turn ran (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig();
    // The sheet was opened earlier, so an entry point is remembered; the recheck itself carries none.
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'recheck' });

    // Reporting a connection here is the stale-credential case (ONL-2496).
    expect(setupSteps().map((s) => s.step)).not.toContain('connected');
  });

  it('verify_started lands when the turn starts, not when it answers (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    let duringTurn: unknown[] = [];
    const r = rig({ turn: { outcome: 'ok' } });
    r.answer('signed-in');
    r.onTurn(() => {
      duringTurn = setupSteps().map((s) => s.step);
    });
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });

    // A quit mid-turn would otherwise leave no attempt in the funnel at all.
    expect(duringTurn).toContain('verify_started');
  });

  it('a pinned verdict reports nothing, so a driven build cannot write the funnel (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    // The switch is what makes the verdict pinned in production, so the rig sets it alongside the seam.
    process.env['STUDIO_AGENT_VERIFY'] = 'ok';
    const r = rig({ turn: { outcome: 'ok', pinned: true } });
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });

    const steps = setupSteps().map((s) => s.step);
    expect(steps).not.toContain('verify_started');
    expect(steps).not.toContain('connected');
  });

  it('a pinned failure writes no fallback and no completion either (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    process.env['STUDIO_AGENT_VERIFY'] = 'turn-provider-refused';
    const refused = rig({ turn: { outcome: 'failed', detail: 'turn-provider-refused', pinned: true } });
    refused.answer('signed-in');
    await refused.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });

    const launch = rig({ turn: { outcome: 'launch-failed', errorClass: 'executable_not_found', pinned: true } });
    launch.answer('signed-in');
    await launch.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });

    expect(setupSteps().map((s) => s.step)).not.toContain('fallback');
    // `fallback` also completes the funnel, so a driven build would score a failure it invented.
    expect(peekQueueForTesting().map((event) => event.event)).not.toContain('agent_setup_completed');
  });

  it('a tap behind the boot pre-check reports one open, not two (ONL-2496)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig();
    r.answer('signed-in');
    const boot = r.host.detect({ fresh: true, cause: 'boot' });
    const tapped = r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
    await Promise.all([boot, tapped]);

    expect(setupSteps().filter((s) => s.step === 'opened')).toHaveLength(1);
  });

  it('a sign-in that cannot start after the boot check stays attributed to startup (ONL-3107)', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig({ startLogin: async () => { throw new Error('login could not start'); } });
    const boot = await r.host.detect({ fresh: true, cause: 'boot' });
    expect(boot.status).toBe('signed-out');
    r.host.signIn({ entryPoint: 'editor' });
    await settle();

    expect(setupSteps()).toEqual([
      { step: 'sign_in_started', outcome: undefined, entry_point: 'editor', provider: 'claude' },
      { step: 'fallback', outcome: 'failed', entry_point: 'startup', provider: 'claude' },
    ]);
  });

  it('a cancel that kills the child captures cancelled exactly once', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig();
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'editor' });
    r.host.signIn({ entryPoint: 'editor' });
    await settle();
    r.host.cancel();
    r.host.cancel();
    await settle();

    expect(setupSteps().filter((s) => s.step === 'cancelled')).toEqual([
      { step: 'cancelled', outcome: undefined, entry_point: 'editor', provider: 'claude' },
    ]);
  });

  it('a codex step with no entry point of its own borrows the one Claude last saw; one of its own wins and never leaks back into Claude', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const r = rig();
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
    recordAgentSetupStep('codex', 'opened');
    recordAgentSetupStep('codex', 'install_started', { entryPoint: 'editor' });
    recordAgentSetupStep('codex', 'cancelled');
    recordAgentSetupStep('claude', 'cancelled');

    expect(setupSteps()).toEqual([
      { step: 'opened', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
      { step: 'opened', outcome: undefined, entry_point: 'onboarding', provider: 'codex' },
      { step: 'install_started', outcome: undefined, entry_point: 'editor', provider: 'codex' },
      { step: 'cancelled', outcome: undefined, entry_point: 'editor', provider: 'codex' },
      { step: 'cancelled', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
    ]);
  });

  it('a skipped step carries a reason and records no completion (ONL-2686)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    recordAgentSetupStep('claude', 'skipped', { entryPoint: 'onboarding', reason: 'provider_detected' });

    expect(setupSteps()).toEqual([
      { step: 'skipped', outcome: undefined, entry_point: 'onboarding', provider: 'claude' },
    ]);
    expect(peekQueueForTesting().map((e) => e.event)).not.toContain('agent_setup_completed');

    const skippedEvent = peekQueueForTesting().find((e) => e.event === 'agent_setup_step');
    expect(skippedEvent?.properties['reason']).toBe('provider_detected');
  });

  it('completion counts only working connections and keeps Claude and Codex failures distinct', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    recordAgentSetupStep('claude', 'opened', { entryPoint: 'settings' });
    recordAgentSetupStep('claude', 'connected');
    recordAgentSetupStep('claude', 'fallback', { outcome: 'rejected' });
    recordAgentSetupStep('claude', 'cancelled');
    recordAgentSetupStep('codex', 'install_started', { entryPoint: 'editor' });
    recordCodexSetupState('downloading');
    recordCodexSetupState('broken');

    const completed = peekQueueForTesting()
      .filter((event) => event.event === 'agent_setup_completed')
      .map(({ properties }) => ({
        provider: properties['provider'],
        success: properties['success'],
        entry_point: properties['entry_point'],
        outcome: properties['outcome'],
      }));
    expect(completed).toEqual([
      { provider: 'claude', success: true, entry_point: 'settings', outcome: undefined },
    ]);
    expect(setupSteps().filter((step) => step.step === 'fallback')).toEqual([
      { provider: 'claude', step: 'fallback', entry_point: 'settings', outcome: 'rejected' },
      { provider: 'codex', step: 'fallback', entry_point: 'editor', outcome: 'failed' },
    ]);
  });
});

describe('agent_setup_abandoned (ONL-2686)', () => {
  it('closing Codex during validation records connected without a contradictory cancellation', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    let enteredValidation = (): void => {};
    let finishValidation = (): void => {};
    const entered = new Promise<void>((resolve) => { enteredValidation = resolve; });
    const pending = new Promise<void>((resolve) => { finishValidation = resolve; });
    const host = registerCodexHost({
      startLogin: async () => ({ authUrl: 'https://example.test', loginId: 'fixture', completed: Promise.resolve({ success: true }), cancel: async () => {} }),
      openExternal: async () => {},
      validate: async () => {
        enteredValidation();
        await pending;
        return { outcome: 'ok', message: '' };
      },
    });
    host.signIn('settings');
    await entered;
    await host.cancelSignIn();
    finishValidation();
    await settle();
    expect(setupSteps().map((step) => step.step)).toEqual(['sign_in_started', 'connected']);
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  it('a late successful Codex login cannot connect after cancellation', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    let finishLogin = (): void => {};
    const completed = new Promise<{ success: boolean }>((resolve) => { finishLogin = () => resolve({ success: true }); });
    let validations = 0;
    const host = registerCodexHost({
      startLogin: async () => ({ authUrl: 'https://example.test', loginId: 'fixture', completed, cancel: async () => {} }),
      openExternal: async () => {},
      validate: async () => { validations += 1; return { outcome: 'ok', message: '' }; },
    });
    host.signIn('editor');
    await settle();
    await host.cancelSignIn();
    finishLogin();
    await settle();
    expect(host.current().status).toBe('signed-out');
    expect(validations).toBe(0);
    expect(setupSteps().map((step) => step.step)).toEqual(['sign_in_started', 'cancelled']);
  });

  it('successful verification of an already detected provider is not abandonment', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const r = rig();
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'boot' });
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'onboarding' });
    r.host.cancel();
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  it('a failed Codex login is terminal fallback rather than abandonment', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const host = registerCodexHost({ startLogin: async () => ({ authUrl: 'https://example.test', loginId: 'fixture', completed: Promise.resolve({ success: false, error: 'private login failure' }), cancel: async () => {} }), openExternal: async () => {} });
    host.signIn('editor');
    await settle();
    await host.cancelSignIn();
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_step').at(-1)?.properties).toMatchObject({ provider: 'codex', step: 'fallback', outcome: 'failed' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned')).toHaveLength(0);
    expect(JSON.stringify(peekQueueForTesting())).not.toContain('private login failure');
  });
  it('abandons once per attempt, including reopening after a terminal result', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    recordAgentSetupStep('claude', 'opened', { entryPoint: 'settings' });
    recordAgentSetupStep('claude', 'connected');
    recordAgentSetupStep('claude', 'opened', { entryPoint: 'editor' });
    checkSetupAbandoned();
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned').map((row) => ({ last_step: row.properties['last_step'], provider: row.properties['provider'], entry_point: row.properties['entry_point'] }))).toEqual([{ last_step: 'opened', provider: 'claude', entry_point: 'editor' }]);
  });

  it('closing a Claude setup sheet before sign-in records abandonment immediately', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const r = rig();
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'editor' });
    r.host.cancel();
    r.host.cancel();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned')).toHaveLength(1);
  });

  it('an existing Claude sign-in completes setup once per install across launches', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const r = rig();
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'boot' });
    const completed = () => peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed');
    expect(completed().map((row) => row.properties)).toMatchObject([
      { provider: 'claude', success: true, entry_point: 'startup' },
    ]);
    resetSetupTelemetryForTesting();
    const relaunched = rig();
    relaunched.answer('signed-in');
    let turns = 0;
    relaunched.onTurn(() => { turns += 1; });
    await relaunched.host.detect({ fresh: true, cause: 'boot' });
    expect(completed()).toHaveLength(1);
    expect(turns).toBe(0);
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  for (const succeeds of [true, false]) {
    it(`Claude startup ${succeeds ? 'success' : 'failure'} does not become a Codex setup entry point`, async () => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
      const r = rig(succeeds ? {} : { turn: { outcome: 'failed', detail: 'turn-provider-refused' } });
      r.answer('signed-in');
      await r.host.detect({ fresh: true, cause: 'boot' });
      recordAgentSetupStep('codex', 'install_started');
      recordAgentSetupStep('codex', 'connected');
      expect(setupSteps().filter((row) => row.provider === 'codex')).toEqual([
        { provider: 'codex', step: 'install_started', outcome: undefined, entry_point: 'unknown' },
        { provider: 'codex', step: 'connected', outcome: undefined, entry_point: 'unknown' },
      ]);
      expect(peekQueueForTesting().find((row) => row.event === 'agent_setup_completed' && row.properties['provider'] === 'codex')?.properties).toMatchObject({ entry_point: 'unknown', success: true });
    });
  }

  it('failed boot verification is not completion and can succeed on the next launch', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const failed = rig({ turn: { outcome: 'failed', detail: 'turn-provider-refused' } });
    failed.answer('signed-in');
    await failed.host.detect({ fresh: true, cause: 'boot' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(0);
    expect(setupSteps()).toContainEqual({ provider: 'claude', step: 'fallback', outcome: 'provider_refused', entry_point: 'startup' });
    resetSetupTelemetryForTesting();
    const retry = rig();
    retry.answer('signed-in');
    await retry.host.detect({ fresh: true, cause: 'boot' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
  });

  it('verification after a cheap credential read still records the first working connection', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const r = rig();
    r.answer('signed-in');
    await r.host.detect({ fresh: true, cause: 'recheck' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(0);
    await r.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'editor' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
  });

  it('steps without an entry point are attributed to unknown rather than dropped', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    recordAgentSetupStep('codex', 'fallback', { outcome: 'failed' });
    expect(setupSteps()).toEqual([{ provider: 'codex', step: 'fallback', outcome: 'failed', entry_point: 'unknown' }]);
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(0);
  });

  it('a cancelled boot verification never consumes the install completion', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const cancelled = rig({ turn: { outcome: 'cancelled' } });
    cancelled.answer('signed-in');
    await cancelled.host.detect({ fresh: true, cause: 'boot' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(0);
    resetSetupTelemetryForTesting();
    const retry = rig();
    retry.answer('signed-in');
    await retry.host.detect({ fresh: true, cause: 'boot' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
  });

  it('interactive completion prevents another startup completion on the next launch', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const interactive = rig();
    interactive.answer('signed-in');
    await interactive.host.detect({ fresh: true, cause: 'recheck', entryPoint: 'settings' });
    resetSetupTelemetryForTesting();
    const boot = rig();
    boot.answer('signed-in');
    let turns = 0;
    boot.onTurn(() => { turns += 1; });
    await boot.host.detect({ fresh: true, cause: 'boot' });
    expect(turns).toBe(0);
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
  });

  it('a disabled capture never consumes completion before telemetry is enabled on the same install', async () => {
    initTelemetry();
    const disabled = rig();
    disabled.answer('signed-in');
    await disabled.host.detect({ fresh: true, cause: 'boot' });
    expect(peekQueueForTesting()).toHaveLength(0);
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    resetTelemetryForTesting();
    resetSetupTelemetryForTesting();
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const enabled = rig();
    enabled.answer('signed-in');
    await enabled.host.detect({ fresh: true, cause: 'boot' });
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
    expect(hasCompletedAgentSetup('claude')).toBe(true);
  });

  it('a tap joining first-install boot verification shares one turn and one completion', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    let turns = 0;
    const r = rig({ runTurn: async () => {
      turns += 1;
      started.resolve();
      await release.promise;
      return { outcome: 'ok' };
    } });
    r.answer('signed-in');
    const boot = r.host.detect({ fresh: true, cause: 'boot' });
    await started.promise;
    const tap = r.host.detect({ fresh: true, entryPoint: 'editor' });
    expect(hasCompletedAgentSetup('claude')).toBe(false);
    release.resolve();
    await Promise.all([boot, tap]);
    expect(turns).toBe(1);
    expect(setupSteps().filter((step) => step.step === 'opened')).toHaveLength(1);
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(1);
    expect(hasCompletedAgentSetup('claude')).toBe(true);
  });

  for (const retry of [false, true]) {
    it(`cancelling a held first-install boot turn ${retry ? 'lets a new tap verify' : 'records no completion'}`, async () => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
      const started = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      let turns = 0;
      const r = rig({ runTurn: async ({ signal }) => {
        turns += 1;
        if (turns === 1) {
          started.resolve();
          await release.promise;
        }
        return signal.aborted ? { outcome: 'cancelled' } : { outcome: 'ok' };
      } });
      r.answer('signed-in');
      const boot = r.host.detect({ fresh: true, cause: 'boot' });
      await started.promise;
      r.host.cancel();
      const tap = retry ? r.host.detect({ fresh: true, entryPoint: 'editor' }) : undefined;
      expect(hasCompletedAgentSetup('claude')).toBe(false);
      expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(0);
      release.resolve();
      await Promise.all([boot, tap]);
      expect(turns).toBe(retry ? 2 : 1);
      expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_completed')).toHaveLength(retry ? 1 : 0);
      expect(hasCompletedAgentSetup('claude')).toBe(retry);
      expect(r.host.current().status).not.toBe('verifying');
      expect(r.host.current().status).not.toBe('checking');
    });
  }
  it('fires when setup opened but never reached a terminal step', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    recordAgentSetupStep('claude', 'opened', { entryPoint: 'onboarding' });
    recordAgentSetupStep('claude', 'sign_in_started');
    checkSetupAbandoned();

    const abandoned = peekQueueForTesting().filter((e) => e.event === 'agent_setup_abandoned');
    expect(abandoned).toHaveLength(1);
    expect(abandoned[0]?.properties['last_step']).toBe('sign_in_started');
  });

  it('does not fire after connected', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    recordAgentSetupStep('claude', 'opened', { entryPoint: 'editor' });
    recordAgentSetupStep('claude', 'connected');
    checkSetupAbandoned();

    expect(peekQueueForTesting().filter((e) => e.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  it('does not fire after cancelled', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    recordAgentSetupStep('claude', 'opened', { entryPoint: 'settings' });
    recordAgentSetupStep('claude', 'cancelled');
    checkSetupAbandoned();

    expect(peekQueueForTesting().filter((e) => e.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  it('does not fire after fallback', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    recordAgentSetupStep('claude', 'opened', { entryPoint: 'onboarding' });
    recordAgentSetupStep('claude', 'fallback', { outcome: 'rejected' });
    checkSetupAbandoned();

    expect(peekQueueForTesting().filter((e) => e.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  it('does not fire when no setup step was recorded', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    checkSetupAbandoned();

    expect(peekQueueForTesting().filter((e) => e.event === 'agent_setup_abandoned')).toHaveLength(0);
  });
});
