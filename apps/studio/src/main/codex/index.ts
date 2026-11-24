import { shell } from 'electron';
import { handle } from '../ipc/bridge.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  IPC_EMIT,
  IPC_INVOKE,
  type CodexSetupState,
  type CodexSetupStatus,
  type SetupEntryPoint,
} from '@studio/events';

import { checkHealth, resolveCodex } from '../agent-host/appserver/resolve.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { checkSetupAbandoned, recordAgentSetupStep, recordCodexSetupState } from '../telemetry/setup-step.js';
import type { SetupFailureInput } from '../telemetry/setup-failure.js';
import { t, type StringKey } from '@studio/i18n';
import { acquireCodex, type AcquireFailure } from './acquire.js';
import { createClaudeBrowsers } from '../claude/browsers.js';
import { startChatGptLogin, type LoginHandle } from './login.js';
import { CodexSetupMachine } from './machine.js';
import { CODEX_VERSION, codexCacheRoot, codexInstallRoot } from './paths.js';
import { validateCodex, type ValidationFailure } from './validate.js';
import { log } from '../log/index.js';
import { hostPlatform } from '../env/platform.js';
import { devSwitches } from '../env/dev-switches.js';

const logger = log('codex');

/** `undefined`: the card's own title says it, and the raw error would carry a path. */
const ACQUIRE_DETAIL: Record<AcquireFailure, StringKey | undefined> = {
  metadata: 'onboarding.setup.codex.detail.metadata',
  prepare: 'onboarding.setup.codex.detail.prepare',
  integrity: 'onboarding.setup.codex.detail.integrity',
  download: undefined,
};

const VALIDATION_DETAIL: Record<ValidationFailure, StringKey | undefined> = {
  unusable: 'onboarding.setup.codex.detail.unusable',
  'no-version': 'onboarding.setup.codex.detail.noVersion',
  exited: 'onboarding.setup.codex.detail.exited',
  connection: 'onboarding.setup.codex.detail.connection',
  timeout: 'onboarding.setup.codex.detail.timeout',
  home: 'onboarding.setup.codex.detail.home',
};

function detail(key: StringKey | undefined): string | undefined {
  return key === undefined ? undefined : t(key);
}

/** Harness pin of the reported state only; not gated on `is.dev` because `test:e2e:packaged` drives the signed `.app`. */
function pinnedSetup(): CodexSetupState | undefined {
  const pinned = devSwitches.codexSetup;
  if (!pinned) return undefined;
  const allowed: CodexSetupStatus[] = [
    'unsupported',
    'idle',
    'checking',
    'downloading',
    'validating',
    'ready',
    'failed',
    'broken',
    'outdated',
    'signed-out',
    'signing-in',
  ];
  const status = allowed.find((candidate) => candidate === pinned);
  if (!status) {
    throw new Error(
      `STUDIO_CODEX_SETUP="${pinned}" is not a CodexSetupStatus. ` +
        `Expected one of: ${allowed.join(', ')}.`,
    );
  }
  switch (status) {
    case 'downloading': return { status, percent: 42 };
    case 'unsupported':
    case 'outdated': return { status, message: '' };
    default: return { status };
  }
}

export interface CodexHostOptions {
  onState?: (state: CodexSetupState) => void;
  startLogin?: typeof startChatGptLogin;
  openExternal?: (url: string) => Promise<void>;
  openInBrowser?: (browserId: string, url: string) => Promise<void>;
  validate?: typeof validateCodex;
  acquire?: typeof acquireCodex;
}

interface AcquisitionOwner {
  kind: 'acquisition';
  phase: 'acquiring' | 'downloading' | 'validating' | 'settled';
  mode: 'silent' | 'explicit';
  promise: Promise<void>;
}

type LoginPhase =
  | { phase: 'starting' }
  | { phase: 'active'; handle: LoginHandle }
  | { phase: 'validating' }
  | { phase: 'cancelled' }
  | { phase: 'settled' };

interface LoginOwner {
  kind: 'login';
  state: LoginPhase;
  promise: Promise<void>;
}

type SetupOwner = AcquisitionOwner | LoginOwner;

// The same browsers the Claude sign-in offers; ChatGPT's page opens in the one picked.
const browserAccess = createClaudeBrowsers();

class CodexHost {
  private readonly options: CodexHostOptions;
  private readonly machine: CodexSetupMachine;
  private readonly onState: CodexHostOptions['onState'];
  private acquisition: AcquisitionOwner | undefined;
  private login: LoginOwner | undefined;
  private reinstallRequired = false;
  private setupFailure: SetupFailureInput | undefined;

  constructor(options: CodexHostOptions = {}) {
    this.options = options;
    this.onState = options.onState;
    this.machine = new CodexSetupMachine({
      emit: (state) => {
        if (this.acquisition?.mode !== 'silent') recordCodexSetupState(state.status, 'message' in state ? state.message : undefined, this.setupFailure);
        broadcastToRenderers(IPC_EMIT.codexState, state);
        this.onState?.(state);
      },
    });
  }

  current(): CodexSetupState {
    const pinned = pinnedSetup();
    if (pinned !== undefined) return pinned;
    return this.machine.current();
  }

  async preCheck(): Promise<void> {
    if (pinnedSetup() !== undefined) return;
    // Above the login: the session has no runtime to start until the installation it is waiting on finishes (ONL-2925).
    if (this.acquisition !== undefined) return this.acquisition.promise;
    // A login owns setup and may sit on the browser for minutes; waiting for it parks the session that asked (ONL-3107).
    if (this.login !== undefined) return;
    if (this.readyStillHolds()) return;

    const root = codexInstallRoot();
    const resolved = resolveCodex(root);
    const installed = resolved !== null && checkHealth(resolved, root).ok;
    if (!installed && !hasPreviousInstall()) return;
    if (installed) this.machine.binaryResolved(resolved.bin);

    await this.startAcquisition('silent', installed ? root : undefined);
  }

  install(): { accepted: boolean } {
    if (pinnedSetup() !== undefined) return { accepted: true };
    if (this.login !== undefined) return { accepted: true };
    const owner = this.acquisition;
    if (owner !== undefined) {
      if (owner.mode === 'silent') {
        owner.mode = 'explicit';
        this.machine.validating();
      }
      return { accepted: true };
    }
    if (this.readyStillHolds()) return { accepted: true };
    recordAgentSetupStep('codex', 'install_started');
    const status = this.machine.current().status;
    this.reinstallRequired ||= status === 'broken' || status === 'outdated';
    void this.startAcquisition('explicit');
    return { accepted: true };
  }

  signIn(entryPoint?: SetupEntryPoint, browserId?: string): { accepted: boolean } {
    if (pinnedSetup() !== undefined) return { accepted: true };
    if (this.login !== undefined) return { accepted: true };
    const completion = Promise.withResolvers<void>();
    const owner: LoginOwner = { kind: 'login', state: { phase: 'starting' }, promise: completion.promise };
    this.login = owner;
    recordAgentSetupStep('codex', 'sign_in_started', entryPoint === undefined ? {} : { entryPoint });
    this.machine.signingIn();
    void this.runSignIn(owner, browserId)
      .catch((error: unknown) => this.loginFallback(owner, messageOf(error)))
      .finally(() => {
        if (this.login === owner) this.login = undefined;
        completion.resolve();
      });
    return { accepted: true };
  }

  private readyStillHolds(): boolean {
    if (!this.machine.isReady()) return false;
    const root = codexInstallRoot();
    const resolved = resolveCodex(root);
    if (resolved !== null && checkHealth(resolved, root).ok) return true;
    this.machine.installationLost();
    return false;
  }

  private owns(owner: SetupOwner): boolean {
    return owner.kind === 'acquisition'
      ? this.acquisition === owner && this.login === undefined
      : this.login === owner && owner.state.phase !== 'cancelled';
  }

  private startAcquisition(mode: AcquisitionOwner['mode'], installedRoot?: string): Promise<void> {
    const completion = Promise.withResolvers<void>();
    const owner: AcquisitionOwner = {
      kind: 'acquisition',
      phase: installedRoot === undefined ? 'acquiring' : 'validating',
      mode,
      promise: completion.promise,
    };
    this.acquisition = owner;
    // Held intent is spent by the tap that asked for it; a silent launch check never starts a download the user did not ask for this time.
    const force = mode === 'explicit' && this.reinstallRequired;
    void (installedRoot === undefined ? this.run(owner, force) : this.validate(installedRoot, owner))
      .catch((error: unknown) => this.failedUnexpectedly(owner, error))
      .finally(() => {
        owner.phase = 'settled';
        if (this.acquisition === owner) this.acquisition = undefined;
        completion.resolve();
      });
    return owner.promise;
  }

  private failedUnexpectedly(owner: AcquisitionOwner, error: unknown): void {
    if (this.acquisition !== owner) return;
    owner.phase = 'settled';
    logger.warn('setup threw', { error });
    if (this.owns(owner)) this.machine.failed();
  }

  async cancelSignIn(): Promise<void> {
    const owner = this.login;
    if (owner === undefined) {
      checkSetupAbandoned('codex');
      return;
    }
    if (owner.state.phase !== 'starting' && owner.state.phase !== 'active') return;
    const handle = owner.state.phase === 'active' ? owner.state.handle : undefined;
    owner.state = { phase: 'cancelled' };
    recordAgentSetupStep('codex', 'cancelled');
    this.machine.signedOut();
    await handle?.cancel();
  }

  private async run(owner: AcquisitionOwner, force = false): Promise<void> {
    this.setupFailure = undefined;
    const cacheRoot = codexCacheRoot();
    const root = codexInstallRoot();
    logger.info('setup', { cache_root: cacheRoot, install_root: root });

    this.machine.checking();
    const acquired = await (this.options.acquire ?? acquireCodex)({
      cacheRoot,
      force,
      onProgress: ({ receivedBytes, totalBytes }) => {
        if (!this.owns(owner) || (owner.phase !== 'acquiring' && owner.phase !== 'downloading')) return;
        if (owner.phase === 'acquiring') {
          owner.phase = 'downloading';
          this.machine.downloading();
        }
        this.machine.progress(receivedBytes, totalBytes);
      },
    });
    if (this.acquisition !== owner) return;
    owner.phase = 'settled';

    if (acquired.outcome === 'unsupported') {
      this.setupFailure = { detail: 'unsupported' };
      logger.warn('setup unsupported', { message: acquired.message });
      if (!this.owns(owner)) return;
      this.machine.unsupported(
        t('onboarding.setup.codex.detail.unsupported', { platform: hostPlatform(), arch: process.arch }),
      );
      return;
    }
    if (acquired.outcome === 'failed') {
      this.setupFailure = { detail: acquired.failure, error: acquired.message };
      logger.warn('setup failed', { failure: acquired.failure, message: acquired.message });
      if (!this.owns(owner)) return;
      this.machine.failed(detail(ACQUIRE_DETAIL[acquired.failure]));
      return;
    }
    if (acquired.outcome === 'broken') {
      this.setupFailure = { detail: 'broken', error: acquired.message };
      logger.warn('download unusable', { message: acquired.message });
      if (!this.owns(owner)) return;
      this.machine.broken(t('onboarding.setup.codex.detail.unusable'));
      return;
    }
    logger.info(acquired.downloaded ? 'binary downloaded' : 'binary reused', { root: acquired.root, bin: acquired.bin });
    if (acquired.downloaded) this.reinstallRequired = false;
    this.machine.binaryResolved(acquired.bin);

    owner.phase = 'validating';
    await this.validate(acquired.root, owner);
  }

  /** `broken` and `outdated` offer a re-download, so only what a re-download fixes lands there. */
  private async validate(root: string, owner: SetupOwner): Promise<void> {
    this.setupFailure = undefined;
    if (!this.owns(owner)) return;
    if (owner.kind === 'login' || owner.mode === 'explicit') this.machine.validating();
    try {
      const result = await (this.options.validate ?? validateCodex)({ root });
      if (!this.owns(owner)) return;
      logger.info('validation result', { outcome: result.outcome });
      if (result.outcome === 'ok') {
        this.machine.ready({
          ...(result.email === undefined ? {} : { email: result.email }),
          ...(result.plan === undefined ? {} : { plan: result.plan }),
        });
        if (owner.kind === 'login' || owner.mode === 'explicit') recordAgentSetupStep('codex', 'connected');
      } else if (result.outcome === 'signed-out') this.machine.signedOut(result.message);
      else if (result.outcome === 'outdated') {
        this.setupFailure = { detail: 'outdated' };
        this.machine.outdated(
          t('onboarding.setup.codex.detail.outdated', { version: result.version ?? '', floor: CODEX_VERSION }),
        );
      } else if (result.outcome === 'failed') {
        logger.warn('validation failed', { failure: result.failure, exitCode: result.exitCode, signal: result.signal, stderr: result.message });
        this.setupFailure = { detail: result.failure, error: result.message, exitCode: result.exitCode };
        this.machine.failed(detail(result.failure === undefined ? undefined : VALIDATION_DETAIL[result.failure]));
      } else {
        logger.warn('validation broken', { failure: result.failure, exitCode: result.exitCode, signal: result.signal, stderr: result.message });
        this.setupFailure = { detail: result.failure ?? 'broken', error: result.message, exitCode: result.exitCode };
        this.machine.broken(detail(result.failure === 'exited' ? 'onboarding.setup.codex.detail.crashed' : result.failure === undefined ? undefined : VALIDATION_DETAIL[result.failure]));
      }
    } catch (error) {
      if (!this.owns(owner)) return;
      logger.warn('validation failed', { failure: 'connection', stderr: messageOf(error) });
      this.setupFailure = { error };
      this.machine.failed(t('onboarding.setup.codex.detail.connection'));
    }
  }

  /** Rewrites the user's real `~/.codex/auth.json` from scratch, keys included; no backup is taken and the `signed-out` copy says so (ONL-2102). */
  private async runSignIn(owner: LoginOwner, browserId?: string): Promise<void> {
    if (!this.owns(owner)) return;
    try {
      if (this.acquisition !== undefined) await this.acquisition.promise;
      if (!this.owns(owner)) return;
      const root = codexInstallRoot();
      const handle = await (this.options.startLogin ?? startChatGptLogin)({ root });
      void handle.completed.catch(() => undefined);
      if (!this.owns(owner)) {
        await handle.cancel();
        return;
      }
      owner.state = { phase: 'active', handle };
      this.machine.signingIn(handle.authUrl);
      if (!this.owns(owner)) return;
      const openDefault = this.options.openExternal ?? ((url: string) => shell.openExternal(url));
      if (browserId === undefined) await openDefault(handle.authUrl);
      else {
        const openIn = this.options.openInBrowser ?? ((id: string, url: string) => browserAccess.open(id, url));
        // A browser picked from a list read earlier may be gone; the page still opens, in the default one.
        await openIn(browserId, handle.authUrl).catch(() => {
          if (this.owns(owner)) return openDefault(handle.authUrl);
        });
      }
      const outcome = await handle.completed;
      if (!this.owns(owner)) return;
      if (!outcome.success) {
        this.loginFallback(owner, outcome.error ?? 'sign-in did not complete');
        return;
      }
      owner.state = { phase: 'validating' };
      await this.validate(root, owner);
      if (this.owns(owner)) owner.state = { phase: 'settled' };
    } catch (error) {
      if (!this.owns(owner)) return;
      if (owner.state.phase === 'active') await owner.state.handle.cancel().catch(() => undefined);
      this.loginFallback(owner, messageOf(error));
    }
  }

  private loginFallback(owner: LoginOwner, message: string): void {
    if (!this.owns(owner)) return;
    owner.state = { phase: 'settled' };
    this.machine.signedOut(message);
    recordAgentSetupStep('codex', 'fallback', { outcome: 'failed', failure: { error: message } });
  }
}

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  const message = (error as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' ? message : String(error);
}

let host: CodexHost | undefined;

function hasPreviousInstall(): boolean {
  const cacheRoot = codexCacheRoot();
  try {
    return readdirSync(cacheRoot, { withFileTypes: true }).some((entry) => {
      if (!entry.isDirectory() || !/^codex-\d+\.\d+\.\d+$/.test(entry.name)) return false;
      if (entry.name === `codex-${CODEX_VERSION}`) return false;
      const root = join(cacheRoot, entry.name);
      return checkHealth(resolveCodex(root), root).ok;
    });
  } catch {
    return false;
  }
}

export async function prepareCodexForSession(): Promise<void> {
  if (devSwitches.codexRoot !== undefined) return;
  await host?.preCheck();
}

export function codexSetupStatus(): CodexSetupStatus | undefined {
  return host?.current().status;
}

export function startCodexBootPreCheck(): void {
  void host?.preCheck();
}

export function registerCodexHost(options: CodexHostOptions = {}): CodexHost {
  host = new CodexHost(options);
  handle(
    IPC_INVOKE.codexStatus,
    (): CodexSetupState => host?.current() ?? { status: 'unsupported', message: '' },
  );
  handle(IPC_INVOKE.codexInstall, () => host?.install() ?? { accepted: false });
  handle(
    IPC_INVOKE.codexSignIn,
    (_event, request: { entryPoint?: SetupEntryPoint; browserId?: unknown } = {}) =>
      host?.signIn(request.entryPoint, typeof request.browserId === 'string' ? request.browserId : undefined) ?? { accepted: false },
  );
  handle(IPC_INVOKE.codexSignInCancel, async () => {
    await host?.cancelSignIn();
  });
  return host;
}
