import { CLAUDE_LOGIN_COMMAND, type ClaudeBrowser, type ClaudeSetupState } from '@studio/events';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import electron from 'electron';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { markAgentSetupCompleted, resetSetupCompletionCacheForTesting } from '../telemetry/setup-completion.js';
import type { ClaudeVerifyVerdict } from '../agent-host/claude-verify.js';
import type { CliResult } from '../env/cli.js';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import {
  claudeBinary,
  openExternalForClaude,
  pinClaudeConfigDir,
  resetClaudeEnvForTests,
  scrubStudioSession,
} from './env.js';
import {
  cancelClaudeLoginForQuit,
  ClaudeHost,
  registerClaudeHost,
  startClaudeBootPreCheck,
  type ClaudeHostOptions,
  type ClaudeProofHook,
  type ClaudeStateMeta,
} from './index.js';
import type { ClaudeLoginHandle, ClaudeLoginOutcome, StartClaudeLoginOptions } from './login.js';
import { ClaudeBrowserPreparationError } from './browsers.js';

let stateRoot: string;
const originalStateRoot = process.env['STUDIO_STATE_ROOT'];

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'studio-claude-host-'));
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetSetupCompletionCacheForTesting();
  markAgentSetupCompleted('claude');
});

afterEach(() => {
  resetSetupCompletionCacheForTesting();
  if (originalStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalStateRoot;
  rmSync(stateRoot, { recursive: true, force: true });
});

const SIGNED_IN_JSON = JSON.stringify({ loggedIn: true, email: 'wren@example.com', subscriptionType: 'max' });
const SIGNED_IN_KEY_JSON = JSON.stringify({ loggedIn: true, authMethod: 'api_key' });
const SIGNED_OUT_JSON = JSON.stringify({ loggedIn: false });

type Verdict = 'signed-in' | 'signed-in-key' | 'signed-out' | 'failed' | 'timed-out' | 'missing';

function cliResult(verdict: Verdict): CliResult {
  switch (verdict) {
    case 'signed-in':
      return { ok: true, out: SIGNED_IN_JSON, err: '', timedOut: false, missing: false, exitCode: 0 };
    case 'signed-in-key':
      return { ok: true, out: SIGNED_IN_KEY_JSON, err: '', timedOut: false, missing: false, exitCode: 0 };
    case 'signed-out':
      return { ok: false, out: SIGNED_OUT_JSON, err: '', timedOut: false, missing: false, exitCode: 1 };
    case 'failed':
      return { ok: false, out: '', err: '', timedOut: false, missing: false, exitCode: 2 };
    case 'timed-out':
      return { ok: false, out: '', err: '', timedOut: true, missing: false, exitCode: null };
    case 'missing':
      return { ok: false, out: '', err: 'spawn ENOENT', timedOut: false, missing: true, exitCode: null };
  }
}

class FakeLogin implements ClaudeLoginHandle {
  readonly authUrl = 'https://claude.com/cai/oauth/authorize?state=fixture';
  readonly completed: Promise<ClaudeLoginOutcome>;
  readonly codes: string[] = [];
  readonly opened: string[] = [];
  cancelled = 0;
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
    this.cancelled += 1;
    this.settle('cancelled');
  }

  onRejected(cb: () => void): void {
    this.rejected.push(cb);
  }

  async openPage(): Promise<void> {
    this.opened.push(this.authUrl);
    await this.openExternal?.(this.authUrl);
  }

  reject(): void {
    for (const cb of this.rejected) cb();
  }

  exit(options: { loginFailed?: boolean } = {}): void {
    this.failed = options.loginFailed ?? false;
    this.settle('exited');
  }

  abandon(): void {
    this.settle('abandoned');
  }
}

interface Rig {
  host: ClaudeHost;
  emitted: ClaudeSetupState[];
  meta: ClaudeStateMeta[];
  statusCalls: number;
  turnCalls: number;
  logins: FakeLogin[];
  opened: string[];
  loginOptions: StartClaudeLoginOptions[];
  selectedBrowsers: string[];
  answer: (verdict: Verdict) => void;
  answerTurn: (verdict: ClaudeVerifyVerdict) => void;
  releaseStartLogin: () => void;
  holdNextTurn: () => void;
  releaseTurn: () => void;
}

function rig(
  initial: Verdict = 'signed-out',
  options: {
    bin?: string | undefined;
    startLoginError?: Error;
    holdStartLogin?: boolean;
    register?: boolean;
    browsers?: () => ClaudeBrowser[];
    browserLoginError?: () => Error | undefined;
  } = {},
): Rig {
  const emitted: ClaudeSetupState[] = [];
  const meta: ClaudeStateMeta[] = [];
  const logins: FakeLogin[] = [];
  const opened: string[] = [];
  const loginOptions: StartClaudeLoginOptions[] = [];
  const selectedBrowsers: string[] = [];
  let verdict = initial;
  let turn: ClaudeVerifyVerdict = { outcome: 'ok' };
  let heldTurn: Promise<void> | undefined;
  let releaseTurn: (() => void) | undefined;
  const state = { statusCalls: 0, turnCalls: 0 };
  let release: (() => void) | undefined;
  const held = options.holdStartLogin
    ? new Promise<void>((resolve) => {
        release = resolve;
      })
    : undefined;
  const startLogin = async (next: StartClaudeLoginOptions): Promise<FakeLogin> => {
    loginOptions.push(next);
    if (options.startLoginError) throw options.startLoginError;
    const login = new FakeLogin(next.openExternal);
    logins.push(login);
    if (held) await held;
    return login;
  };
  const hostOptions: ClaudeHostOptions = {
    browsers: options.browsers ?? (() => []),
    browserLogin: async (browserId, next) => {
      selectedBrowsers.push(browserId);
      const preparationError = options.browserLoginError?.();
      if (preparationError !== undefined) throw preparationError;
      return startLogin(next);
    },
    emit: (next) => emitted.push(next),
    onState: (_state, m) => meta.push(m),
    openExternal: async (url) => {
      opened.push(url);
    },
    bin: () => ('bin' in options ? options.bin : '/bin/claude'),
    env: async () => ({ PATH: '/usr/bin' }),
    runStatus: async () => {
      state.statusCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return cliResult(verdict);
    },
    // Without the seam a verification reaches the real SDK (ONL-2496).
    runTurn: async ({ signal }) => {
      state.turnCalls += 1;
      if (heldTurn) await heldTurn;
      // The real one answers `cancelled` on an aborted signal; so does this.
      return signal.aborted ? { outcome: 'cancelled' } : turn;
    },
    startLogin,
  };
  const host = options.register ? registerClaudeHost(hostOptions) : new ClaudeHost(hostOptions);
  return {
    host,
    emitted,
    meta,
    logins,
    opened,
    loginOptions,
    selectedBrowsers,
    get statusCalls() {
      return state.statusCalls;
    },
    get turnCalls() {
      return state.turnCalls;
    },
    answer: (next) => {
      verdict = next;
    },
    answerTurn: (next: ClaudeVerifyVerdict) => {
      turn = next;
    },
    releaseStartLogin: () => release?.(),
    holdNextTurn: () => {
      heldTurn = new Promise<void>((resolve) => {
        releaseTurn = () => {
          heldTurn = undefined;
          resolve();
        };
      });
    },
    releaseTurn: () => releaseTurn?.(),
  };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));
const statuses = (r: Rig): string[] => r.emitted.map((state) => state.status);

const BROWSERS: ClaudeBrowser[] = [
  { id: 'fixture-safari', name: 'Safari', isDefault: true },
  { id: 'fixture-chrome', name: 'Chrome', isDefault: false },
];

describe('the registered Claude proof host', () => {
  let previousSwitch: string | undefined;
  let previousPackaged: PropertyDescriptor | undefined;
  const proof = (): ClaudeProofHook => (globalThis as typeof globalThis & { __studioClaudeProof: ClaudeProofHook }).__studioClaudeProof;

  beforeEach(() => {
    previousSwitch = process.env['STUDIO_CLAUDE_PROOF'];
    previousPackaged = Object.getOwnPropertyDescriptor(electron.app, 'isPackaged');
    process.env['STUDIO_CLAUDE_PROOF'] = '1';
    Object.assign(electron.app, { isPackaged: false });
  });

  afterEach(() => {
    cancelClaudeLoginForQuit();
    Reflect.deleteProperty(globalThis, '__studioClaudeProof');
    if (previousSwitch === undefined) delete process.env['STUDIO_CLAUDE_PROOF'];
    else process.env['STUDIO_CLAUDE_PROOF'] = previousSwitch;
    if (previousPackaged === undefined) Reflect.deleteProperty(electron.app, 'isPackaged');
    else Object.defineProperty(electron.app, 'isPackaged', previousPackaged);
  });

  it('reconfigures the live host while preserving both registered callbacks even with forged runtime keys', async () => {
    const fixture = rig('signed-out', { register: true });
    let hijacked = false;
    proof().configure({
      browsers: () => BROWSERS,
      bin: () => '/fixture/reconfigured',
      emit: () => { hijacked = true; },
      onState: () => { hijacked = true; },
    } as ClaudeHostOptions);
    expect(proof().current()).toMatchObject({ status: 'idle', browsers: BROWSERS });
    startClaudeBootPreCheck();
    await settle();
    expect(proof().current()?.status).toBe('signed-out');
    expect(statuses(fixture)).toEqual(['checking', 'signed-out']);
    expect(fixture.meta).toHaveLength(2);
    expect(hijacked).toBe(false);
  });

  it('cancels a pending login before replacing the registered host', async () => {
    const fixture = rig('signed-out', { register: true, holdStartLogin: true });
    await fixture.host.detect({ fresh: true });
    fixture.host.signIn();
    await settle();
    proof().configure({ browsers: () => BROWSERS });
    fixture.releaseStartLogin();
    await settle();
    expect(fixture.logins[0]!.cancelled).toBe(1);
    expect(proof().current()?.status).toBe('idle');
  });
});

describe('ClaudeHost browser selection', () => {
  it('enriches current, status replies, and every emitted state with the browser inventory', async () => {
    const fixture = rig('signed-out', { browsers: () => BROWSERS });
    expect(fixture.host.current().browsers).toEqual(BROWSERS);
    expect((await fixture.host.detect()).browsers).toEqual(BROWSERS);
    expect((await fixture.host.detect({ fresh: true })).browsers).toEqual(BROWSERS);
    expect(fixture.emitted.every(({ browsers }) => JSON.stringify(browsers) === JSON.stringify(BROWSERS))).toBe(true);
  });

  it('refuses unknown IDs, paths, and non-string IPC values without starting a child', async () => {
    const fixture = rig('signed-out', { browsers: () => BROWSERS });
    await fixture.host.detect({ fresh: true });
    for (const browserId of ['unknown', '/Applications/Injected.app', "'; open /tmp/evil", 1, {}]) {
      expect(fixture.host.signIn({ browserId: browserId as string })).toEqual({ accepted: false });
    }
    await settle();
    expect(fixture.logins).toEqual([]);
    expect(fixture.host.current().status).toBe('signed-out');
  });

  it('keeps omitted and explicitly default browser choices on the existing login path', async () => {
    for (const browserId of [undefined, BROWSERS[0]!.id]) {
      const fixture = rig('signed-out', { browsers: () => BROWSERS });
      await fixture.host.detect({ fresh: true });
      expect(fixture.host.signIn({ browserId })).toEqual({ accepted: true });
      await settle();
      expect(fixture.selectedBrowsers).toEqual([]);
      expect(fixture.loginOptions[0]!.env).toEqual({ PATH: '/usr/bin' });
      expect(fixture.opened).toEqual([]);
      fixture.host.cancel();
      await settle();
    }
  });

  it('routes a nondefault choice to the installed-browser login seam and preserves reopening', async () => {
    const fixture = rig('signed-out', { browsers: () => BROWSERS });
    await fixture.host.detect({ fresh: true });
    expect(fixture.host.signIn({ browserId: BROWSERS[1]!.id })).toEqual({ accepted: true });
    await settle();
    expect(fixture.selectedBrowsers).toEqual([BROWSERS[1]!.id]);
    expect(fixture.opened).toEqual([]);
    expect(fixture.host.openPageAgain()).toEqual({ accepted: true });
    await settle();
    expect(fixture.logins[0]!.opened).toHaveLength(1);
    fixture.host.cancel();
    await settle();
  });

  it('revalidates installed choices for retries instead of retaining a removed browser', async () => {
    let browsers = BROWSERS;
    const fixture = rig('signed-out', { browsers: () => browsers });
    await fixture.host.detect({ fresh: true });
    fixture.host.signIn({ browserId: BROWSERS[1]!.id });
    await settle();
    fixture.host.cancel();
    await settle();
    browsers = BROWSERS.slice(0, 1);
    expect(fixture.host.signIn({ browserId: BROWSERS[1]!.id })).toEqual({ accepted: false });
    expect(fixture.host.signIn()).toEqual({ accepted: true });
    await settle();
    expect(fixture.selectedBrowsers).toEqual([BROWSERS[1]!.id]);
    expect(fixture.logins).toHaveLength(2);
    fixture.host.cancel();
    await settle();
  });

  it('a selected browser removed after inventory stays signed-out and can explicitly retry another browser', async () => {
    const firefox = { id: 'fixture-firefox', name: 'Firefox', isDefault: false };
    let browsers = [...BROWSERS, firefox];
    let removed = false;
    const fixture = rig('signed-out', {
      browsers: () => browsers,
      browserLoginError: () => {
        if (removed) return undefined;
        removed = true;
        browsers = [BROWSERS[0]!, firefox];
        return new ClaudeBrowserPreparationError();
      },
    });
    await fixture.host.detect({ fresh: true });
    expect(fixture.host.signIn({ browserId: BROWSERS[1]!.id })).toEqual({ accepted: true });
    await settle();
    expect(fixture.host.current()).toMatchObject({ status: 'signed-out', detail: 'exited', browsers });
    expect(fixture.logins).toEqual([]);
    expect(statuses(fixture)).not.toContain('failed');
    expect(fixture.host.signIn({ browserId: BROWSERS[1]!.id })).toEqual({ accepted: false });
    expect(fixture.host.signIn({ browserId: firefox.id })).toEqual({ accepted: true });
    await settle();
    expect(fixture.selectedBrowsers).toEqual([BROWSERS[1]!.id, firefox.id]);
    expect(fixture.logins).toHaveLength(1);
    expect(fixture.host.current().status).toBe('signing-in');
    fixture.host.cancel();
    await settle();
  });

  it('cancels a selected login that is still starting and allows the next attempt', async () => {
    const fixture = rig('signed-out', { browsers: () => BROWSERS, holdStartLogin: true });
    await fixture.host.detect({ fresh: true });
    fixture.host.signIn({ browserId: BROWSERS[1]!.id });
    await settle();
    fixture.host.cancel();
    fixture.releaseStartLogin();
    await settle();
    expect(fixture.logins[0]!.cancelled).toBe(1);
    expect(fixture.host.current().status).toBe('signed-out');
    expect(fixture.host.signIn()).toEqual({ accepted: true });
    await settle();
    expect(fixture.logins).toHaveLength(2);
    fixture.host.cancel();
    await settle();
  });
});

describe('ClaudeHost detection', () => {
  it.each(['environment', 'status', 'turn'] as const)('a cancelled %s exception cannot replace its settled verdict', async (failure) => {
    const { promise: pending, reject } = Promise.withResolvers<never>();
    let hold = false;
    const host = new ClaudeHost({
      browsers: () => [],
      emit: () => undefined,
      bin: () => '/bin/claude',
      env: async () => hold && failure === 'environment' ? pending : { PATH: '/usr/bin' },
      runStatus: async () => hold && failure === 'status' ? pending : cliResult('signed-in'),
      runTurn: async () => pending,
    });
    await host.detect({ fresh: true });
    hold = true;
    const checking = host.detect({ fresh: true, entryPoint: 'onboarding' });
    await settle();
    host.cancel();
    reject(new Error('late setup failure'));
    await checking;
    expect(host.current()).toMatchObject({ status: 'signed-in' });
  });

  it.each(['signed-out', 'failed', 'timed-out', 'missing'] as const)('a cancelled %s credential read restores the settled verdict', async (verdict) => {
    const current = rig('signed-in');
    await current.host.detect({ fresh: true });
    current.answer(verdict);
    const running = current.host.detect({ fresh: true, entryPoint: 'onboarding' });
    current.host.cancel();
    await running;
    expect(current.host.current()).toMatchObject({ status: 'signed-in' });
  });

  it('starts idle; a non-fresh read with nothing in flight answers the cached state without spawning', async () => {
    const r = rig();
    expect(await r.host.detect()).toEqual({ status: 'idle', command: CLAUDE_LOGIN_COMMAND });
    expect(r.statusCalls).toBe(0);
  });

  it('a fresh detect runs status once; concurrent callers, fresh or not, join it', async () => {
    const r = rig('signed-in');
    const [a, b, c] = await Promise.all([r.host.detect({ fresh: true }), r.host.detect({ fresh: true }), r.host.detect()]);
    expect(r.statusCalls).toBe(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    expect(a).toMatchObject({ status: 'signed-in', email: 'wren@example.com', plan: 'max' });
    expect(statuses(r)).toEqual(['checking', 'signed-in']);
  });

  it('after a verdict, a non-fresh read returns it and a fresh one spawns again', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    expect(await r.host.detect()).toMatchObject({ status: 'signed-out' });
    expect(r.statusCalls).toBe(1);
    r.answer('signed-in');
    expect(await r.host.detect({ fresh: true })).toMatchObject({ status: 'signed-in' });
    expect(r.statusCalls).toBe(2);
  });

  it('maps every status verdict onto the machine, failures with their detail', async () => {
    for (const [verdict, expected] of [
      ['failed', { status: 'failed', detail: 'exited' }],
      ['timed-out', { status: 'failed', detail: 'did-not-answer' }],
      ['missing', { status: 'failed', detail: 'spawn' }],
    ] as const) {
      const r = rig(verdict);
      expect(await r.host.detect({ fresh: true })).toMatchObject(expected);
    }
  });

  it('no binary at all is failed as spawn without running status', async () => {
    const r = rig('signed-in', { bin: undefined });
    expect(await r.host.detect({ fresh: true })).toMatchObject({ status: 'failed', detail: 'spawn' });
    expect(r.statusCalls).toBe(0);
  });

  it('the boot pre-check reports afterLogin false', async () => {
    const r = rig('signed-in');
    await r.host.detect({ fresh: true, cause: 'boot' });
    expect(r.meta).toEqual([{ afterLogin: false }, { afterLogin: false }]);
  });

  it('an explicit re-check reports afterLogin true, and a tap joining the boot check upgrades it', async () => {
    const r = rig('signed-in');
    await r.host.detect({ fresh: true, cause: 'recheck' });
    expect(r.meta.at(-1)).toEqual({ afterLogin: true });

    const joined = rig('signed-in');
    const boot = joined.host.detect({ fresh: true, cause: 'boot' });
    const tap = joined.host.detect({ fresh: true, cause: 'recheck' });
    await Promise.all([boot, tap]);
    expect(joined.statusCalls).toBe(1);
    expect(joined.meta.at(-1)).toEqual({ afterLogin: true });
  });
});

describe('ClaudeHost verification (ONL-2496)', () => {
  const tap = { fresh: true, cause: 'recheck', entryPoint: 'onboarding' } as const;

  it('a tap verifies a found credential before calling it connected', async () => {
    const r = rig('signed-in');
    await r.host.detect(tap);
    expect(statuses(r)).toEqual(['checking', 'verifying', 'signed-in']);
    expect(r.turnCalls).toBe(1);
  });

  it('a signed-out read goes straight to the sign-in step and spends no turn', async () => {
    const r = rig('signed-out');
    await r.host.detect(tap);
    expect(statuses(r)).toEqual(['checking', 'signed-out']);
    expect(r.turnCalls).toBe(0);
  });

  it('a failed turn lands its family and never reports connected', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'failed', detail: 'turn-provider-refused' });
    await r.host.detect(tap);
    expect(statuses(r)).toEqual(['checking', 'verifying', 'verification-failed']);
    expect(r.host.current().detail).toBe('turn-provider-refused');
  });

  it('the recorded machine stays unconnected however often it is re-checked', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'failed', detail: 'turn-provider-refused' });
    await r.host.detect(tap);
    await r.host.detect(tap);
    expect(r.host.current().status).toBe('verification-failed');
    expect(statuses(r)).not.toContain('signed-in');
    expect(r.turnCalls).toBe(2);
  });

  it('after setup completed on this install the boot pre-check sends no message', async () => {
    const r = rig('signed-in');
    await r.host.detect({ fresh: true, cause: 'boot' });
    expect(statuses(r)).toEqual(['checking', 'signed-in']);
    expect(r.turnCalls).toBe(0);
  });

  it('a tap that joins the boot pre-check still gets its own turn', async () => {
    const r = rig('signed-in');
    const boot = r.host.detect({ fresh: true, cause: 'boot' });
    const tapped = r.host.detect(tap);
    await Promise.all([boot, tapped]);
    expect(r.turnCalls).toBe(1);
    expect(r.host.current().status).toBe('signed-in');
  });

  it('the read a tap joins never reports connected ahead of the turn (ONL-2496)', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'failed', detail: 'turn-provider-refused' });
    const boot = r.host.detect({ fresh: true, cause: 'boot' });
    const tapped = r.host.detect(tap);
    await Promise.all([boot, tapped]);
    // The joined read is unverified, so promoting it would flash a connection and enable Continue before the turn ran.
    expect(statuses(r)).not.toContain('signed-in');
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-provider-refused' });
  });

  it('a prompt that failed sign-in never reads as connected while the credential is still on disk, and spends no turn', async () => {
    const r = rig('signed-in');
    await r.host.detect({ fresh: true, cause: 'boot' });
    expect(r.host.current().status).toBe('signed-in');

    const before = r.emitted.length;
    await r.host.recheckAfterTurnSignedOut();
    expect(statuses(r).slice(before)).not.toContain('signed-in');
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-signed-out' });
    expect(r.turnCalls).toBe(0);

    r.answer('signed-out');
    await r.host.recheckAfterTurnSignedOut();
    expect(r.host.current().status).toBe('signed-out');
  });

  it('a recheck nobody asked for leaves a failed verification standing', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'failed', detail: 'turn-provider-refused' });
    await r.host.detect(tap);
    const before = r.emitted.length;
    await r.host.detect({ fresh: true, cause: 'recheck' });
    expect(r.turnCalls).toBe(1);
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-provider-refused' });
    expect(r.emitted.slice(before).map((s) => s.status)).not.toContain('signed-in');
  });

  it('a turn that could not launch is a failed verification, so a later cheap read cannot promote it (ONL-2496)', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'launch-failed', errorClass: 'executable_not_found' });
    await r.host.detect(tap);
    // `failed`/`spawn` would offer a login the credential already passed, and the no-promotion rule names only this status.
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-agent-error' });

    const before = r.emitted.length;
    await r.host.detect({ fresh: true, cause: 'recheck' });
    expect(r.emitted.slice(before).map((s) => s.status)).not.toContain('signed-in');
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-agent-error' });
  });

  it('a sign-in is offered after a signed-out turn and refused after every other', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'failed', detail: 'turn-signed-out' });
    await r.host.detect(tap);
    expect(r.host.signIn()).toEqual({ accepted: true });

    const refused = rig('signed-in');
    refused.answerTurn({ outcome: 'failed', detail: 'turn-provider-refused' });
    await refused.host.detect(tap);
    expect(refused.host.signIn()).toEqual({ accepted: false });
  });

  it('a refused subscription sign-in offers Sign in again; a refused key or endpoint does not, since signing in cannot replace it (ONL-2903)', async () => {
    const subscription = rig('signed-in');
    subscription.answerTurn({ outcome: 'failed', detail: 'turn-sign-in-rejected' });
    await subscription.host.detect(tap);
    expect(subscription.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-sign-in-rejected', plan: 'max' });
    expect(subscription.host.signIn()).toEqual({ accepted: true });

    const key = rig('signed-in-key');
    key.answerTurn({ outcome: 'failed', detail: 'turn-sign-in-rejected' });
    await key.host.detect(tap);
    expect(key.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-provider-refused' });
    expect(key.host.signIn()).toEqual({ accepted: false });
  });

  it("carries what the turn heard onto the verdict, for the sheet's box and reset", async () => {
    const r = rig('signed-in');
    const facts = { limit: { window: 'session' as const, resetsAt: 2_000_000_000 }, diagnostic: { kind: 'rate_limit', status: 429 } };
    r.answerTurn({ outcome: 'failed', detail: 'turn-usage-limit', facts });
    await r.host.detect(tap);
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-usage-limit', turn: facts });
  });

  it('a chat turn refused on a subscription leaves the sign-in verdict standing through the quick recheck, and spends no turn (ONL-2903)', async () => {
    const r = rig('signed-in');
    await r.host.detect({ fresh: true, cause: 'boot' });
    await r.host.recheckAfterSignInRejected();
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-sign-in-rejected' });
    expect(r.turnCalls).toBe(0);

    const key = rig('signed-in-key');
    await key.host.detect({ fresh: true, cause: 'boot' });
    await key.host.recheckAfterSignInRejected();
    expect(key.host.current().status).toBe('signed-in');
  });

  it('a stopped check puts back the verdict it replaced and emits nothing of its own', async () => {
    const r = rig('signed-in');
    r.answerTurn({ outcome: 'failed', detail: 'turn-service-error' });
    await r.host.detect(tap);
    await settle();

    r.holdNextTurn();
    const running = r.host.detect(tap);
    await settle();
    expect(r.host.current().status).toBe('verifying');
    r.host.cancel();
    r.releaseTurn();
    await running;
    expect(r.host.current()).toMatchObject({ status: 'verification-failed', detail: 'turn-service-error' });
    expect(statuses(r).at(-1)).toBe('verification-failed');
  });

  it('a cancel with nothing in flight is still harmless', () => {
    const r = rig('signed-out');
    expect(() => {
      r.host.cancel();
    }).not.toThrow();
  });

  it('a stopped check after a login leaves a way back in, never a sign-in with no child (ONL-2496)', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    expect(r.host.signIn({ entryPoint: 'onboarding' })).toEqual({ accepted: true });
    await settle();
    r.answer('signed-in');
    r.holdNextTurn();
    r.logins[0]!.exit();
    await settle();
    expect(r.host.current().status).toBe('verifying');

    r.host.cancel();
    r.releaseTurn();
    await settle();

    // Restoring `signing-in` would strand it: detect refuses while signing in, signIn refuses, and no child is left to take a code.
    expect(r.host.current().status).not.toBe('signing-in');
    expect(r.host.current().status).not.toBe('awaiting-code');
    expect(r.host.signIn({ entryPoint: 'onboarding' })).toEqual({ accepted: true });
  });

  it('a cancel while a tap waits behind the boot pre-check spends no turn (ONL-2496)', async () => {
    const r = rig('signed-in');
    const boot = r.host.detect({ fresh: true, cause: 'boot' });
    const tapped = r.host.detect(tap);
    // The sheet offers Cancel while the check runs, so this is reachable before the queued turn starts.
    r.host.cancel();
    await Promise.all([boot, tapped]);
    await settle();

    expect(r.turnCalls).toBe(0);
    expect(statuses(r)).not.toContain('signed-in');
    expect(r.host.current().status).not.toBe('checking');
  });

  it('a tap landing while the cancelled check is still settling gets its own turn (ONL-2496)', async () => {
    const r = rig('signed-in');
    r.holdNextTurn();
    const stopped = r.host.detect(tap);
    await settle();
    expect(r.host.current().status).toBe('verifying');

    // The cancelled detection holds the slot until its child settles, so a tap inside that window must not take its verdict.
    r.host.cancel();
    const tapped = r.host.detect(tap);
    r.releaseTurn();
    await Promise.all([stopped, tapped]);
    await settle();

    expect(r.turnCalls).toBe(2);
    expect(r.host.current().status).toBe('signed-in');
  });

  it('a cancel during the credential read keeps that read off the board (ONL-2496)', async () => {
    const r = rig('signed-in');
    const running = r.host.detect(tap);
    r.host.cancel();
    await running;
    await settle();

    expect(statuses(r)).not.toContain('signed-in');
    expect(r.turnCalls).toBe(0);
  });

  it('a stopped check queued behind the boot pre-check leaves no spinner running (ONL-2496)', async () => {
    const r = rig('signed-in');
    r.holdNextTurn();
    const boot = r.host.detect({ fresh: true, cause: 'boot' });
    const tapped = r.host.detect(tap);
    await settle();
    r.host.cancel();
    r.releaseTurn();
    await Promise.all([boot, tapped]);
    await settle();

    // `checking` here would be a tile and sheet that spin with no detection behind them.
    expect(r.host.current().status).not.toBe('checking');
    expect(r.host.current().status).not.toBe('verifying');
  });
});

describe('ClaudeHost sign-in', () => {
  it('a rejected callback from a cancelled child cannot affect its replacement or its code', async () => {
    const current = rig('signed-out');
    await current.host.detect({ fresh: true });
    current.host.signIn();
    await settle();
    const old = current.logins[0]!;
    current.host.cancel();
    await settle();
    current.host.signIn();
    await settle();
    expect(current.host.submitCode('replacement-code')).toEqual({ accepted: true });
    old.reject();
    expect(current.host.current().status).toBe('signing-in');
    expect(current.logins[1]!.codes).toEqual(['replacement-code']);
    current.host.cancel();
    await settle();
  });

  it('a cancelled login environment failure leaves sign-in available', async () => {
    const { promise: pending, reject } = Promise.withResolvers<never>();
    let reads = 0;
    const host = new ClaudeHost({
      browsers: () => [],
      emit: () => undefined,
      bin: () => '/bin/claude',
      env: async () => ++reads === 1 ? { PATH: '/usr/bin' } : pending,
      runStatus: async () => cliResult('signed-out'),
    });
    await host.detect({ fresh: true });
    host.signIn();
    host.cancel();
    reject(new Error('late environment failure'));
    await settle();
    expect(host.current()).toMatchObject({ status: 'signed-out' });
    expect(host.signIn()).toEqual({ accepted: true });
    await settle();
    host.cancel();
  });

  it('is refused unless signed-out, and a second press starts no second child', async () => {
    const r = rig('signed-in');
    await r.host.detect({ fresh: true });
    expect(r.host.signIn()).toEqual({ accepted: false });
    expect(r.logins).toHaveLength(0);

    const out = rig('signed-out');
    await out.host.detect({ fresh: true });
    expect(out.host.signIn()).toEqual({ accepted: true });
    expect(out.host.signIn()).toEqual({ accepted: false });
    await settle();
    expect(out.logins).toHaveLength(1);
    expect(out.host.current().status).toBe('signing-in');
  });

  it('a login exit triggers exactly one detection and lands on its verdict', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.answer('signed-in');
    r.logins[0]!.exit();
    await settle();
    expect(r.statusCalls).toBe(2);
    expect(statuses(r)).toEqual(['checking', 'signed-out', 'signing-in', 'checking', 'verifying', 'signed-in']);
    expect(r.meta.at(-1)).toEqual({ afterLogin: true });
  });

  it('detect during a login is refused: it answers the current state and spawns nothing', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    expect(await r.host.detect({ fresh: true })).toMatchObject({ status: 'signing-in' });
    expect(r.statusCalls).toBe(1);
    r.host.cancel();
    await settle();
  });

  it('a child that exits without a credential is the fallback, server-rejected when it said so', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.logins[0]!.exit({ loginFailed: true });
    await settle();
    expect(r.host.current()).toMatchObject({ status: 'failed', detail: 'server-rejected' });

    const quiet = rig('signed-out');
    await quiet.host.detect({ fresh: true });
    quiet.host.signIn();
    await settle();
    quiet.logins[0]!.exit();
    await settle();
    expect(quiet.host.current()).toMatchObject({ status: 'failed', detail: 'exited' });
  });

  it('a sign-in that failed can be started again, unless Claude itself could not start', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.logins[0]!.exit();
    await settle();
    expect(r.host.current()).toMatchObject({ status: 'failed', detail: 'exited' });
    expect(r.host.signIn()).toEqual({ accepted: true });
    await settle();
    expect(r.logins).toHaveLength(2);
    expect(r.host.current().status).toBe('signing-in');

    const missing = rig('signed-out', { startLoginError: Object.assign(new Error('fixture runtime could not launch'), { code: 'ENOENT' }) });
    await missing.host.detect({ fresh: true });
    missing.host.signIn();
    await settle();
    expect(missing.host.current()).toMatchObject({ status: 'failed', detail: 'spawn' });
    expect(missing.host.signIn()).toEqual({ accepted: false });
  });

  it('an abandoned login lands on failed with took-too-long and runs no detection', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.logins[0]!.abandon();
    await settle();
    expect(r.host.current()).toMatchObject({ status: 'failed', detail: 'took-too-long' });
    expect(r.statusCalls).toBe(1);
  });

  it.each(['ENOENT', 'EACCES', 'ENOEXEC', 'ENOTDIR'])(
    'a sign-in spawn rejection with code %s reaches runtime recovery after a successful status read',
    async (code) => {
      for (const browserId of [undefined, BROWSERS[1]!.id]) {
        const error = Object.assign(new Error('fixture runtime could not launch'), { code });
        const fixture = rig('signed-out', { startLoginError: error, browsers: () => BROWSERS });
        expect(await fixture.host.detect({ fresh: true })).toMatchObject({ status: 'signed-out' });
        expect(fixture.host.signIn({ browserId })).toEqual({ accepted: true });
        await settle();
        expect(fixture.host.current()).toMatchObject({ status: 'failed', detail: 'spawn' });
        expect(fixture.statusCalls).toBe(1);
      }
    },
  );

  it.each([
    ['a missing login page', new Error('printed no login page')],
    ['a spawn code only in prose', new Error('provider output mentioned ENOENT EACCES ENOEXEC ENOTDIR')],
    ['an unrelated error code', Object.assign(new Error('fixture I/O failure'), { code: 'EIO' })],
    ['a non-string error code', Object.assign(new Error('fixture numeric code'), { code: 13 })],
  ] as const)('a sign-in rejection with %s stays exited without runtime recovery', async (_reason, error) => {
    const fixture = rig('signed-out', { startLoginError: error });
    await fixture.host.detect({ fresh: true });
    fixture.host.signIn();
    await settle();
    expect(fixture.host.current()).toMatchObject({ status: 'failed', detail: 'exited' });
  });

  it('a sign-in that could not start logs the reason it was given', async () => {
    recordLinesForTesting();
    try {
      const fixture = rig('signed-out', { startLoginError: new Error('the sign-in child printed a login page Studio does not recognise') });
      await fixture.host.detect({ fresh: true });
      fixture.host.signIn();
      await settle();
      const line = peekLinesForTesting().find((entry) => entry.msg === 'sign-in could not start');
      expect(line?.['reason']).toBe('the sign-in child printed a login page Studio does not recognise');
    } finally {
      resetLogForTesting();
    }
  });

  it('openPageAgain opens the retained URL and moves to awaiting-code; the emitted state never carries the URL', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    expect(r.host.openPageAgain()).toEqual({ accepted: false });
    r.host.signIn();
    await settle();
    expect(r.host.openPageAgain()).toEqual({ accepted: true });
    await settle();
    expect(r.opened).toEqual([r.logins[0]!.authUrl]);
    expect(r.host.current()).toMatchObject({ status: 'awaiting-code' });
    for (const state of r.emitted) expect(JSON.stringify(state)).not.toContain('https://');
  });

  it('a rejected code re-emits awaiting-code with the detail; a submit is sanitized before the child sees it', async () => {
    const r = rig('signed-out');
    await r.host.detect({ fresh: true });
    expect(r.host.submitCode('early')).toEqual({ accepted: false });
    r.host.signIn();
    await settle();
    r.host.openPageAgain();
    expect(r.host.submitCode('  abc\n#def ')).toEqual({ accepted: true });
    expect(r.host.submitCode('   ')).toEqual({ accepted: false });
    expect(r.logins[0]!.codes).toEqual(['abc#def']);
    const before = r.emitted.length;
    r.logins[0]!.reject();
    expect(r.emitted.slice(before)).toEqual([
      { status: 'awaiting-code', detail: 'invalid-code', command: CLAUDE_LOGIN_COMMAND },
    ]);
  });

  it('cancel kills the child and lands on signed-out; twice is harmless; the next fresh detect spawns status again', async () => {
    const r = rig('signed-out');
    r.host.cancel();
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.host.cancel();
    r.host.cancel();
    await settle();
    expect(r.logins[0]!.cancelled).toBe(1);
    expect(r.host.current()).toMatchObject({ status: 'signed-out' });
    expect(r.statusCalls).toBe(1);
    await r.host.detect({ fresh: true });
    expect(r.statusCalls).toBe(2);
  });

  it('the spawn window refuses a second press, and signing-in waits for the child that answers it', async () => {
    const r = rig('signed-out', { holdStartLogin: true });
    await r.host.detect({ fresh: true });
    expect(r.host.signIn()).toEqual({ accepted: true });
    await settle();
    expect(r.host.current().status).toBe('signed-out');
    expect(statuses(r)).not.toContain('signing-in');
    expect(r.host.signIn()).toEqual({ accepted: false });
    await settle();
    expect(r.logins).toHaveLength(1);
    r.releaseStartLogin();
    await settle();
    expect(r.host.current().status).toBe('signing-in');
    r.host.cancel();
    await settle();
  });

  it('a cancel during the spawn window kills the child that arrives and lands on signed-out', async () => {
    const r = rig('signed-out', { holdStartLogin: true });
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.host.cancel();
    r.releaseStartLogin();
    await settle();
    expect(r.logins[0]!.cancelled).toBe(1);
    expect(r.host.current()).toMatchObject({ status: 'signed-out' });
    expect(statuses(r).at(-1)).toBe('signed-out');
    expect(statuses(r)).not.toContain('signing-in');
    expect(r.host.openPageAgain()).toEqual({ accepted: false });
    expect(r.statusCalls).toBe(1);
  });

  it('the quit teardown in the spawn window kills the child too', async () => {
    const r = rig('signed-out', { holdStartLogin: true, register: true });
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    cancelClaudeLoginForQuit();
    r.releaseStartLogin();
    await settle();
    expect(r.logins[0]!.cancelled).toBe(1);
    expect(r.host.current()).toMatchObject({ status: 'signed-out' });
  });

  it('a cancelled spawn window leaves the next sign-in free to start its own child', async () => {
    const r = rig('signed-out', { holdStartLogin: true });
    await r.host.detect({ fresh: true });
    r.host.signIn();
    await settle();
    r.host.cancel();
    r.releaseStartLogin();
    await settle();
    expect(r.host.signIn()).toEqual({ accepted: true });
    await settle();
    expect(r.logins).toHaveLength(2);
    expect(r.logins[1]!.cancelled).toBe(0);
    expect(r.host.current().status).toBe('signing-in');
  });

  it('STUDIO_CLAUDE_OPEN=0 makes openPageAgain a logged no-op', async () => {
    const previous = process.env['STUDIO_CLAUDE_OPEN'];
    process.env['STUDIO_CLAUDE_OPEN'] = '0';
    try {
      const r = rig('signed-out');
      await r.host.detect({ fresh: true });
      r.host.signIn();
      await settle();
      r.host.openPageAgain();
      await settle();
      expect(r.opened).toEqual([]);
      expect(r.host.current().status).toBe('awaiting-code');
    } finally {
      if (previous === undefined) delete process.env['STUDIO_CLAUDE_OPEN'];
      else process.env['STUDIO_CLAUDE_OPEN'] = previous;
    }
  });
});

describe('the Claude child environment', () => {
  beforeEach(() => {
    resetClaudeEnvForTests();
    recordLinesForTesting();
  });
  afterEach(() => {
    resetClaudeEnvForTests();
    resetLogForTesting();
  });

  it('scrubs the four Studio-session variables and leaves ANTHROPIC_API_KEY alone', () => {
    const scrubbed = scrubStudioSession({
      PATH: '/usr/bin',
      ANTHROPIC_API_KEY: 'fixture-key',
      CLAUDE_CODE_ENTRYPOINT: 'cli',
      CLAUDECODE: '1',
      CLAUDE_CODE_MESSAGING_SOCKET: '/tmp/sock',
      CLAUDE_CODE_MESSAGING_TOKEN: 'fixture-token',
      CLAUDE_CONFIG_DIR: '/tmp/cfg',
    });
    expect(scrubbed).toEqual({ PATH: '/usr/bin', ANTHROPIC_API_KEY: 'fixture-key', CLAUDE_CONFIG_DIR: '/tmp/cfg' });
  });

  it('a login shell exporting CLAUDE_CONFIG_DIR never beats our own process value', () => {
    const captured = { PATH: '/usr/bin', CLAUDE_CONFIG_DIR: '/Users/someone/.claude' };
    expect(pinClaudeConfigDir(captured, { CLAUDE_CONFIG_DIR: '/scratch/claude-config' })).toEqual({
      PATH: '/usr/bin',
      CLAUDE_CONFIG_DIR: '/scratch/claude-config',
    });
    expect(pinClaudeConfigDir({ PATH: '/usr/bin' }, { CLAUDE_CONFIG_DIR: '/scratch/claude-config' })).toEqual({
      PATH: '/usr/bin',
      CLAUDE_CONFIG_DIR: '/scratch/claude-config',
    });
  });

  it('with no process value the shell’s CLAUDE_CONFIG_DIR is left alone', () => {
    const captured = { PATH: '/usr/bin', CLAUDE_CONFIG_DIR: '/Users/someone/.claude' };
    expect(pinClaudeConfigDir(captured, {})).toEqual(captured);
    expect(pinClaudeConfigDir({ PATH: '/usr/bin' }, {})).toEqual({ PATH: '/usr/bin' });
  });

  it('STUDIO_CLAUDE_BIN replaces the binary path and warns once', () => {
    expect(claudeBinary({ STUDIO_CLAUDE_BIN: '/scratch/claude.mjs' })).toBe('/scratch/claude.mjs');
    expect(claudeBinary({ STUDIO_CLAUDE_BIN: '/scratch/claude.mjs' })).toBe('/scratch/claude.mjs');
    const warned = peekLinesForTesting().filter((line) => line.level === 'warn');
    expect(warned).toHaveLength(1);
    expect(warned[0]?.subsystem).toBe('claude');
    expect(warned[0]?.msg).toContain('STUDIO_CLAUDE_BIN');
  });

  it('without the override the pinned platform binary is the path', () => {
    expect(claudeBinary({})).toMatch(/claude-agent-sdk-[a-z0-9]+-[a-z0-9]+[\\/]claude(\.exe)?$/);
  });

  it('openExternalForClaude passes through unless STUDIO_CLAUDE_OPEN is 0', async () => {
    const opened: string[] = [];
    const open = async (url: string): Promise<void> => {
      opened.push(url);
    };
    await openExternalForClaude(open, {})('https://claude.com/a');
    await openExternalForClaude(open, { STUDIO_CLAUDE_OPEN: '1' })('https://claude.com/b');
    await openExternalForClaude(open, { STUDIO_CLAUDE_OPEN: '0' })('https://claude.com/c');
    expect(opened).toEqual(['https://claude.com/a', 'https://claude.com/b']);
  });
});
