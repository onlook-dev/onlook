import { shell } from 'electron';
import { handle } from '../ipc/bridge.js';
import {
  IPC_EMIT,
  IPC_INVOKE,
  IDLE_CLAUDE_SETUP_STATE,
  claudeDetailNeedsSignIn,
  claudeStateIsSettled,
  isClaudeSubscriptionPlan,
  type ClaudeBrowser,
  type ClaudeSetupDetail,
  type ClaudeLoginDetail,
  type ClaudeVerificationDetail,
  type ClaudeSettledSetupState,
  type ClaudeSetupState,
  type ClaudeTurnFacts,
  type SetupEntryPoint,
  sanitizeCode,
} from '@studio/events';
import { verifyClaudeTurn, type ClaudeVerifyVerdict } from '../agent-host/claude-verify.js';
import { claudeExecutablePath } from '../agent-host/cli-path.js';
import { shareInFlight, type InFlight } from '../agent-host/single-flight.js';
import { agentVerify, proofSwitchOn } from '../diagnostics/gate.js';
import type { Env } from '../env/shell-env.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { checkSetupAbandoned, recordAgentSetupStep, settleAgentSetupAttempt, type SetupStepOutcome } from '../telemetry/setup-step.js';
import { hasCompletedAgentSetup } from '../telemetry/setup-completion.js';
import { claudeBinary, claudeChildEnv, openExternalForClaude, type OpenExternal } from './env.js';
import { ClaudeBrowserPreparationError, createClaudeBrowsers, type ClaudeBrowserLogin } from './browsers.js';
import { startClaudeLogin, type ClaudeLoginHandle, type StartClaudeLoginOptions } from './login.js';
import { ClaudeSetupMachine, type SignedInFacts } from './machine.js';
import { claudeAuthStatus, type StatusRunner } from './status.js';
import { log } from '../log/index.js';

const logger = log('claude');

const VERIFY_OUTCOMES = {
  'turn-signed-out': 'not_logged_in',
  'turn-sign-in-rejected': 'provider_refused',
  'turn-provider-refused': 'provider_refused',
  'turn-usage-limit': 'agent_busy',
  'turn-rate-limited': 'agent_busy',
  'turn-service-error': 'agent_busy',
  'turn-billing': 'agent_error',
  'turn-agent-error': 'agent_error',
  'turn-no-answer': 'timeout',
} as const satisfies Partial<Record<ClaudeSetupDetail, SetupStepOutcome>>;

/** A ternary with no compiler help: every detail needs an arm here or the funnel reads it as a sign-in failure. */
function fallbackOutcome(detail: ClaudeSetupDetail): SetupStepOutcome {
  if (detail in VERIFY_OUTCOMES) return VERIFY_OUTCOMES[detail as keyof typeof VERIFY_OUTCOMES];
  return detail === 'took-too-long' || detail === 'did-not-answer' ? 'timeout' : 'failed';
}

export interface ClaudeStateMeta {
  afterLogin: boolean;
}

export type DetectionCause = 'boot' | 'recheck' | 'login';

export interface DetectRequest {
  fresh?: boolean;
  cause?: DetectionCause;
  entryPoint?: SetupEntryPoint;
}

export type TurnRunner = (options: { env: Env; signal: AbortSignal }) => Promise<ClaudeVerifyVerdict>;

interface DetectionOwner {
  flight: InFlight<ClaudeSetupState>;
  abort: AbortController;
  epoch: number;
  before: ClaudeSettledSetupState;
  cause: DetectionCause;
  mode: 'credential' | 'turn-queued' | 'turn';
}

interface LoginOwner {
  phase:
    | { kind: 'starting' }
    | { kind: 'active'; handle: ClaudeLoginHandle; code: 'idle' | 'submitted' }
    | { kind: 'cancelled' };
}

export interface ClaudeHostOptions {
  onState?: (state: ClaudeSetupState, meta: ClaudeStateMeta) => void;
  emit?: (state: ClaudeSetupState) => void;
  openExternal?: OpenExternal;
  bin?: () => string | undefined;
  env?: () => Promise<Env>;
  runStatus?: StatusRunner;
  runTurn?: TurnRunner;
  startLogin?: (options: StartClaudeLoginOptions) => Promise<ClaudeLoginHandle>;
  browsers?: () => ClaudeBrowser[];
  browserLogin?: ClaudeBrowserLogin;
}

type ClaudeProofRuntime = Pick<ClaudeHostOptions, 'bin' | 'env' | 'browsers' | 'browserLogin' | 'startLogin'>;

export interface ClaudeProofHook {
  configure(runtime: ClaudeProofRuntime): void;
  current(): ClaudeSetupState | undefined;
}

const runThroughSdk: TurnRunner = ({ env, signal }) => {
  const executablePath = claudeExecutablePath();
  return verifyClaudeTurn({ env, signal, ...(executablePath === undefined ? {} : { executablePath }) });
};

export class ClaudeHost {
  private readonly machine: ClaudeSetupMachine;
  private readonly options: ClaudeHostOptions;
  private readonly openExternal: OpenExternal;
  private detection: DetectionOwner | undefined;
  private readonly browserAccess = createClaudeBrowsers();
  private browsers: ClaudeBrowser[] = [];
  private cancelEpoch = 0;
  private settled: ClaudeSettledSetupState = IDLE_CLAUDE_SETUP_STATE;
  private login: LoginOwner | undefined;
  /** Outlives its detection: a login that fails before the next one starts is still attributed to what last looked (ONL-3107). */
  private lastCause: DetectionCause = 'boot';
  /** The last plan a credential read named; a failed verdict carries none, and a chat failure still needs it (ONL-2903). */
  private plan: string | undefined;

  constructor(options: ClaudeHostOptions = {}) {
    this.options = options;
    this.refreshBrowsers();
    this.openExternal = openExternalForClaude(options.openExternal ?? ((url) => shell.openExternal(url)));
    this.machine = new ClaudeSetupMachine({
      emit: (state) => {
        if (claudeStateIsSettled(state)) this.settled = state;
        const enriched = this.withBrowsers(state);
        (options.emit ?? ((next) => broadcastToRenderers(IPC_EMIT.claudeState, next)))(enriched);
        options.onState?.(enriched, { afterLogin: this.cause !== 'boot' });
      },
    });
  }

  private get cause(): DetectionCause {
    return this.detection?.cause ?? this.lastCause;
  }

  current(): ClaudeSetupState {
    return this.withBrowsers(this.machine.current());
  }

  private withBrowsers(state: ClaudeSetupState): ClaudeSetupState {
    return this.browsers.length === 0 ? state : { ...state, browsers: this.browsers.map((browser) => ({ ...browser })) };
  }

  private refreshBrowsers(): void {
    try {
      this.browsers = (this.options.browsers ?? this.browserAccess.list)();
    } catch {
      this.browsers = [];
    }
  }

  /** A login in flight refuses; the child's exit re-detects. */
  detect(req: DetectRequest = {}): Promise<ClaudeSetupState> {
    if (this.login !== undefined || this.machine.isSigningIn()) return Promise.resolve(this.current());
    const cause = req.cause ?? 'recheck';
    const wantsTurn = req.entryPoint !== undefined || cause === 'login';
    const owner = this.detection;
    if (owner?.flight.current !== undefined) {
      const joined = owner.flight.current;
      // The re-entry below records the open; recording it here too reports one tap twice (ONL-2496).
      if (req.fresh && owner.cause === 'boot') this.lastCause = owner.cause = cause;
      // Joining the boot pre-check would hand a tap its unverified verdict, so the tap re-runs behind it (ONL-2496).
      // A cancelled detection stays in the slot until its child settles, and its verdict is the one it was told to drop.
      if (wantsTurn && (owner.mode !== 'turn' || owner.epoch !== this.cancelEpoch)) {
        // The joined read must not settle the board either: this tap is about to verify what it only guessed.
        if (owner.mode === 'credential') owner.mode = 'turn-queued';
        const queued = this.cancelEpoch;
        // A cancel while the tap waits here must stop it, or a turn runs for a sheet the user already closed.
        return joined.then(() => (queued === this.cancelEpoch ? this.detect(req) : this.current()));
      }
      if (wantsTurn) this.markOpened(cause, req.entryPoint);
      return joined;
    }
    if (!req.fresh) return Promise.resolve(this.current());
    this.refreshBrowsers();
    this.markOpened(cause, req.entryPoint);
    return this.startDetection(cause, wantsTurn || (cause === 'boot' && !hasCompletedAgentSetup('claude')));
  }

  private startDetection(cause: DetectionCause, verifies: boolean, loginFailed = false): Promise<ClaudeSetupState> {
    const owner: DetectionOwner = {
      flight: {},
      abort: new AbortController(),
      epoch: this.cancelEpoch,
      before: this.settled,
      cause,
      mode: verifies ? 'turn' : 'credential',
    };
    this.detection = owner;
    this.lastCause = cause;
    return shareInFlight(owner.flight, () => this.runDetection(owner, loginFailed).finally(() => {
      if (this.detection === owner) this.detection = undefined;
    }));
  }

  /** The failed prompt was the verification, so it records no setup step; a credential still on disk leaves it standing (ONL-2496). */
  recheckAfterTurnSignedOut(): Promise<ClaudeSetupState> {
    return this.recheckAfterChatRefusal('turn-signed-out');
  }

  /** Only a subscription is a sign-in away; a refused key or endpoint stays the chat's honest row (ONL-2903). */
  recheckAfterSignInRejected(): Promise<ClaudeSetupState> {
    if (!isClaudeSubscriptionPlan(this.plan)) return Promise.resolve(this.current());
    return this.recheckAfterChatRefusal('turn-sign-in-rejected');
  }

  private recheckAfterChatRefusal(detail: 'turn-signed-out' | 'turn-sign-in-rejected'): Promise<ClaudeSetupState> {
    if (this.login !== undefined || this.machine.isSigningIn()) return Promise.resolve(this.current());
    if (this.detection === undefined) this.machine.verificationFailed(detail, undefined, this.plan);
    return this.detect({ fresh: true, cause: 'recheck' });
  }

  private markOpened(cause: DetectionCause, entryPoint: SetupEntryPoint | undefined): void {
    if (cause === 'boot' || entryPoint === undefined) return;
    recordAgentSetupStep('claude', 'opened', { entryPoint });
  }

  /** A turn that answered "not signed in" is a legal place to start one, or the sheet offers a button that refuses (ONL-2496). */
  private acceptsSignIn(): boolean {
    const state = this.current();
    if (state.status === 'signed-out') return true;
    if (state.status === 'failed') return state.detail !== 'spawn';
    return state.status === 'verification-failed' && claudeDetailNeedsSignIn(state.detail);
  }

  signIn(opts: { entryPoint?: SetupEntryPoint; browserId?: string } = {}): { accepted: boolean } {
    if (this.login !== undefined) return { accepted: false };
    if (!this.acceptsSignIn()) return { accepted: false };
    this.refreshBrowsers();
    const browser = this.browsers.find(({ id }) => id === opts.browserId);
    if (opts.browserId !== undefined && (typeof opts.browserId !== 'string' || browser === undefined)) {
      return { accepted: false };
    }
    const selectedBrowserId = browser?.isDefault === false ? browser.id : undefined;
    if (opts.entryPoint !== undefined) {
      recordAgentSetupStep('claude', 'sign_in_started', {
        entryPoint: opts.entryPoint,
        browserChoice: selectedBrowserId === undefined ? 'default' : 'other',
      });
    }
    const owner: LoginOwner = { phase: { kind: 'starting' } };
    this.login = owner;
    void this.runSignIn(owner, selectedBrowserId).catch(() => {
      if (!this.ownsLogin(owner)) return;
      logger.warn('sign-in failed');
      this.failWith('exited');
    }).finally(() => {
      if (this.login === owner) this.login = undefined;
    });
    return { accepted: true };
  }

  openPageAgain(): { accepted: boolean } {
    const phase = this.login?.phase;
    if (phase?.kind !== 'active' || !this.machine.isSigningIn()) return { accepted: false };
    phase.handle.openPage().catch(() => {
      logger.warn('could not open the sign-in page');
    });
    this.machine.awaitingCode();
    recordAgentSetupStep('claude', 'page_reopened');
    return { accepted: true };
  }

  submitCode(code: string): { accepted: boolean } {
    const phase = this.login?.phase;
    if (phase?.kind !== 'active' || !this.machine.isSigningIn()) return { accepted: false };
    const clean = sanitizeCode(code);
    if (clean === undefined) return { accepted: false };
    const wrote = phase.handle.submitCode(clean);
    if (wrote) phase.code = 'submitted';
    return { accepted: wrote };
  }

  cancel(forQuit = false): void {
    this.cancelEpoch += 1;
    this.detection?.abort.abort();
    const owner = this.login;
    if (owner === undefined || owner.phase.kind === 'cancelled') {
      if (!forQuit) checkSetupAbandoned('claude');
      return;
    }
    const phase = owner.phase;
    owner.phase = { kind: 'cancelled' };
    if (phase.kind === 'active') {
      phase.handle.cancel();
      this.machine.signedOut();
    }
    if (!forQuit) recordAgentSetupStep('claude', 'cancelled');
  }

  /** The one caller of `machine.failed`: `fallback` telemetry rides every failure. */
  private failWith(detail: ClaudeLoginDetail): void {
    this.machine.failed(detail);
    recordAgentSetupStep('claude', 'fallback', { outcome: fallbackOutcome(detail), ...(this.cause === 'boot' ? { entryPoint: 'startup' } : {}) });
  }

  private verificationFailed(detail: ClaudeVerificationDetail, pinned?: true, facts?: ClaudeTurnFacts): void {
    this.machine.verificationFailed(detail, facts, this.plan);
    if (pinned !== true) recordAgentSetupStep('claude', 'fallback', { outcome: fallbackOutcome(detail), ...(this.cause === 'boot' ? { entryPoint: 'startup' } : {}) });
  }

  private detectionIsCurrent(owner: DetectionOwner): boolean {
    if (this.detection !== owner) return false;
    if (owner.epoch === this.cancelEpoch) return true;
    this.machine.restore(owner.before);
    return false;
  }

  private async runDetection(owner: DetectionOwner, loginFailed: boolean): Promise<ClaudeSetupState> {
    this.machine.checking();
    try {
      if (this.options.browsers === undefined) await this.browserAccess.load();
      if (!this.detectionIsCurrent(owner)) return this.current();
      this.refreshBrowsers();
      const bin = (this.options.bin ?? claudeBinary)();
      if (bin === undefined) {
        this.failWith('spawn');
        return this.current();
      }
      const env = await (this.options.env ?? claudeChildEnv)();
      if (!this.detectionIsCurrent(owner)) return this.current();
      const verdict = await claudeAuthStatus({
        bin,
        env,
        ...(this.options.runStatus === undefined ? {} : { run: this.options.runStatus }),
      });
      if (!this.detectionIsCurrent(owner)) return this.current();
      if (verdict.status === 'signed-in') await this.settleCredential(verdict, env, owner);
      else if (verdict.status === 'failed') this.failWith(verdict.detail);
      // A login child that exited without leaving a credential is the fallback, not a fresh start (ONL-2186).
      else if (this.cause === 'login') this.failWith(loginFailed ? 'server-rejected' : 'exited');
      else this.machine.signedOut();
    } catch (error) {
      if (!this.detectionIsCurrent(owner)) return this.current();
      logger.warn('status failed', { error });
      this.failWith('exited');
    }
    return this.current();
  }

  /** A credential read proves a credential exists; only a turn proves a request goes out (ONL-2496). */
  private async settleCredential(
    verdict: SignedInFacts,
    env: Env,
    owner: DetectionOwner,
  ): Promise<void> {
    this.plan = verdict.plan;
    if (!this.detectionIsCurrent(owner)) return;
    if (owner.mode !== 'turn') {
      // A verification is queued behind this read, so its turn settles the board rather than this unverified verdict.
      if (owner.mode === 'turn-queued') return;
      // The cheap path never promotes a verdict a turn disproved; a tap, a Check again or a login clears it.
      if (owner.before.status === 'verification-failed') this.machine.restore(owner.before);
      else {
        // No turn ran, so this reports no connection: `connected` is the verified path's to record (ONL-2496).
        this.machine.signedIn(verdict);
      }
      return;
    }
    this.machine.verifying();
    // Recorded as the turn starts, not when it answers: a quit mid-turn would otherwise leave no attempt in the funnel.
    if (agentVerify() === undefined) recordAgentSetupStep('claude', 'verify_started', this.cause === 'boot' ? { entryPoint: 'startup' } : {});
    const turn = await (this.options.runTurn ?? runThroughSdk)({ env, signal: owner.abort.signal });
    if (!this.detectionIsCurrent(owner)) return;
    if (turn.outcome === 'cancelled') {
      this.machine.restore(owner.before);
      return;
    }
    if (turn.outcome === 'launch-failed') {
      // A turn that could not launch is a verification that failed, not a missing install: `failed`'s sheet offers a login the credential already passed, and the no-promotion rule would not cover it (ONL-2496).
      this.verificationFailed('turn-agent-error', turn.pinned, turn.sentence === undefined ? undefined : { sentence: turn.sentence });
      return;
    }
    if (turn.outcome === 'failed') {
      const detail = turn.detail === 'turn-sign-in-rejected' && !isClaudeSubscriptionPlan(verdict.plan) ? 'turn-provider-refused' : turn.detail;
      this.verificationFailed(detail, turn.pinned, turn.facts);
      return;
    }
    this.reachedSignedIn(verdict, owner.before, turn.pinned);
  }

  private reachedSignedIn(verdict: SignedInFacts, before: ClaudeSetupState, pinned?: true): void {
    this.machine.signedIn(verdict);
    if (pinned !== true) settleAgentSetupAttempt('claude');
    if (pinned !== true && (before.status !== 'signed-in' || !hasCompletedAgentSetup('claude'))) {
      recordAgentSetupStep('claude', 'connected', this.cause === 'boot' ? { entryPoint: 'startup' } : {});
    }
  }

  private ownsLogin(owner: LoginOwner): boolean {
    return this.login === owner && owner.phase.kind !== 'cancelled';
  }

  private async runSignIn(owner: LoginOwner, browserId?: string): Promise<void> {
    let handle: ClaudeLoginHandle;
    try {
      const bin = (this.options.bin ?? claudeBinary)();
      if (bin === undefined) {
        this.failWith('spawn');
        return;
      }
      const env = await (this.options.env ?? claudeChildEnv)();
      if (!this.ownsLogin(owner)) return;
      const loginOptions = { bin, env, openExternal: this.openExternal };
      handle = browserId === undefined
        ? await (this.options.startLogin ?? startClaudeLogin)(loginOptions)
        : await (this.options.browserLogin ?? this.browserAccess.login)(browserId, loginOptions);
    } catch (error) {
      if (!this.ownsLogin(owner)) return;
      logger.warn('sign-in could not start', { reason: error instanceof Error ? error.message : 'not an error' });
      if (browserId !== undefined && error instanceof ClaudeBrowserPreparationError) {
        this.refreshBrowsers();
        this.machine.signedOut('exited');
        recordAgentSetupStep('claude', 'fallback', { outcome: 'failed' });
      } else {
        this.failWith(isSpawnFailure(error) ? 'spawn' : 'exited');
      }
      return;
    }
    if (!this.ownsLogin(owner)) {
      handle.cancel();
      if (this.login === owner) this.machine.signedOut();
      return;
    }
    owner.phase = { kind: 'active', handle, code: 'idle' };
    handle.onRejected(() => {
      if (this.ownsLogin(owner) && owner.phase.kind === 'active' && this.machine.isSigningIn()) {
        this.machine.awaitingCode('invalid-code');
        owner.phase.code = 'idle';
        recordAgentSetupStep('claude', 'code_submitted', { outcome: 'invalid_code' });
      }
    });
    this.machine.signingIn();
    const outcome = await handle.completed;
    if (!this.ownsLogin(owner)) return;
    const submitted = owner.phase.kind === 'active' && owner.phase.code === 'submitted';
    this.login = undefined;
    if (outcome === 'cancelled') {
      this.machine.signedOut();
      return;
    }
    if (outcome === 'abandoned') {
      this.failWith('took-too-long');
      return;
    }
    // The child exited without a rejection since the last write: that code was accepted.
    if (submitted) {
      recordAgentSetupStep('claude', 'code_submitted', { outcome: 'ok' });
    }
    await this.startDetection('login', true, handle.loginFailed());
  }
}

function isSpawnFailure(error: unknown): boolean {
  const code = (error as { code?: unknown } | undefined)?.code;
  return code === 'ENOENT' || code === 'EACCES' || code === 'ENOEXEC' || code === 'ENOTDIR';
}

let host: ClaudeHost | undefined;

export function startClaudeBootPreCheck(): void {
  void host?.detect({ fresh: true, cause: 'boot' });
}

export function recheckClaudeAfterUnauthenticated(cause: 'signed-out' | 'rejected'): void {
  void (cause === 'rejected' ? host?.recheckAfterSignInRejected() : host?.recheckAfterTurnSignedOut());
}

/** A login child parked on stdin would otherwise outlive Studio. */
export function cancelClaudeLoginForQuit(): void {
  host?.cancel(true);
}

export function registerClaudeHost(options: ClaudeHostOptions = {}): ClaudeHost {
  host = new ClaudeHost(options);
  if (proofSwitchOn('STUDIO_CLAUDE_PROOF')) {
    const proof: ClaudeProofHook = {
      configure: (runtime) => {
        const overrides: ClaudeProofRuntime = {};
        if ('bin' in runtime) overrides.bin = runtime.bin;
        if ('env' in runtime) overrides.env = runtime.env;
        if ('browsers' in runtime) overrides.browsers = runtime.browsers;
        if ('browserLogin' in runtime) overrides.browserLogin = runtime.browserLogin;
        if ('startLogin' in runtime) overrides.startLogin = runtime.startLogin;
        host?.cancel();
        host = new ClaudeHost({ ...options, ...overrides });
      },
      current: () => host?.current(),
    };
    Object.assign(globalThis, { __studioClaudeProof: proof });
  }
  // It answers `undefined` when no host is up, which the channel does not declare.
  handle(IPC_INVOKE.claudeStatus, (_event, req) =>
    host?.detect({ fresh: req?.fresh ?? false, cause: 'recheck', entryPoint: req?.entryPoint }) as Promise<ClaudeSetupState>,
  );
  handle(
    IPC_INVOKE.claudeSignIn,
    (_event, req: { entryPoint?: SetupEntryPoint; browserId?: string } | undefined) =>
      host?.signIn({ entryPoint: req?.entryPoint, browserId: req?.browserId }) ?? { accepted: false },
  );
  handle(IPC_INVOKE.claudeOpenPageAgain, () => host?.openPageAgain() ?? { accepted: false });
  handle(
    IPC_INVOKE.claudeSubmitCode,
    (_event, req: { code: string } | undefined) => host?.submitCode(req?.code ?? '') ?? { accepted: false },
  );
  handle(IPC_INVOKE.claudeSignInCancel, () => {
    host?.cancel();
  });
  return host;
}
