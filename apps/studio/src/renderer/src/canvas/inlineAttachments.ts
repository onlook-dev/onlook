import {
  IMAGE_MAX_BYTES,
  type ImageRef,
  type ImageRejectReason,
  type RegisterCanvasImageResult,
} from '@studio/events';
import {
  addDraft,
  dismissFailure,
  EMPTY_ATTACHMENTS,
  noteFailure,
  removeDraft,
  type AttachFailure,
  type AttachmentDraft,
  type AttachmentsState,
} from '../attachments.js';
import { decodeImageSize, resolveImage } from '../chat/imageCache.js';
import { t } from '@studio/i18n';
import { log } from '../log.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { sourceFromFile } from './image/dropSeat.js';
import { named, type ImageIngestSource } from './image/ingest.js';
import { useCanvasStore, type CanvasState } from './store.js';
import { studio } from '../bridge.js';

const attachLog = log('canvas');

export interface InlineAttachmentFields {
  /** Read through `openInlineAttachments`, never directly: a closed bubble has none by construction, so no close path cleans up (ONL-2549). */
  inlineAttachments: AttachmentsState;
  /** Moves only where the slice resets, so an admission can tell a re-anchor from a reopen on the same element (ONL-2549). */
  inlineChatOpenToken: number;
}

export function openInlineAttachments(
  state: Pick<CanvasState, 'inlineChat' | 'inlineAttachments'>,
): AttachmentsState {
  return state.inlineChat === null ? EMPTY_ATTACHMENTS : state.inlineAttachments;
}

export function addInlineAttachment(draft: AttachmentDraft): void {
  useCanvasStore.setState((state) => ({
    inlineAttachments: addDraft(state.inlineAttachments, draft),
  }));
}

export function removeInlineAttachment(id: string): void {
  useCanvasStore.setState((state) => {
    // The surrendered URL is the shared image cache's, which the transcript and the composer read by the same id; revoking it would blank them (ONL-2549).
    const { state: next } = removeDraft(state.inlineAttachments, id);
    return next === state.inlineAttachments
      ? state
      : { inlineAttachments: dismissFailure(next) };
  });
}

/** By id, not the whole slice: a paste admitted while the send was in flight was not sent (ONL-2549). */
export function clearInlineAttachments(ids: readonly string[]): void {
  useCanvasStore.setState((state) => {
    let next = state.inlineAttachments;
    // The surrendered URLs are the shared cache's too, and dropping them unrevoked is the point (ONL-2549).
    for (const id of ids) next = removeDraft(next, id).state;
    return next === state.inlineAttachments ? state : { inlineAttachments: next };
  });
}

export function noteInlineAttachFailure(failure: AttachFailure): void {
  useCanvasStore.setState((state) => ({
    inlineAttachments: noteFailure(state.inlineAttachments, failure),
  }));
}

export function dismissInlineAttachFailure(): void {
  useCanvasStore.setState((state) => {
    const next = dismissFailure(state.inlineAttachments);
    return next === state.inlineAttachments ? state : { inlineAttachments: next };
  });
}

export interface InlineAttachDeps {
  /** Main classifies the bytes and answers a reason; a bridge refusal throws, and the pipeline reads that as `unreadable`. */
  register: (input: { bytes: Uint8Array; name: string }) => Promise<RegisterCanvasImageResult>;
  /** The stored bytes, read back so the preview shows what was kept, not what was offered. */
  resolve: (ref: ImageRef) => Promise<string | null>;
  measure: (url: string) => Promise<{ width: number; height: number } | null>;
}

type Admission = { draft: AttachmentDraft } | { reason: ImageRejectReason };

async function admit(
  file: ImageIngestSource,
  name: string,
  deps: InlineAttachDeps,
): Promise<Admission> {
  let registered: RegisterCanvasImageResult;
  try {
    registered = await deps.register({ bytes: await file.bytes(), name });
  } catch {
    return { reason: 'unreadable' };
  }
  if (!registered.ok) return { reason: registered.reason };
  if (registered.image.mediaType === 'image/svg+xml') return { reason: 'unsupported-format' };
  const image: ImageRef = { ...registered.image, mediaType: registered.image.mediaType };
  const previewUrl = await deps.resolve(image);
  if (previewUrl === null) return { reason: 'unreadable' };
  const size = await deps.measure(previewUrl);
  if (size === null) return { reason: 'unreadable' };
  return { draft: { ref: { ...image, ...size }, name, previewUrl } };
}

export async function attachInlineFiles(
  files: readonly ImageIngestSource[],
  fallbackName: string,
  deps: InlineAttachDeps,
): Promise<void> {
  const stamp = useCanvasStore.getState().inlineChatOpenToken;
  const moved = (): boolean => useCanvasStore.getState().inlineChatOpenToken !== stamp;
  let refused = false;
  for (const file of files) {
    if (moved()) return;
    const name = named(file.name, fallbackName);
    // Before the bytes: reading materialises the whole file in the renderer heap and the clone to main copies it again, which can take the window down before main's cap runs.
    if (file.size > IMAGE_MAX_BYTES) {
      refused = true;
      noteInlineAttachFailure({ reason: 'too-large', name });
      continue;
    }
    const admission = await admit(file, name, deps);
    if (moved()) return;
    if ('reason' in admission) {
      refused = true;
      noteInlineAttachFailure({ reason: admission.reason, name });
      continue;
    }
    // This gesture's own refusals stand; one left by an earlier paste is answered by the file that did attach (ONL-2549).
    if (!refused) dismissInlineAttachFailure();
    addInlineAttachment(admission.draft);
  }
}

/** The Project's worktree, which is the session's cwd: a hold taken against the source root is never settled (ONL-2549). */
function projectWorktree(): string | undefined {
  return useWorkspaceStore.getState().workspace?.workspacePath;
}

function liveInlineAttachDeps(cwd: string): InlineAttachDeps {
  return {
    register: ({ bytes, name }) => studio().registerImage({ cwd, bytes, name }),
    resolve: resolveImage,
    measure: decodeImageSize,
  };
}

export function acceptInlineFiles(files: readonly File[]): void {
  const cwd = projectWorktree();
  if (cwd === undefined) {
    attachLog.warn('a paste into the inline chat was ignored: no project is open');
    return;
  }
  void attachInlineFiles(
    files.map((file) => sourceFromFile(file)),
    t('chat.attach.pastedName'),
    liveInlineAttachDeps(cwd),
  );
}
