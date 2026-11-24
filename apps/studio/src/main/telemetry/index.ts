// No key means no-op at every entry point.
// Identification branches on provenance because a PostHog person merge is irreversible: a `'manual'` record gets one `$set` and never switches the distinct id; only a `'provider'` record the provider has named `$identify`s and `$merge_dangerously` at most once per install, marker-guarded.
// Plain `fetch`, no SDK: a runtime dependency here costs an electron-builder and `asarUnpack` review.

import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import { configureLogExport, log, setLogCorrelation } from '../log/index.js';
import { batchGrant, enforceCap, pendingBatches, readBatch, removeBatch, resetOutboxForTesting, writeBatch, type OutboxEvent } from './outbox.js';
import { mintGrant, readGrant } from './grant.js';
import { uuidv7 } from './session-id.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readStateFile, writeStateFile } from '../state/file.js';
import { analyticsChoiceStored, analyticsEnabled, analyticsWithdrawn, storeAnalyticsDefault } from '../settings/state.js';
// A named 'electron' import fails the ESM link check under plain Bun, which the tests run under.
import electron from 'electron';
import { isRecord, verifiedSubject, type ActivationSurfaceReport, type ScrubbedException, type StudioIdentity, type TelemetryConfig } from '@studio/events';
import { markMergeCompleted, readIdentity, readMergeCompleted } from '../identity/store.js';
import { knownProject } from '../workspace/store.js';
import { bindWebAttribution, legacyWebIdOnDisk, markAttributionQueued, parseAttribution, readWebAttribution, retainAttribution, FIRST_TOUCH_PROPERTIES } from './attribution.js';
import { cpuFamily, underRosetta } from './hardware.js';
import { previewFailureDiagnostics, resetPreviewDiagnostics } from './preview-diagnostics.js';
import { isSourceBuild } from './build.js';
import { flagOn, flagSnapshot } from '../flags/index.js';
import { activeLocale } from '@studio/i18n';
import type {
  DeadEndErrorClass,
  DeadEndState,
  LastSurface,
  TelemetryEventName,
  TelemetryProperties,
  TelemetrySuperProperties,
  WorkspaceTelemetryProperties,
} from './events.js';
import { hostPlatform } from '../env/platform.js';
import { devSwitches } from '../env/dev-switches.js';

const DEFAULT_HOST = 'https://us.i.posthog.com';
const logger = log('telemetry');
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_COUNT = 20;

const OS_NAMES: Record<string, string> = {
  darwin: 'Mac OS X',
  win32: 'Windows',
  linux: 'Linux',
};

export interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
  // PostHog's dedupe key: a replayed batch cannot count twice (ONL-2349).
  uuid: string;
  // Queued before any account was named, so whether it rides a person is settled when it drains (ONL-2882).
  accountUnnamed?: true;
}

export interface AppLike {
  getPath(name: 'userData'): string;
  getVersion(): string;
  getLocale(): string;
  isPackaged: boolean;
  readonly runningUnderARM64Translation?: boolean;
}

let appOverride: AppLike | undefined;

function studioApp(): AppLike {
  return appOverride ?? (electron.app as AppLike);
}

let apiKey: string | undefined;
let host = DEFAULT_HOST;
let distinctId: string | undefined;
interface AnonymousIdentity {
  id: string;
  reset: boolean;
  identifiedAs?: string;
  signedOutFrom?: string;
}

let anonymousIdentity: AnonymousIdentity | undefined;
let anonymousIdentityLoaded = false;
let identityRevision = 0;
const identityListeners = new Set<(config: TelemetryConfig) => void>();
let accountDistinctId: string | undefined;
let superProperties: TelemetrySuperProperties | undefined;
let queue: QueuedEvent[] = [];
let hasPerson = false;
let flushTimer: NodeJS.Timeout | undefined;
let sessionStartedAt = 0;

const isEnabled = (): boolean => apiKey !== undefined && !isSilenced();
let consentAbort = new AbortController();
let liveIdentity: StudioIdentity | undefined;

// A write-only ingestion token, public by design.
const PROD_POSTHOG_KEY = 'phc_wLF8xC2EHRnoekML23ZGmF3Mw9uWB56uHRgxTodBcfCs';

function resolveKey(): string | undefined {
  const runtime = devSwitches.posthogKey;
  if (runtime) return runtime;
  const baked = import.meta.env.MAIN_VITE_POSTHOG_KEY;
  if (baked) return baked;
  // A headless launch reaches the baked key only by naming STUDIO_POSTHOG_KEY itself: the shared project takes no verification traffic.
  if (devSwitches.agentHeadless !== undefined) return undefined;
  return studioApp().isPackaged || isSourceBuild() ? PROD_POSTHOG_KEY : undefined;
}

function resolveHost(): string {
  return (devSwitches.posthogHost || DEFAULT_HOST).replace(/\/$/, '');
}

// The memo is load-bearing: resolving persists the id, so a pre-init `telemetry:config` ask would otherwise make init read its own write and report every first launch as a relaunch.
let resolvedInstall: { id: string; isFirstLaunch: boolean } | undefined;

function resolveDistinctId(): { id: string; isFirstLaunch: boolean } {
  if (resolvedInstall !== undefined) return resolvedInstall;
  const path = join(studioApp().getPath('userData'), 'install-id');
  try {
    const file = readStateFile(path, 1);
    if (file.kind === 'future') {
      resolvedInstall = { id: randomUUID(), isFirstLaunch: false };
      return resolvedInstall;
    }
    const existing = file.kind === 'data' && typeof file.data === 'string' ? file.data : undefined;
    if (existing) {
      resolvedInstall = { id: existing, isFirstLaunch: false };
      return resolvedInstall;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      try {
        const existing = readFileSync(path, 'utf8').trim();
        if (existing && !existing.startsWith('{') && !existing.startsWith('[')) {
          resolvedInstall = { id: existing, isFirstLaunch: false };
          return resolvedInstall;
        }
      } catch {
        resolvedInstall = { id: randomUUID(), isFirstLaunch: false };
        return resolvedInstall;
      }
    }
    // First launch, or userData is not writable; both fall through.
  }
  const id = randomUUID();
  try {
    writeStateFile(path, 1, id);
  } catch {
    // Unwritable userData means a fresh id every launch.
  }
  resolvedInstall = { id, isFirstLaunch: true };
  return resolvedInstall;
}

function isAnonymousIdentity(value: unknown): value is AnonymousIdentity {
  if (typeof value !== 'object' || value === null) return false;
  const stored = value as Partial<AnonymousIdentity>;
  return typeof stored.id === 'string' && stored.id.length > 0
    && typeof stored.reset === 'boolean'
    && (stored.identifiedAs === undefined || typeof stored.identifiedAs === 'string')
    && (stored.signedOutFrom === undefined || typeof stored.signedOutFrom === 'string');
}

function anonymousDistinctId(): string {
  if (isSourceBuild()) return `source:${resolveDistinctId().id}`;
  if (anonymousIdentity !== undefined) return anonymousIdentity.id;
  if (anonymousIdentityLoaded) return initialAnonymousDistinctId();
  anonymousIdentityLoaded = true;
  try {
    const file = readStateFile(join(studioApp().getPath('userData'), 'telemetry-anonymous-id'), 1);
    if (file.kind !== 'missing') {
      const stored = file.kind === 'data' ? file.data : null;
      anonymousIdentity = isAnonymousIdentity(stored)
        ? { id: stored.id, reset: stored.reset,
          ...(stored.identifiedAs === undefined ? {} : { identifiedAs: stored.identifiedAs }),
          ...(stored.signedOutFrom === undefined ? {} : { signedOutFrom: stored.signedOutFrom }) }
        : { id: randomUUID(), reset: true };
      if (anonymousIdentity.id === readWebAttribution()?.legacyWebId) {
        persistAnonymousIdentity({ id: randomUUID(), reset: true });
      }
      if (anonymousIdentity.identifiedAs !== undefined && anonymousIdentity.identifiedAs !== verifiedSubject(readIdentity())) {
        persistAnonymousIdentity({ id: randomUUID(), reset: true });
      }
    }
  } catch {
    anonymousIdentity = { id: randomUUID(), reset: true };
  }
  if (anonymousIdentity !== undefined) {
    return anonymousIdentity.id;
  }
  return initialAnonymousDistinctId();
}

function initialAnonymousDistinctId(): string {
  return resolveDistinctId().id;
}

function persistAnonymousIdentity(identity: AnonymousIdentity): boolean {
  anonymousIdentity = identity;
  try {
    return writeStateFile(join(studioApp().getPath('userData'), 'telemetry-anonymous-id'), 1, identity);
  } catch {
    logger.warn('anonymous identity persistence failed');
    return false;
  }
}

/** The anonymous id this launch's account has taken, which the recorder reads to tell its own install's person from one some other launch left behind (ONL-2882). */
function linkableAnonymousId(): string | undefined {
  if (accountDistinctId === undefined) return undefined;
  const id = anonymousDistinctId();
  return anonymousIdentity?.identifiedAs === accountDistinctId ? id : undefined;
}

/** Any other link would merge the wrong person. */
function anonymousBelongsTo(subject: string): boolean {
  if (anonymousIdentity === undefined) return initialAnonymousBelongsTo(subject);
  if (anonymousIdentity.identifiedAs !== undefined) return anonymousIdentity.identifiedAs === subject;
  return !anonymousIdentity.reset || anonymousIdentity.signedOutFrom === subject;
}

function initialAnonymousBelongsTo(subject: string): boolean {
  try {
    const file = readStateFile(join(studioApp().getPath('userData'), 'telemetry-anonymous-id'), 1);
    if (file.kind === 'missing') return true;
    if (file.kind !== 'data' || !isAnonymousIdentity(file.data)) return false;
    const owner = file.data.identifiedAs ?? file.data.signedOutFrom;
    return owner === undefined || owner === subject;
  } catch {
    return false;
  }
}

/** The stored record claims an account the provider has not named, so nothing yet says whose session this is (ONL-2882). */
let accountUnnamed = false;

// An id no account can own: never persisted, so it cannot already be a person.
function unownedDistinctId(): string {
  return launchId ?? randomUUID();
}

/** The wait for the provider ends at the first flush, and what is queued then goes out under an id no account owns (ONL-2882). */
function settleAttribution(): void {
  if (!accountUnnamed || distinctId !== undefined) return;
  distinctId = unownedDistinctId();
  publishCorrelation();
  announceTelemetryIdentity();
}

// The one door a repo identity takes into telemetry; the identity itself never ships.
export function workspaceTelemetryId(repoIdentity: string): string {
  return createHash('sha256').update(repoIdentity).digest('hex').slice(0, 16);
}

export function workspaceTelemetryProperties(repoIdentity: string): WorkspaceTelemetryProperties {
  return {
    project_id: workspaceTelemetryId(repoIdentity),
    workspace_instance_id: createHash('sha256').update(resolveDistinctId().id + repoIdentity).digest('hex').slice(0, 16),
  };
}

export function resolveWorkspaceTelemetryProperties(workspacePath: string): WorkspaceTelemetryProperties | undefined {
  const workspace = knownProject(workspacePath);
  return workspace === undefined ? undefined : workspaceTelemetryProperties(workspace.repoIdentity);
}

// The Workspace's repo identity hashed, not the project's path: hashing the path would mint one id per project (ONL-1829).
export function resolveWorkspaceTelemetryId(workspacePath: string): string | undefined {
  const workspace = knownProject(workspacePath);
  return workspace === undefined ? undefined : workspaceTelemetryId(workspace.repoIdentity);
}

let initialized = false;
let prepared = false;
let launchId: string | undefined;
let sessionId: string | undefined;
let releaseChannel = 'dev';
let install: { id: string; isFirstLaunch: boolean } | undefined;

// `STUDIO_TELEMETRY_HEADLESS=1` is the one door a never-shown launch may emit through (ONL-2356).
export function headlessTelemetryAllowed(): boolean {
  return devSwitches.telemetryHeadless === '1';
}

function isSilenced(): boolean {
  if (!analyticsEnabled()) return true;
  if (devSwitches.telemetry === '0') return true;
  return devSwitches.agentHeadless !== undefined && !headlessTelemetryAllowed();
}

function resolveReleaseChannel(): string {
  if (!studioApp().isPackaged) return 'dev';
  try {
    const raw = readFileSync(join(process.resourcesPath, 'app-update.yml'), 'utf8');
    return raw.match(/^channel:\s*(\S+)/m)?.[1] ?? 'latest';
  } catch {
    // No `app-update.yml` in the bundle; a packaged build without one is on `latest`.
    return 'latest';
  }
}

export interface Correlation {
  installId: string;
  launchId: string;
  sessionId: string;
  distinctId: string;
  appVersion: string;
  releaseChannel: string;
}

function publishCorrelation(): void {
  const current = correlation();
  if (current !== undefined) setLogCorrelation(current);
}

export function correlation(): Correlation | undefined {
  if (launchId === undefined || sessionId === undefined || install === undefined) return undefined;
  return {
    installId: install.id,
    launchId,
    sessionId,
    distinctId: distinctId ?? install.id,
    appVersion: studioApp().getVersion(),
    releaseChannel,
  };
}

function buildSuperProperties(launch: string): TelemetrySuperProperties {
  return {
    app_version: studioApp().getVersion(),
    electron_version: process.versions.electron ?? 'unknown',
    chrome_version: process.versions.chrome ?? 'unknown',
    platform: 'desktop',
    $os: OS_NAMES[hostPlatform()] ?? hostPlatform(),
    $lib: 'studio-desktop',
    arch: process.arch,
    under_rosetta: underRosetta(studioApp()),
    cpu_family: cpuFamily(os.cpus()[0]?.model),
    is_packaged: studioApp().isPackaged,
    build_kind: isSourceBuild() ? 'source' : 'official',
    launch_id: launch,
    release_channel: releaseChannel,
  };
}

export function prepareTelemetry(): void {
  if (prepared) return;
  prepared = true;

  install = resolveDistinctId();
  const launch = uuidv7();
  launchId = launch;
  sessionId = launch;
  releaseChannel = resolveReleaseChannel();
  sessionStartedAt = Date.now();
  publishCorrelation();

  activateTelemetry();
}

function activateTelemetry(): void {
  if (isSilenced()) {
    // Only an explicit withdrawal clears the outbox; a preference that could not be read leaves it for a launch that can (ONL-2904).
    if (analyticsWithdrawn()) {
      for (const path of pendingBatches()) removeBatch(path);
    }
    return;
  }

  apiKey = resolveKey();
  if (!isEnabled()) {
    logger.info('no key — analytics is a no-op; set MAIN_VITE_POSTHOG_KEY in .env to enable');
    return;
  }

  host = resolveHost();
  const identity = readIdentity();
  // Loads the anonymous identity, which `anonymousBelongsTo` reads to decide whether an account may be linked to it.
  anonymousDistinctId();
  // The record only claims an account; until the provider answers for it the queue waits with no id, so no event, link or merge is attributed to it (ONL-2882).
  accountUnnamed = !isSourceBuild() && verifiedSubject(identity) !== undefined;
  distinctId = accountUnnamed ? undefined : anonymousDistinctId();
  // Server-side capture is person-processed by default, so a stable anonymous distinct id is not anonymous: events opt out (`$process_person_profile: false`) until an identity exists.
  hasPerson = !isSourceBuild() && identity !== null;
  publishCorrelation();
  if (!isSourceBuild()) configureLogExport({ key: apiKey!, host });

  superProperties = buildSuperProperties(launchId!);

  applyWebAttribution();

  logger.info('on', { host });

  void replayPending();

  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  flushTimer.unref?.();
}

export function receiveWebAttribution(params: URLSearchParams): void {
  if (!analyticsEnabled() || isSourceBuild()) return;
  const incoming = parseAttribution(params);
  if (incoming === undefined) return;
  const existing = readWebAttribution();
  if (existing !== undefined && existing.attribution.phId !== incoming.phId) return;
  retainAttribution(params);
  applyWebAttribution();
}

function applyWebAttribution(): void {
  if (isSourceBuild()) return;
  if (!isEnabled() || distinctId === undefined || accountUnnamed) return;
  const record = readWebAttribution();
  if (record === undefined) return;
  if (record.boundTo !== undefined && record.boundTo !== accountDistinctId) return;
  if (accountDistinctId !== undefined && !bindWebAttribution(accountDistinctId)) return;
  const link = flagOn('web-attribution-link');
  if (record.linked || (!link && record.queued)) return;
  // The receipt is written before the push: an unwritable disk means no link, never two counted ones.
  if (!markAttributionQueued(link)) {
    logger.warn('attribution receipt write failed — link not queued');
    return;
  }
  const properties = { website_person_id: record.attribution.phId, ...record.attribution.firstTouch };
  if (link) {
    push('$set', { $set_once: properties });
    pushMapped('web_attribution_linked', { ...properties, $process_person_profile: true });
  } else {
    pushMapped('web_attribution_candidate', { ...properties, $process_person_profile: false });
  }
  const drain = drainQueue();
  if (drain === undefined) return;
  void drain.send();
}

export type BootOutcome = 'reported' | 'timeout' | 'renderer-gone';

// Once per launch: `ready-to-show` fires again for every window the dock reopens.
export function noteAppShown(options: { startupMs?: number; bootOutcome?: BootOutcome; flagWaitMs?: number } = {}): void {
  if (initialized) return;
  initialized = true;
  prepareTelemetry();
  if (!isEnabled() || install === undefined) return;
  capture('app_opened', {
    startup_ms: options.startupMs,
    is_first_launch: install.isFirstLaunch,
    locale: studioApp().getLocale(),
    ui_language: activeLocale() ?? 'en',
    flag_wait_ms: options.flagWaitMs,
    ...(options.bootOutcome === undefined ? {} : { boot_outcome: options.bootOutcome }),
  });
  const identity = readIdentity();
  // Only a typed email identifies from disk: an account the provider has not named is not known to be this session's (ONL-2882).
  if (identity !== null && identity.source !== 'provider') identifyPerson(identity);
}

export function initTelemetry(options: { startupMs?: number; bootOutcome?: BootOutcome } = {}): void {
  prepareTelemetry();
  noteAppShown(options);
}

export function refreshTelemetryConsent(): void {
  consentAbort.abort();
  consentAbort = new AbortController();
  if (flushTimer !== undefined) clearInterval(flushTimer);
  flushTimer = undefined;
  configureLogExport(undefined);
  queue = [];
  // A grant resolved before the move authorizes nothing written after it (ONL-2904).
  grantForLaunch = undefined;
  for (const path of pendingBatches()) removeBatch(path);
  apiKey = undefined;
  sentIdentity = undefined;
  if (prepared) activateTelemetry();
  else prepareTelemetry();
  const identity = liveIdentity ?? readIdentity();
  if (identity !== null && identity !== undefined && (identity.source !== 'provider' || liveIdentity !== undefined)) identifyPerson(identity);
  announceTelemetryIdentity();
}

export function telemetryConsentSignal(): AbortSignal | undefined {
  return analyticsEnabled() ? consentAbort.signal : undefined;
}

export function telemetryRequestsAllowed(): boolean {
  return !isSilenced();
}

export function telemetryHost(): string {
  return resolveHost();
}

// `null` returns to the launch id, never to nothing: a stale id joins later events to a recording that does not hold them.
export function adoptSessionId(reported: string | null): void {
  if (launchId === undefined) return;
  sessionId = reported ?? launchId;
  publishCorrelation();
}

export function currentSessionId(): string | undefined {
  return sessionId;
}

let sentIdentity: { email: string; source: string; subject: string | undefined } | undefined;

/** The person property keeps the value every earlier build sent, so one person's history does not split on a rename. */
const IDENTITY_SOURCE_PROPERTY = { provider: 'workos', manual: 'manual' } as const;

export function onTelemetryIdentityChanged(listener: (config: TelemetryConfig) => void): () => void {
  identityListeners.add(listener);
  return () => { identityListeners.delete(listener); };
}

function announceTelemetryIdentity(): void {
  identityRevision += 1;
  if (identityListeners.size === 0) return;
  const config = currentTelemetryConfig();
  for (const listener of identityListeners) listener(config);
}

export function resetTelemetryIdentity(): void {
  const previousAccount = accountDistinctId ?? anonymousIdentity?.identifiedAs;
  if (previousAccount === undefined && !hasPerson && !accountUnnamed) {
    liveIdentity = undefined;
    return;
  }
  rotateTelemetryIdentity(previousAccount);
}

function rotateTelemetryIdentity(signedOutFrom?: string): void {
  liveIdentity = undefined;
  settleAttribution();
  // Cleared before the flush: a launch that named no account is not this fresh person's to absorb (ONL-2882).
  accountUnnamed = false;
  void flush();
  const next = { id: randomUUID(), reset: true, ...(signedOutFrom === undefined ? {} : { signedOutFrom }) };
  persistAnonymousIdentity(next);
  distinctId = isEnabled() ? next.id : undefined;
  accountDistinctId = undefined;
  sentIdentity = undefined;
  hasPerson = false;
  sessionId = uuidv7();
  publishCorrelation();
  announceTelemetryIdentity();
}

export function identifyPerson(identity: StudioIdentity): void {
  if (isSourceBuild()) return;
  liveIdentity = identity;
  if (!isEnabled()) return;
  const nextSubject = verifiedSubject(identity);
  // A named account takes the waiting queue itself; any other answer only releases it (ONL-2882).
  if (nextSubject === undefined) settleAttribution();
  accountUnnamed = false;
  if ((accountDistinctId !== undefined && nextSubject !== accountDistinctId)
    || (nextSubject !== undefined && accountDistinctId === undefined && !anonymousBelongsTo(nextSubject))) rotateTelemetryIdentity();
  hasPerson = true;
  if (
    sentIdentity !== undefined &&
    sentIdentity.email === identity.email &&
    sentIdentity.source === identity.source &&
    sentIdentity.subject === identity.subject
  ) {
    applyWebAttribution();
    return;
  }
  // Only the verified door's record switches the distinct id or reaches the merge; a hand-edited external id on a manual record cannot trigger an irreversible merge.
  if (nextSubject !== undefined) {
    identifyAccountPerson(identity, nextSubject);
  } else {
    enqueue('$set', { $set: { email: identity.email, identity_source: IDENTITY_SOURCE_PROPERTY[identity.source] } });
  }
  sentIdentity = {
    email: identity.email,
    source: identity.source,
    subject: identity.subject,
  };
  liveIdentity = identity;
  applyWebAttribution();
  if (nextSubject !== undefined) announceTelemetryIdentity();
}

function identifyAccountPerson(identity: StudioIdentity, subject: string): void {
  const anonymous = anonymousIdentity ?? { id: resolveDistinctId().id, reset: false };
  const canLink = persistAnonymousIdentity({ ...anonymous, identifiedAs: subject });
  if (!canLink) rotateTelemetryIdentity();
  if (distinctId !== subject) {
    // A batch is stamped with one distinct id at flush time, so a mid-session sign-in's earlier events drain under the id they were captured on. `flush` reaches that drain before its first await.
    void flush();
    distinctId = subject;
    publishCorrelation();
  }
  // Set after the drain above, never before: an event held while no account owned the launch rides no person only while this is unset (ONL-2882).
  accountDistinctId = subject;
  hasPerson = true;
  push('$identify', {
    ...(canLink ? { $anon_distinct_id: anonymous.id } : {}),
    $set: { email: identity.email, identity_source: IDENTITY_SOURCE_PROPERTY[identity.source] },
  });
  if (identity.previousSubject !== undefined && !anonymous.reset && !readMergeCompleted()) {
    try {
      // The marker is written before the push: an unwritable disk means no merge, never one merge per launch.
      markMergeCompleted();
      push('$merge_dangerously', { alias: identity.previousSubject });
    } catch {
      logger.warn('merge marker write failed — merge not queued');
    }
  }
  if (queue.length >= FLUSH_AT_COUNT) void flush();
}

export function currentDistinctId(): string | undefined {
  return distinctId;
}

export function launchIsFirst(): boolean | undefined {
  return install?.isFirstLaunch;
}

// The one derivation, so a keyless or switched-off pipeline disables replay too.
export function currentTelemetryConfig(): TelemetryConfig {
  if (isSourceBuild() || isSilenced()) return { enabled: false };
  const key = resolveKey();
  if (key === undefined) return { enabled: false };
  // The renderer can ask before the window exists; the id it bootstraps must be the launch's.
  prepareTelemetry();

  const live = currentDistinctId();
  // No live id means no account has been named yet, and a replay bootstrapped from the record's would record this session as an account that may not be its (ONL-2882).
  const id = live ?? unownedDistinctId();
  const identified = live !== undefined && live === accountDistinctId;
  const linkable = identified ? linkableAnonymousId() : undefined;
  const perfWindowMs = perfWindowOverride();
  return {
    enabled: true,
    key,
    host: resolveHost(),
    sessionId: sessionId ?? uuidv7(),
    identityRevision,
    distinctId: id,
    isIdentified: identified,
    ...(identified || id === anonymousDistinctId() ? {} : { unowned: true as const }),
    ...(linkable === undefined ? {} : { linkableAnonymousId: linkable }),
    ...(perfWindowMs === undefined ? {} : { perfWindowMs }),
  };
}

export function perfWindowOverride(): number | undefined {
  if (studioApp().isPackaged) return undefined;
  const value = Number(devSwitches.perfWindowMs);
  return Number.isSafeInteger(value) && value >= 1_000 ? value : undefined;
}

let previewDiagnosticsRestorer: ((cwd: string, port: number) => void) | undefined;

export function setPreviewDiagnosticsRestorer(restore: ((cwd: string, port: number) => void) | undefined): void {
  previewDiagnosticsRestorer = restore;
}

export function capture<N extends TelemetryEventName>(
  event: N,
  properties: TelemetryProperties<N>,
  workspacePath?: string,
): boolean {
  if (!isEnabled()) return false;
  if (event === 'dead_end_shown' && 'state' in properties && properties.state === 'preview_failed' && workspacePath !== undefined && 'server_port' in properties && typeof properties.server_port === 'number') {
    previewDiagnosticsRestorer?.(workspacePath, properties.server_port);
  }
  enqueue(event, { ...envelope(), ...previewFailureDiagnostics(event, properties, workspacePath), ...properties });
  return true;
}

function featureProperties(): Record<`$feature/${string}`, boolean> {
  const flags = flagSnapshot();
  if (flags === undefined) return {};
  return Object.fromEntries(Object.entries(flags).map(([key, value]) => [`$feature/${key}`, value]));
}

// Identity events are bare: PostHog's reserved shapes carry nothing of ours.
function envelope(): Record<string, unknown> {
  return {
    ...superProperties,
    ...featureProperties(),
    ...(sessionId === undefined ? {} : { $session_id: sessionId }),
    ...(hasPerson ? {} : { $process_person_profile: false }),
  };
}

function push(event: string, properties: Record<string, unknown>): void {
  queue.push({ event, properties, timestamp: new Date().toISOString(), uuid: randomUUID(), ...(accountUnnamed ? { accountUnnamed: true } : {}) });
}

/** `capture` queues and may flush; a caller that owns its own drain still gets the event map checked. */
function pushMapped<N extends TelemetryEventName>(event: N, properties: TelemetryProperties<N>): void {
  push(event, { ...envelope(), ...properties });
}

function enqueue(event: string, properties: Record<string, unknown>): void {
  push(event, properties);
  if (queue.length >= FLUSH_AT_COUNT) void flush();
}

// `$exception` is a reserved shape, so it is not in `events.ts`; takes an already-scrubbed report from `errors/index.ts`, the one caller.
export function captureException(exception: ScrubbedException, extra: Record<string, unknown> = {}): void {
  if (isSourceBuild()) return;
  if (!isEnabled()) return;
  enqueue('$exception', {
    ...envelope(),
    ...extra,
    $exception_list: [exception],
    $exception_type: exception.type,
    $exception_message: exception.value,
  });
}

export function recordProjectRenamed(workspacePath: string, by: 'agent' | 'user'): void {
  const workspace = resolveWorkspaceTelemetryProperties(workspacePath);
  if (workspace === undefined) return;
  capture('project_renamed', { ...workspace, by });
}

export function recordAgentCost(properties: TelemetryProperties<'agent_cost_recorded'>): void {
  capture('agent_cost_recorded', properties);
}

// 408 and 429 are the two 4xx PostHog means "not now".
function isTerminal(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

// A refused merge never retries (the marker is already written), so the persons stay split; the alias value is never logged.
function warnIfMergeRefused(batch: readonly OutboxEvent[]): void {
  if (!batch.some((event) => event.event === '$merge_dangerously')) return;
  logger.warn('merge batch dropped — persons remain split (marker already written)');
}

type SendOutcome = 'sent' | 'refused' | 'retry';

const SEND_TIMEOUT_MS = 10_000;

function withoutLegacyWebAttribution(batch: readonly OutboxEvent[]): readonly OutboxEvent[] {
  const webId = readWebAttribution()?.legacyWebId ?? legacyWebIdOnDisk();
  if (webId === undefined) return batch;
  return batch.flatMap((event) => {
    const properties = event.properties;
    if (event.distinct_id === webId
      || (event.event === '$identify' && properties['$anon_distinct_id'] === webId)
      || (event.event === '$create_alias' && properties['alias'] === webId)
      || (event.event === '$merge_dangerously' && (properties['alias'] === webId || (Array.isArray(properties['distinct_ids']) && properties['distinct_ids'].includes(webId))))) return [];
    const once = properties['$set_once'];
    // Only this build writes `website_person_id`, so a `$set_once` carrying it is a link, never the legacy merge's first-touch write (ONL-3080).
    if (event.event !== '$set' || !isRecord(once) || Array.isArray(once) || 'website_person_id' in once) return [event];
    const kept = Object.fromEntries(Object.entries(once).filter(([key]) => !FIRST_TOUCH_PROPERTIES.includes(key)));
    if (Object.keys(kept).length > 0) return [{ ...event, properties: { ...properties, $set_once: kept } }];
    const { $set_once: _discarded, ...remaining } = properties;
    return Object.keys(remaining).length === 0 ? [] : [{ ...event, properties: remaining }];
  });
}

// Status code only reaches the log; the body and the URL do not.
// The timeout is load-bearing: a connection that never answers holds `replayInFlight` for the life of the process and every later flush short-circuits on it.
async function send(batch: readonly OutboxEvent[]): Promise<SendOutcome> {
  if (!isEnabled()) return 'refused';
  if (isSourceBuild() && batch.some((event) => !event || typeof event.event !== 'string' || event.properties?.build_kind !== 'source' || event.event.startsWith('$') || event.event === 'report_submitted')) return 'refused';
  const safeBatch = withoutLegacyWebAttribution(batch);
  if (safeBatch.length === 0) return 'sent';
  try {
    const response = await fetch(`${host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, historical_migration: false, batch: safeBatch }),
      signal: AbortSignal.any([consentAbort.signal, AbortSignal.timeout(SEND_TIMEOUT_MS)]),
    });
    if (response.ok) return 'sent';
    const terminal = isTerminal(response.status);
    logger.warn(terminal ? 'flush rejected — events dropped' : 'flush rejected — events kept for retry', { status: response.status, events: batch.length });
    return terminal ? 'refused' : 'retry';
  } catch {
    // The error itself is not logged: it can carry the URL.
    logger.warn('flush failed — events kept for retry', { events: batch.length });
    return 'retry';
  }
}

let replayInFlight: Promise<void> | undefined;
let grantForLaunch: string | undefined;

/** The grant every batch this launch may send carries, memoized so a later mint cannot orphan a batch already written under it (ONL-2904). */
function consentGrant(): string | undefined {
  if (!analyticsEnabled()) return undefined;
  if (grantForLaunch !== undefined) return grantForLaunch;
  // A grant the file records no choice for cannot say no withdrawal followed it, so this launch mints instead (ONL-2904).
  grantForLaunch = analyticsChoiceStored() ? readGrant() ?? mintGrant() : mintGrant();
  // After the mint landed: a choice recorded over a failed mint would vouch for the old grant (ONL-2904).
  if (grantForLaunch !== undefined) storeAnalyticsDefault();
  return grantForLaunch;
}

async function runReplay(paths: readonly string[]): Promise<void> {
  const consent = consentAbort;
  const grant = consentGrant();
  // Without a grant nothing on disk may be sent, so the replay leaves the outbox to a launch that has one (ONL-2904).
  if (grant === undefined) return;
  for (const path of paths) {
    if (consent.signal.aborted || !isEnabled()) return;
    // A batch written under any other grant is never sent, however the erase its withdrawal attempted went (ONL-2904).
    if (batchGrant(path) !== grant) {
      removeBatch(path);
      continue;
    }
    const batch = readBatch(path);
    if (batch === undefined) {
      removeBatch(path);
      continue;
    }
    const outcome = await send(batch);
    if (outcome === 'retry') return;
    if (outcome === 'refused') warnIfMergeRefused(batch);
    removeBatch(path);
  }
}

async function replayPending(paths: readonly string[] = pendingBatches()): Promise<void> {
  if (!isEnabled()) return;
  // A loop, not an `if`: with two checks the third of three overlapping callers holds the second's promise and reports a drain that did not happen (ONL-2343).
  while (replayInFlight !== undefined) await replayInFlight;
  if (!isEnabled()) return;
  replayInFlight = runReplay(paths);
  try {
    await replayInFlight;
  } finally {
    replayInFlight = undefined;
  }
}

// `persisted` is the disk answer, available before the send it hands back runs: a caller that needs durability takes it and leaves the sending undetained (ONL-2350).
type QueueDrain =
  | { persisted: true; send: () => Promise<void> }
  | { persisted: false; send: () => Promise<SendOutcome> };

function drainQueue(): QueueDrain | undefined {
  if (queue.length === 0 || distinctId === undefined || launchId === undefined) return undefined;
  const id = distinctId;
  // An event the launch held rides a person only if one was named before it drained; otherwise its id belongs to nobody, and a person there would be nobody's (ONL-2882).
  const stillUnnamed = accountDistinctId === undefined;
  const batch: OutboxEvent[] = queue.map(({ accountUnnamed: held, ...event }) => ({
    ...event,
    distinct_id: id,
    properties: held === true && stillUnnamed ? { ...event.properties, $process_person_profile: false } : event.properties,
  }));
  queue = [];
  const grant = consentGrant();
  // Never written down without one: a batch on disk outlives this launch, and only its own grant authorizes it later (ONL-2904).
  const path = grant === undefined ? undefined : writeBatch(launchId, batch, grant);
  if (path === undefined) {
    return {
      persisted: false,
      send: async () => {
        const outcome = await send(batch);
        if (outcome === 'refused') warnIfMergeRefused(batch);
        return outcome;
      },
    };
  }
  const { kept, dropped, droppedBatches } = enforceCap(pendingBatches());
  if (dropped > 0) logger.warn('outbox over its cap — oldest events dropped', { events: dropped });
  for (const evicted of droppedBatches) warnIfMergeRefused(evicted);
  return { persisted: true, send: () => replayPending(kept) };
}

// Written to the outbox before the POST, removed only once PostHog took it or refused it for good (ONL-2349).
export async function flush(): Promise<void> {
  if (!isEnabled()) return;
  settleAttribution();
  const drain = drainQueue();
  if (drain === undefined) {
    await replayPending();
    return;
  }
  await drain.send();
}

export type DurableOutcome = 'queued' | 'sent' | 'lost' | 'disabled';

// Answers from the write, never from the POST: `flush` awaits a replay of every pending batch in turn, and the quit drain caps the whole teardown chain (ONL-2350).
// `push`, not `enqueue`: a count-triggered flush would carry this event in an earlier batch than the one this call writes.
export async function captureDurable<N extends TelemetryEventName>(
  event: N,
  properties: TelemetryProperties<N>,
): Promise<DurableOutcome> {
  if (isSourceBuild() && event === 'report_submitted') return 'disabled';
  if (!isEnabled()) return 'disabled';
  // An event the caller needs on disk now ends the wait for the provider (ONL-2882).
  settleAttribution();
  push(event, { ...envelope(), ...properties });
  const drain = drainQueue();
  if (drain === undefined) return 'disabled';
  if (drain.persisted) {
    void drain.send();
    return 'queued';
  }
  return (await drain.send()) === 'sent' ? 'sent' : 'lost';
}

let lastSurface: LastSurface = 'setup';
let visibleRenderer: number | undefined;
let surfaceFrozen = false;
const surfaces = new Map<number, ActivationSurfaceReport>();
type ShownDeadEnd = NonNullable<ActivationSurfaceReport['dead_end']> & { project_id: string | undefined };
const shownDeadEnds = new Map<number, ShownDeadEnd | undefined>();
/** Until `setTelemetryRendererWorkspace` runs, no renderer holds a Project and a dead end carries no `project_id`. */
let workspaceOfRenderer: (renderer: number) => string | undefined = () => undefined;

export function setTelemetryRendererWorkspace(locate: (renderer: number) => string | undefined): void {
  workspaceOfRenderer = locate;
}

export function beginTelemetryQuit(): void {
  surfaceFrozen = true;
}

export function recordDeadEndShown(state: DeadEndState, errorClass?: DeadEndErrorClass, projectId?: string, context: { cover?: NonNullable<ActivationSurfaceReport['dead_end']>['cover']; server_port?: number; workspacePath?: string } = {}): void {
  capture('dead_end_shown', {
    state,
    ...(errorClass === undefined ? {} : { error_class: errorClass }),
    ...(projectId === undefined ? {} : { project_id: projectId }),
    ...(context.cover === undefined ? {} : { cover: context.cover }),
    ...(context.server_port === undefined ? {} : { server_port: context.server_port }),
  }, context.workspacePath);
}

function rendererProjectId(renderer: number): string | undefined {
  const workspacePath = workspaceOfRenderer(renderer);
  return workspacePath === undefined ? undefined : resolveWorkspaceTelemetryId(workspacePath);
}

function sameDeadEnd(left: ShownDeadEnd | undefined, right: ShownDeadEnd): boolean {
  return left?.state === right.state && left.error_class === right.error_class && left.project_id === right.project_id && left.cover === right.cover && left.server_port === right.server_port;
}

/** Sent when what the tab shows differs from what it last showed the person; bringing the tab back alone sends nothing (ONL-3260). */
function showSurface(renderer: number, report: ActivationSurfaceReport): void {
  lastSurface = report.surface;
  const deadEnd = report.dead_end === undefined ? undefined : { ...report.dead_end, project_id: rendererProjectId(renderer) };
  const shown = shownDeadEnds.get(renderer);
  shownDeadEnds.set(renderer, deadEnd);
  if (deadEnd === undefined || sameDeadEnd(shown, deadEnd)) return;
  recordDeadEndShown(deadEnd.state, deadEnd.error_class, deadEnd.project_id, { cover: deadEnd.cover, server_port: deadEnd.server_port, workspacePath: workspaceOfRenderer(renderer) });
}

export function recordActivationSurface(renderer: number, report: ActivationSurfaceReport): void {
  if (surfaceFrozen) return;
  surfaces.set(renderer, report);
  if (visibleRenderer === renderer) showSurface(renderer, report);
}

export function showTelemetryRenderer(renderer: number): void {
  if (surfaceFrozen) return;
  if (visibleRenderer === renderer) return;
  visibleRenderer = renderer;
  const report = surfaces.get(renderer);
  if (report !== undefined) showSurface(renderer, report);
}

export function forgetTelemetryRenderer(renderer: number): void {
  surfaces.delete(renderer);
  shownDeadEnds.delete(renderer);
  if (visibleRenderer === renderer) visibleRenderer = undefined;
}

export async function shutdownTelemetry(): Promise<void> {
  if (!isEnabled()) return;
  if (flushTimer) clearInterval(flushTimer);
  const duration_ms = Date.now() - sessionStartedAt;
  capture('app_closed', {
    duration_ms,
    session_duration_seconds: Math.round(duration_ms / 1000),
    last_surface: lastSurface,
  });
  await flush();
}

export function setAppForTesting(impl: AppLike | undefined): void {
  appOverride = impl;
}

export function peekQueueForTesting(): readonly QueuedEvent[] {
  return [...queue];
}

export function resetTelemetryForTesting(): void {
  previewDiagnosticsRestorer = undefined;
  resetPreviewDiagnostics();
  consentAbort.abort();
  consentAbort = new AbortController();
  liveIdentity = undefined;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = undefined;
  initialized = false;
  prepared = false;
  replayInFlight = undefined;
  grantForLaunch = undefined;
  resetOutboxForTesting();
  launchId = undefined;
  sessionId = undefined;
  install = undefined;
  releaseChannel = 'dev';
  apiKey = undefined;
  host = DEFAULT_HOST;
  distinctId = undefined;
  accountUnnamed = false;
  anonymousIdentity = undefined;
  anonymousIdentityLoaded = false;
  identityRevision = 0;
  accountDistinctId = undefined;
  resolvedInstall = undefined;
  superProperties = undefined;
  queue = [];
  sentIdentity = undefined;
  hasPerson = false;
  sessionStartedAt = 0;
  lastSurface = 'setup';
  visibleRenderer = undefined;
  surfaceFrozen = false;
  surfaces.clear();
  shownDeadEnds.clear();
  workspaceOfRenderer = () => undefined;
}
