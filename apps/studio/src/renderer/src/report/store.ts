import { create } from 'zustand';
import {
  REPORT_MESSAGE_MAX,
  REPORT_IMAGE_MAX_BYTES,
  REPORT_IMAGE_MAX_EDGE,
  REPORT_IMAGE_MAX_PIXELS,
  reportImageError,
  type ReportImage,
  type ReportImageError,
  type ReportEntryPoint,
  type ReportLane,
  type ReportRefusalReason,
  type ReportSubmitOutcome,
  type ReportSubmitRequest,
} from '@studio/events';
import { log } from '../log.js';
import { matchesHotkey, parseHotkey, type KeyStroke } from '../shortcuts/matchHotkey.js';
import { studio } from '../bridge.js';

export type ReportStatus =
  | { kind: 'closed' }
  | { kind: 'composing' }
  | { kind: 'sending' }
  | { kind: 'refused'; reason: ReportRefusalReason };

export interface ReportState {
  status: ReportStatus;
  lane: ReportLane;
  draft: string;
  entryPoint: ReportEntryPoint;
  imageCapable?: boolean;
  image?: ReportImage & { preview: string };
  imageError?: ReportImageError;
  imageBusy?: boolean;
  sendError?: ReportRefusalReason;
}

const INITIAL: ReportState = {
  status: { kind: 'closed' },
  lane: 'bug',
  draft: '',
  entryPoint: 'menu',
};

export const useReportStore = create<ReportState>()(() => INITIAL);

export function canSend(draft: string): boolean {
  return draft.trim().length > 0 && draft.length <= REPORT_MESSAGE_MAX;
}

export function charactersLeft(draft: string): number {
  return REPORT_MESSAGE_MAX - draft.length;
}

/** The count is noise until the bound is in reach (ONL-2350). */
export const COUNTER_SHOWS_WITHIN = 100;

export function showsCounter(draft: string): boolean {
  return charactersLeft(draft) <= COUNTER_SHOWS_WITHIN;
}

export interface ReportFormShape {
  /** The build offers an image, so the form carries a picker or a preview. */
  hasPicker: boolean;
  /** A send came back refused or unconfirmed, and its line sits above the disclosure. */
  hasSendError: boolean;
}

/** The refusal line and the picker each take rows the message field gives back, so the disclosure stays above the footer (ONL-2644). */
export function reportMessageRows(form: ReportFormShape): number {
  if (!form.hasPicker) return 5;
  return form.hasSendError ? 2 : 4;
}

const SEND_CHORD = parseHotkey('mod+enter');

/** Plain Enter stays a new line in the message (ONL-2621). */
export function sendsOnKey(event: KeyStroke & { isComposing: boolean }): boolean {
  return !event.isComposing && matchesHotkey(event, SEND_CHORD);
}

export function reportPayload(state: ReportState): ReportSubmitRequest {
  return { lane: state.lane, entryPoint: state.entryPoint, message: state.draft.trim(),
    ...(state.image === undefined ? {} : { image: { bytes: state.image.bytes, contentType: state.image.contentType } }) };
}

let selection = 0;

export function removeReportImage(): void {
  selection += 1;
  const { image, sendError } = useReportStore.getState();
  // Revoked while the card is still fanning out: the element it is painted in survives the removal.
  if (image !== undefined) URL.revokeObjectURL(image.preview);
  // An unconfirmed send outlives the image it carried: the next send can still duplicate that report (ONL-2644).
  const warned = sendError === 'delivery-unknown';
  useReportStore.setState({ image: undefined, imageError: undefined, imageBusy: false, ...(warned ? {} : { sendError: undefined }) });
}

export async function chooseReportImage(file: File): Promise<void> {
  const state = useReportStore.getState();
  if (!state.imageCapable || state.status.kind !== 'composing') return;
  removeReportImage();
  const ownSelection = selection;
  useReportStore.setState({ imageBusy: true });
  try {
    const contentType = file.type;
    if (contentType !== 'image/png' && contentType !== 'image/jpeg') throw 'image-format';
    if (file.size > REPORT_IMAGE_MAX_BYTES) throw 'image-too-large';
    const image: ReportImage = { contentType, bytes: new Uint8Array(await file.arrayBuffer()) };
    const error = reportImageError(image);
    if (error !== null) throw error;
    const decoded = await createImageBitmap(file);
    const tooLarge = Math.max(decoded.width, decoded.height) > REPORT_IMAGE_MAX_EDGE || decoded.width * decoded.height > REPORT_IMAGE_MAX_PIXELS;
    decoded.close();
    if (tooLarge) throw 'image-dimensions';
    if (ownSelection !== selection) return;
    useReportStore.setState({ image: { ...image, preview: URL.createObjectURL(file) }, imageBusy: false });
  } catch (error) {
    if (ownSelection !== selection) return;
    const reason = typeof error === 'string' && ['image-format', 'image-too-large', 'image-dimensions'].includes(error)
      ? error as ReportImageError : 'image-unreadable';
    useReportStore.setState({ imageError: reason, imageBusy: false });
  }
}

/** A sent report closes the form and clears its words: no thank-you step. A refusal keeps the words for another try (ONL-2350). */
function settleReport(outcome: ReportSubmitOutcome): Pick<ReportState, 'status'> & { draft?: string } {
  return outcome.kind === 'refused'
    ? { status: { kind: 'refused', reason: outcome.reason } }
    : { status: { kind: 'closed' }, draft: '' };
}

export function openReport(entryPoint: ReportEntryPoint, lane: ReportLane): void {
  const { status } = useReportStore.getState();
  useReportStore.setState({
    status: status.kind === 'sending' ? status : { kind: 'composing' },
    lane,
    entryPoint,
  });
}

export function setReportDraft(draft: string): void {
  useReportStore.setState({ draft });
}

/** A dismissal in flight does nothing, or the outcome is never stated (ONL-2350). */
export function dismissReport(): void {
  const { status } = useReportStore.getState();
  if (status.kind === 'sending') return;
  if (useReportStore.getState().imageBusy) removeReportImage();
  useReportStore.setState({ status: { kind: 'closed' } });
}

export function sendReport(): void {
  const state = useReportStore.getState();
  // A refused form keeps its words on screen, so Send and Cmd+Enter retry from it as Try again does.
  if (state.status.kind !== 'composing' && state.status.kind !== 'refused') return;
  if (!canSend(state.draft) || state.imageBusy) return;
  useReportStore.setState({ status: { kind: 'sending' }, sendError: undefined });
  void studio().reportSubmit(reportPayload(state)).then(
    (outcome) => {
      if (state.imageCapable && outcome.kind === 'refused') {
        useReportStore.setState({ status: { kind: 'composing' }, sendError: outcome.reason });
        return;
      }
      if (outcome.kind === 'filed') removeReportImage();
      useReportStore.setState(settleReport(outcome));
    },
    (error: unknown) => {
      if (state.imageCapable) {
        useReportStore.setState({ status: { kind: 'composing' }, sendError: 'send-failed' });
        return;
      }
      log('report').warn('submit refused', { error });
      useReportStore.setState({ status: { kind: 'refused', reason: 'lost' } });
    },
  );
}

let subscribed = false;

/** Installed once: both doors reach this one dialog, and StrictMode mounts the seat twice (ONL-2350). */
export function subscribeToReportOpen(): void {
  if (subscribed) return;
  subscribed = true;
  studio().onReportOpen(({ lane }) => {
    openReport('menu', lane);
  });
}

export function resetReportForTesting(): void {
  removeReportImage();
  subscribed = false;
  useReportStore.setState(INITIAL, true);
}
