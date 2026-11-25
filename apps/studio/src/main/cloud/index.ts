import { handle } from '../ipc/bridge.js';
import { identity as cloudIdentity, createOnlookClient as createProviderOnlookClient } from '@onlook/cloud-provider';
import { FOUND_US_QUESTION, IPC_EMIT, ROLE_QUESTION, isRoleOption, IPC_INVOKE, SIGN_IN_FAILURE_CODES, isFoundUsOption, type OnlookSignInMethod, type OnlookState, type SignInFailureCode, type StudioIdentity, type SurveyAnswer } from '@studio/events';
import { everyRenderer } from '../window/host.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { clearAccountIdentity, completeBrowserSignIn, onIdentity } from '../identity/ipc.js';
import { readIdentity } from '../identity/store.js';
import { neutralState } from '../identity/provider-shape.js';
import { resolvePicture } from '../identity/picture.js';
import { createOnlookClient as createLocalOnlookClient } from './local-client.js';
import { profileFor, type KeptPicture } from './profile.js';
import { requireStudioTabSender } from '../tabs/sender.js';
import type { CloudIdentity, OnlookClient, SessionChange } from './client.js';
import { log } from '../log/index.js';
import { createAccountActions } from './account-actions.js';
import { createSessionEpoch } from './session-epoch.js';
import { noteOnlookSession } from './access.js';
import { capabilities } from './capabilities.js';
import { cloudBuildForProof } from '../diagnostics/gate.js';
import { isTeamCommand } from './team-command.js';
import { capture, identifyPerson } from '../telemetry/index.js';
import { flagOn } from '../flags/index.js';
import { createLaunchSessionCheck } from './launch-session.js';
import { trackLaunchActivity } from './launch-activity.js';
import { launchSessionProofProvider } from './launch-session-proof.js';

let proof: ReturnType<typeof launchSessionProofProvider>;
let proofRead = false;

function proofProvider(): typeof proof {
  if (!proofRead) {
    proof = launchSessionProofProvider();
    proofRead = true;
  }
  return proof;
}

function providerIdentity(): CloudIdentity {
  return proofProvider()?.identity ?? cloudIdentity;
}
let client: OnlookClient = createLocalOnlookClient();

export function githubBackend(): OnlookClient['github'] {
  return flagOn('github-import') ? client.github : undefined;
}

export function reportSubmission(): OnlookClient['submitReport'] {
  return client.submitReport?.bind(client);
}
let initialized = false;
let disposed = false;
let picture: KeptPicture | null = null;
let unsubscribeTokens: (() => void) | undefined;
let unsubscribeState: (() => void) | undefined;
let unsubscribeSignIn: (() => void) | undefined;
let installing: Promise<void> | undefined;
let recoveryPresses = 0;
let identityObserved = false;
/** Presses that retry a failed install; past this a launch has its answer, and each further press would import the provider again (ONL-2950). */
const CLOUD_RECOVERY_PRESSES = 3;
const sessionEpoch = createSessionEpoch();
let previousProviderState: OnlookState | undefined;
let accountState: OnlookState | undefined;
let launchSession: ReturnType<typeof createLaunchSessionCheck> | undefined;
let launchActivity: ReturnType<typeof trackLaunchActivity> | undefined;
let sessionEnded = false;

/** The last account the server named, so a dropped connection cannot un-name a contradiction it already reported (ONL-2882). */
let verifiedSubject: string | undefined;

/** The account telemetry has been told this session is, so a per-ask snapshot does not announce it again (ONL-2882). */
let attributedSubject: string | undefined;

/** What the provider published, in the editor's own names whichever ones it used. */
function providerState(): OnlookState {
  return neutralState(client.snapshot());
}

/** The record names the restored session's account only while the server's own answer agrees; before it answers nothing contradicts it (ONL-2882). */
function sessionIdentity(state: OnlookState): StudioIdentity | null {
  if (state.session !== 'signed-in') return null;
  const identity = readIdentity();
  if (identity === null) return null;
  const verified = state.me?.user?.subject ?? verifiedSubject;
  if (verified === undefined) return identity;
  return identity.source === 'provider' && identity.subject === verified ? identity : null;
}

/** Only the server says the confirmed account is this session's, so a destructive action waits for it (ONL-2882). */
function confirmedAccount(state: OnlookState): StudioIdentity | null {
  return state.me?.user === undefined || state.me.user === null ? null : sessionIdentity(state);
}

function accountSnapshot(): OnlookState {
  const state = providerState();
  const named = state.me?.user?.subject;
  if (named !== undefined) verifiedSubject = named;
  const identity = sessionIdentity(state);
  // The server named this session's account, so telemetry may finally attribute the launch to it (ONL-2882).
  if (named !== undefined && named !== attributedSubject && identity !== null) {
    attributedSubject = named;
    identifyPerson(identity);
  }
  noteOnlookSession(state.session);
  const epoch = sessionEpoch(state.session, identity);
  const providerChanged = state !== previousProviderState;
  const teamsEnabled = flagOn('teams') && capabilities().teams;
  const step = providerIdentity().signInStep();
  if (accountState === undefined || providerChanged || epoch !== accountState.sessionEpoch || teamsEnabled !== accountState.teamsEnabled || step !== accountState.signInStep || sessionEnded !== accountState.sessionEnded) {
    const previous = accountState;
    accountState = { ...state, revision: (previous?.revision ?? -1) + 1, sessionEpoch: epoch, teamsEnabled, signInStep: step, sessionEnded };
    previousProviderState = state;
    if (previous !== undefined && !providerChanged) broadcastToRenderers(IPC_EMIT.onlookState, accountState);
  }
  return accountState;
}

function signInMethod(method: unknown): OnlookSignInMethod | undefined {
  return method === 'google' || method === 'github' || method === 'email' ? method : undefined;
}

function recordSignInFailure(method: OnlookSignInMethod, code: SignInFailureCode): void {
  capture('sign_in_failed', { method, code });
}

function recordSignInCompleted(method: OnlookSignInMethod): void {
  capture('sign_in_completed', { method });
}

/** The provider compiles elsewhere, so both arguments are bounded on arrival rather than typed at the seam (ONL-2950). */
function noteProviderFailure(method: unknown, code: unknown): void {
  const pressed = signInMethod(method);
  if (pressed === undefined) return;
  account.noteSignInFailure(pressed, SIGN_IN_FAILURE_CODES.find((known) => known === code) ?? 'failed');
}

function supersedePending(): void {
  launchSession?.supersede();
  providerIdentity().supersedeSignIn();
}

const account = createAccountActions({
  signIn: (method) => { launchSession?.supersede(); return client.signIn(method); },
  signOut: () => client.signOut(),
  deleteAccount: () => client.deleteAccount(),
  supersede: supersedePending,
  // The published session, not the stored pair: reading that re-decrypts it, and an unreadable read deletes it (ONL-2950).
  hasSession: () => client.snapshot().session === 'signed-in',
  record(action, result, method) {
    capture('account_action', { action, outcome: result.ok ? 'ok' : result.code, ...(method === undefined ? {} : { method }) });
  },
  recordFailure: recordSignInFailure,
  recordCompletion: recordSignInCompleted,
  clear() {
    launchSession?.supersede();
    sessionEnded = false;
    retireAccountIdentity();
    providerIdentity().clearSession();
    client.setSession(false);
  },
});

function syncProfile(): void {
  const identity = sessionIdentity(providerState());
  const profile = profileFor(identity, picture);
  client.setProfile(profile);
  const url = identity?.pictureUrl;
  if (url === undefined || profile?.picture !== null) return;
  // Unawaited by design: an avatar shows initials until the bytes land, and nothing waits on them.
  void resolvePicture(url).then((next) => {
    if (next === null || disposed) return;
    picture = { url, data: next };
    syncProfile();
  });
}

/** A build with no cloud provider keeps the local client, where an action would record telemetry, and sign-out clear credentials, for an account that does not exist (ONL-2780). */
function accountConfigured(): boolean {
  return capabilities().account && client.snapshot().session !== 'local';
}

function retireAccountIdentity(): void {
  try {
    clearAccountIdentity();
  } catch {
    log('cloud').warn('account identity clear refused', { code: 'identity_version_unsupported' });
  }
}

function syncSession(reported: SessionChange | null): void {
  const signedIn = !sessionEnded && providerIdentity().hasSession();
  if (!signedIn && reported === 'signed-out') retireAccountIdentity();
  // A later session may belong to another account, so the last one named does not carry into it.
  if (!signedIn) { verifiedSubject = undefined; attributedSubject = undefined; }
  client.setSession(signedIn);
  syncProfile();
}

/** A cloud build gates on a session it may have failed to install, so the press behind the gate is what retries it; a press joins the attempt in flight rather than spending one of its own (ONL-2950). */
async function ensureAccountConfigured(): Promise<boolean> {
  if (accountConfigured()) return true;
  if (!capabilities().account) return false;
  if (installing === undefined) {
    if (recoveryPresses >= CLOUD_RECOVERY_PRESSES) return false;
    recoveryPresses += 1;
  }
  await installCloud();
  return accountConfigured();
}

export function registerOnlookHandlers(): void {
  handle(IPC_INVOKE.onlookTeamCommand, async (event, command: unknown) => {
    requireStudioTabSender(event, everyRenderer());
    if (!isTeamCommand(command)) return { ok: false, error: 'invalid-request' };
    const result = await client.teamCommand(command);
    capture('team_command_completed', { operation: command.type, outcome: result.ok ? 'success' : 'refused', error: result.ok ? null : result.error });
    return result;
  });
  handle(IPC_INVOKE.onlookState, (event) => {
    requireStudioTabSender(event, everyRenderer());
    return accountSnapshot();
  });
  handle(IPC_INVOKE.onlookSignIn, async (event, method: unknown) => {
    requireStudioTabSender(event, everyRenderer());
    const pressed = signInMethod(method);
    if (pressed === undefined) return { ok: false, code: 'failed' };
    supersedePending();
    if (!await ensureAccountConfigured()) {
      recordSignInFailure(pressed, 'not_configured');
      return { ok: false, code: 'not_configured' };
    }
    return account.signIn(pressed);
  });
  handle(IPC_INVOKE.onlookSignOut, async (event) => {
    requireStudioTabSender(event, everyRenderer());
    supersedePending();
    if (!accountConfigured()) return { ok: false, code: 'not_configured' };
    return account.signOut();
  });
  handle(IPC_INVOKE.onlookAnswerSurvey, async (event, answer: unknown) => {
    requireStudioTabSender(event, everyRenderer());
    if (!accountConfigured() || !isSurveyAnswer(answer) || accountSnapshot().session !== 'signed-in') return;
    recordSurveyAnswer(answer);
    await client.answerSurvey?.(answer).catch((error: unknown) => {
      log('cloud').warn('survey answer not stored', { code: error instanceof Error ? error.name : 'unknown' });
    });
  });
  handle(IPC_INVOKE.onlookDeleteAccount, (event, expectedEpoch: unknown) => {
    requireStudioTabSender(event, everyRenderer());
    const current = accountSnapshot();
    if (current.session !== 'signed-in' || !Number.isSafeInteger(expectedEpoch) || expectedEpoch !== current.sessionEpoch) return { ok: false, code: 'superseded' };
    // The confirmation named an account, and a record no answer has matched to this session is not it (ONL-2882).
    if (confirmedAccount(current) === null) return { ok: false, code: 'superseded' };
    supersedePending();
    return account.deleteAccount();
  });
}

async function initializeCloud(): Promise<void> {
  if (initialized || disposed || !capabilities().account) return;
  let installed: OnlookClient | undefined;
  const started: (() => void)[] = [];
  try {
    const createClient = proofProvider()?.createOnlookClient ?? await Promise.resolve(createProviderOnlookClient);
    if (disposed) return;
    const prepared = providerIdentity().prepareSession();
    if (prepared === null) return;
    const options = {
      url: prepared.url ?? import.meta.env.MAIN_VITE_CLOUD_URL as string,
      build: cloudBuildForProof() ?? Number(import.meta.env.MAIN_VITE_CLOUD_BUILD),
      onIdentity: completeBrowserSignIn,
      onSignInFailure: noteProviderFailure,
    };
    installed = createClient(options);
    client = installed;
    // Set once a client exists: earlier, a throw from the line above latches a failed install for the launch; later, a retry would leak this client's listeners (ONL-2950).
    initialized = true;
    // The provider's own state carries no revision or session epoch; the snapshot adds both (ONL-2780).
    // Re-entrant: the profile write below publishes, and only the outer tick carries the merged state to renderers.
    let publishing = false;
    unsubscribeState = installed.subscribe(() => {
      if (publishing) return;
      publishing = true;
      try {
        // The server's answer can retire the record as this session's account, so the profile is re-derived here too (ONL-2882).
        syncProfile();
        broadcastToRenderers(IPC_EMIT.onlookState, accountSnapshot());
      } finally {
        publishing = false;
      }
    });
    started.push(unsubscribeState);
    unsubscribeSignIn = providerIdentity().onSignInProgress(() => { accountSnapshot(); });
    started.push(unsubscribeSignIn);
    unsubscribeTokens = providerIdentity().onSessionChanged((change) => syncSession(change ?? 'session'));
    started.push(unsubscribeTokens);
    // Once a launch, over the client of the moment: `onIdentity` keeps no handle to drop, so a retry would add a second (ONL-2950).
    if (!identityObserved) {
      identityObserved = true;
      onIdentity((identity) => {
        launchSession?.supersede();
        sessionEnded = false;
        // A record written here is a fresh sign-in or a typed email, which no earlier answer named.
        verifiedSubject = undefined;
        attributedSubject = undefined;
        client.setSession(false);
        // Only a `provider` record re-reads the session, and a press is a completion only once that reads signed-in (ONL-2950).
        if (identity.source === 'provider') syncSession(null);
      });
    }
    installed.start();
    syncSession(null);
    broadcastToRenderers(IPC_EMIT.onlookState, accountSnapshot());
    const sessionProvider = providerIdentity();
    if (sessionProvider.checkLaunchSession !== undefined && sessionProvider.hasSession()) {
      launchActivity ??= trackLaunchActivity();
      launchSession = createLaunchSessionCheck({
        check: (signal) => sessionProvider.checkLaunchSession!(signal),
        ended(reason) {
          sessionEnded = true;
          const properties = { reason, unopened_ms: launchActivity?.unopenedMs ?? null };
          log('cloud').warn('session ended at launch', properties);
          capture('session_ended_at_launch', properties);
          retireAccountIdentity();
          try {
            sessionProvider.clearSession();
          } catch {
            log('cloud').warn('ended session cleanup failed', { code: 'session_clear' });
          }
          syncSession(null);
          broadcastToRenderers(IPC_EMIT.onlookState, accountSnapshot());
        },
        retry(run) {
          const timer = setTimeout(run, 30_000);
          timer.unref();
          return () => { clearTimeout(timer); };
        },
      });
      void launchSession.start();
    }
  } catch {
    log('cloud').warn('client initialization failed', { code: 'configuration' });
    discardInstall(started, installed);
  }
}

/** Half an install latches a broken launch and leaks what it subscribed, so a failed attempt takes all of it back out (ONL-2950). */
function discardInstall(started: readonly (() => void)[], installed: OnlookClient | undefined): void {
  for (const stop of started) {
    try {
      stop();
    } catch {
      log('cloud').warn('a half-installed listener refused to stop', { code: 'configuration' });
    }
  }
  unsubscribeState = undefined;
  unsubscribeSignIn = undefined;
  unsubscribeTokens = undefined;
  initialized = false;
  if (installed === undefined) return;
  client = createLocalOnlookClient();
  // Asked before the publish below, which can throw through a provider half-loaded, and which would then leave this client open (ONL-2950).
  void closeRetired(installed);
  // The discarded client may already have published its own state, and a renderer holding that reads a session this launch does not have (ONL-2950).
  broadcastToRenderers(IPC_EMIT.onlookState, accountSnapshot());
}

/** Asked to close only once it is out of the way, and never waited for: a transport that never finishes closing would otherwise hold every later retry behind it (ONL-2950). */
async function closeRetired(retired: OnlookClient): Promise<void> {
  try {
    await retired.close();
  } catch {
    log('cloud').warn('a discarded client refused to close', { code: 'configuration' });
  }
}

/** Boot and a press behind the gate both ask; two overlapping calls would each install a client with its own session (ONL-2950). */
function installCloud(): Promise<void> {
  installing ??= initializeCloud().finally(() => { installing = undefined; });
  return installing;
}

export function initializeOnlook(): Promise<void> {
  return capabilities().account ? installCloud() : Promise.resolve();
}

export async function disposeOnlook(): Promise<void> {
  disposed = true;
  launchSession?.dispose();
  launchActivity?.dispose();
  supersedePending();
  unsubscribeTokens?.();
  unsubscribeState?.();
  unsubscribeSignIn?.();
  await client.close();
}

function isSurveyAnswer(value: unknown): value is SurveyAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { question, answer, detail } = value as Record<string, unknown>;
  return typeof question === 'string' && question.length <= 64 && typeof answer === 'string' && answer.length <= 64
    && (detail === undefined || (typeof detail === 'string' && detail.length <= 2000));
}

/** Only a known option key leaves for PostHog; `detail` is the person's own words, so only its presence does (ONL-3259). */
function recordSurveyAnswer({ question, answer, detail }: SurveyAnswer): void {
  if (question === FOUND_US_QUESTION && isFoundUsOption(answer)) {
    capture('onboarding_survey_answered', { question, answer, has_detail: detail !== undefined, $set_once: { found_us: answer } });
  } else if (question === ROLE_QUESTION && isRoleOption(answer)) {
    // `$set`, not `$set_once`: someone who goes Back and changes their role means the new one (ONL-3347).
    capture('onboarding_survey_answered', { question, answer, has_detail: detail !== undefined, $set: { role: answer } });
  }
}
