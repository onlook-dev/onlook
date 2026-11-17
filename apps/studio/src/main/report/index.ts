import { handle } from '../ipc/bridge.js';
import { IPC_INVOKE, reportImageError, REPORT_IMAGE_MAX_EDGE, REPORT_IMAGE_MAX_PIXELS, type ReportSubmitOutcome, type ReportProviderRequest, type ReportFiled, type ReportImage, type StudioIdentity } from '@studio/events';
import { hasOnlookSession } from '../cloud/access.js';
import { log } from '../log/index.js';
import { readIdentity } from '../identity/store.js';
import { captureDurable, correlation, type DurableOutcome } from '../telemetry/index.js';
import { composeReport, type ReportProperties } from './payload.js';
import { reportProvider } from './provider.js';
import { electronImageOps } from '../canvas/thumbnail/compose.js';
import { requireStudioTabSender } from '../tabs/sender.js';
import { everyRenderer } from '../window/host.js';
import { ReportSubmissionError } from '../cloud/client.js';

/** The channel is reachable without the form, so one launch's volume is bounded here (ONL-2350). */
export const REPORTS_PER_LAUNCH = 20;
export const MIN_REPORT_INTERVAL_MS = 3_000;

export interface ReportDeps {
  capture: (properties: ReportProperties) => Promise<DurableOutcome>;
  installId: () => string | undefined;
  identity: () => StudioIdentity | null;
  now: () => number;
  provider?: () => Promise<((request: ReportProviderRequest) => Promise<ReportFiled>) | undefined>;
  context?: () => Omit<ReportProviderRequest, 'message' | 'lane' | 'entryPoint' | 'image'> | undefined;
  imageSize?: (bytes: Uint8Array) => { width: number; height: number } | null;
}

const liveDeps: ReportDeps = {
  capture: (properties) => captureDurable('report_submitted', properties),
  installId: () => correlation()?.installId,
  identity: () => (hasOnlookSession() ? readIdentity() : null),
  now: () => Date.now(),
  provider: reportProvider,
  context: () => {
    const current = correlation();
    if (current === undefined) return undefined;
    return { installId: current.installId, launchId: current.launchId, sessionId: current.sessionId,
      appVersion: current.appVersion, releaseChannel: current.releaseChannel, platform: 'desktop' };
  },
  imageSize: (bytes) => electronImageOps().decode(bytes)?.getSize() ?? null,
};

let taken = 0;
let lastTakenAt: number | undefined;

const OUTCOME_OF: Record<DurableOutcome, ReportSubmitOutcome> = {
  queued: { kind: 'queued' },
  sent: { kind: 'sent' },
  disabled: { kind: 'refused', reason: 'disabled' },
  lost: { kind: 'refused', reason: 'lost' },
};

export async function submitReport(
  request: unknown,
  deps: ReportDeps = liveDeps,
): Promise<ReportSubmitOutcome> {
  const installId = deps.installId();
  if (installId === undefined) return { kind: 'refused', reason: 'disabled' };
  const composed = composeReport(request, installId, deps.identity());
  if (!composed.ok) return { kind: 'refused', reason: composed.reason };
  const provider = await deps.provider?.();
  const submitted = request as { image?: unknown };
  const now = deps.now();
  if (taken >= REPORTS_PER_LAUNCH || (lastTakenAt !== undefined && now - lastTakenAt < MIN_REPORT_INTERVAL_MS)) {
    return { kind: 'refused', reason: 'too-many' };
  }
  let image: ReportImage | undefined;
  if (submitted.image !== undefined) {
    if (provider === undefined) return { kind: 'refused', reason: 'malformed' };
    const refusal = reportImageError(submitted.image);
    if (refusal !== null) return { kind: 'refused', reason: refusal };
    image = submitted.image as ReportImage;
    const decoded = deps.imageSize?.(image.bytes);
    if (decoded === undefined || decoded === null || decoded.width <= 0 || decoded.height <= 0) {
      return { kind: 'refused', reason: 'image-unreadable' };
    }
    if (Math.max(decoded.width, decoded.height) > REPORT_IMAGE_MAX_EDGE || decoded.width * decoded.height > REPORT_IMAGE_MAX_PIXELS) {
      return { kind: 'refused', reason: 'image-dimensions' };
    }
  }
  // Reserved before the await: two in flight otherwise both read the same count.
  const released = { taken, lastTakenAt };
  taken += 1;
  lastTakenAt = now;
  if (provider !== undefined) {
    try {
      const context = deps.context?.();
      if (context === undefined) throw new Error('report context unavailable');
      const result = await provider({ ...context, lane: composed.properties.lane, entryPoint: composed.properties.entry_point,
        message: composed.properties.message, ...(image === undefined ? {} : { image }) });
      if (typeof result?.identifier !== 'string' || result.identifier.length === 0 || typeof result.url !== 'string'
        || !URL.canParse(result.url) || new URL(result.url).protocol !== 'https:') {
        throw new ReportSubmissionError('delivery-unknown');
      }
      try {
        await deps.capture({ ...composed.properties, filed_by: 'cloud' });
      } catch {}
      const partial = result.partial === true;
      // The ticket is ours, not the reporter's: it is traceable here and never crosses to the form (ONL-2644).
      log('report').info('filed', { identifier: result.identifier, url: result.url, partial });
      return { kind: 'filed', ...(partial ? { partial: true } : {}) };
    } catch (error) {
      const reason = error instanceof ReportSubmissionError ? error.reason : 'send-failed';
      if (reason !== 'delivery-unknown') {
        taken -= 1;
        if (lastTakenAt === now) lastTakenAt = released.lastTakenAt;
      }
      return { kind: 'refused', reason };
    }
  }
  const outcome = OUTCOME_OF[await deps.capture(composed.properties)];
  // A report the capture would not take spends no slot, or a keyless build burns the launch and then blames volume.
  if (outcome.kind === 'refused') {
    taken = released.taken;
    lastTakenAt = released.lastTakenAt;
  }
  return outcome;
}

export function registerReportHandlers(): void {
  handle(IPC_INVOKE.reportCapability, async (event) => {
    requireStudioTabSender(event, everyRenderer());
    return (await reportProvider()) !== undefined;
  });
  handle(IPC_INVOKE.reportSubmit, (event, request: unknown): Promise<ReportSubmitOutcome> => {
    requireStudioTabSender(event, everyRenderer());
    return submitReport(request);
  });
}

export function resetReportBoundsForTesting(): void {
  taken = 0;
  lastTakenAt = undefined;
}
