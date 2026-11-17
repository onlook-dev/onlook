import type { ChatFileRef, AttachmentRejectReason } from '@studio/events';

export interface AttachmentDraft {
  ref: ChatFileRef;
  name: string;
  previewUrl?: string;
}

export interface AttachFailure {
  reason: AttachmentRejectReason;
  name: string;
  previous?: { reason: AttachmentRejectReason; name: string }[];
}

export interface AttachmentsState {
  drafts: AttachmentDraft[];
  failure?: AttachFailure;
  /** How many attach batches are still registering; `generation` is a post-clear epoch and cannot say (ONL-2409). */
  pending: number;
}

export const EMPTY_ATTACHMENTS: AttachmentsState = { drafts: [], pending: 0 };

export function beginBatch(state: AttachmentsState): AttachmentsState {
  return { ...state, pending: state.pending + 1 };
}

export function endBatch(state: AttachmentsState): AttachmentsState {
  return { ...state, pending: Math.max(0, state.pending - 1) };
}

/** A keystroke landing mid-batch would erase the files already reported, so it waits (ONL-2409). */
export function dismissFailureOnKeystroke(state: AttachmentsState): AttachmentsState {
  return state.pending > 0 ? state : dismissFailure(state);
}

export function addDraft(state: AttachmentsState, draft: AttachmentDraft): AttachmentsState {
  return { ...state, drafts: [...state.drafts, draft] };
}

export function noteFailure(state: AttachmentsState, failure: AttachFailure): AttachmentsState {
  if (state.failure?.reason === failure.reason && state.failure.name === failure.name) return state;
  return { ...state, failure: { ...failure, ...(state.failure ? { previous: [...(state.failure.previous ?? []), { reason: state.failure.reason, name: state.failure.name }] } : {}) } };
}

export function dismissFailure(state: AttachmentsState): AttachmentsState {
  if (!state.failure) return state;
  const { failure: _failure, ...rest } = state;
  return rest;
}

export function removeDraft(
  state: AttachmentsState,
  id: string,
): { state: AttachmentsState; revokedUrl?: string } {
  const removed = state.drafts.find((draft) => draft.ref.id === id);
  if (!removed) return { state };
  return {
    state: { ...state, drafts: state.drafts.filter((draft) => draft.ref.id !== id) },
    revokedUrl: removed.previewUrl,
  };
}

/**
 * One transition, so a read that never lands leaves the composer's own drafts alone (ONL-2509).
 * The failure goes with the drafts it named; `pending` stays, since its batch is still running.
 */
export function replaceDrafts(
  state: AttachmentsState,
  drafts: readonly AttachmentDraft[],
): { state: AttachmentsState; revokedUrls: string[] } {
  return {
    state: { ...dismissFailure(state), drafts: [...drafts] },
    revokedUrls: previewUrls(state),
  };
}

/** A text file or a PDF carries no preview, so only some drafts hold a url to revoke (ONL-2409). */
function previewUrls(state: AttachmentsState): string[] {
  return state.drafts.flatMap((draft) => draft.previewUrl ? [draft.previewUrl] : []);
}

export interface DraftSwap {
  /** What was read. On a stale swap these are the caller's to revoke, and nothing else. */
  drafts: AttachmentDraft[];
  unreadable: string[];
  isCurrent: boolean;
}

/**
 * Every ref is read before anything is swapped, so a walk the user ended
 * mid-read leaves the composer the images it already had (ONL-2509).
 */
export async function planDraftSwap(
  wanted: readonly { ref: ChatFileRef; name: string }[],
  read: (ref: ChatFileRef, name: string) => Promise<AttachmentDraft | null>,
  isCurrent: () => boolean,
): Promise<DraftSwap> {
  const loaded = await Promise.all(
    wanted.map(async ({ ref, name }) => ({ name, draft: await read(ref, name) })),
  );
  return {
    drafts: loaded.flatMap(({ draft }) => draft === null ? [] : [draft]),
    unreadable: loaded.flatMap(({ name, draft }) => draft === null ? [name] : []),
    isCurrent: isCurrent(),
  };
}

/** The draft's name rides out with its ref: the transcript renders the ref alone (ONL-2549). */
export function attachmentRefs(state: AttachmentsState): ChatFileRef[] {
  return state.drafts.map((draft) => ({ ...draft.ref, name: draft.name }));
}
