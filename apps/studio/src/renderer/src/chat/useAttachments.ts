import { useCallback, useEffect, useRef, useState } from 'react';
import { IMAGE_MAX_BYTES, TEXT_ATTACHMENT_MAX_BYTES, type ChatFileRef, type HarnessId, type AttachmentSource } from '@studio/events';
import {
  addDraft,
  attachmentRefs,
  beginBatch,
  dismissFailure,
  dismissFailureOnKeystroke,
  EMPTY_ATTACHMENTS,
  endBatch,
  noteFailure,
  planDraftSwap,
  removeDraft,
  replaceDrafts,
  type AttachmentDraft,
  type AttachmentsState,
} from '../attachments.js';
import { decodeImageSize, imageBytesToObjectUrl } from './imageCache.js';
import { useLatestRef } from '../useLatestRef.js';
import { t } from '@studio/i18n';
import { studio } from '../bridge.js';

export interface AttachmentsHandle {
  state: AttachmentsState;
  pick: () => void;
  acceptFiles: (files: File[], source?: AttachmentSource) => void;
  remove: (id: string) => void;
  dismissFailure: () => void;
  dismissFailureOnKeystroke: () => void;
  refs: () => ChatFileRef[];
  restore: (refs: readonly ChatFileRef[]) => void;
  /** Resolves the names it could not read back; it swaps nothing once `isCurrent` turns false. */
  replace: (refs: readonly ChatFileRef[], isCurrent?: () => boolean) => Promise<string[]>;
}

/** `project` guards the reads, not `cwd`: the session's cwd arrives a turn later than the Project (ONL-2509). */
export function useAttachments(cwd: string | undefined, project: string | undefined, agent: HarnessId = 'claude'): AttachmentsHandle {
  const [state, setState] = useState<AttachmentsState>(EMPTY_ATTACHMENTS);
  const startedProject = useLatestRef(project);
  const urls = useRef<Set<string>>(new Set());
  /** So a re-render never re-admits a restored id (ONL-2207). */
  const restored = useRef<Set<string>>(new Set());
  const textSizes = useRef(new Map<string, number>());
  const generation = useRef(0);
  const admissions = useRef(new Map<string, symbol>());
  useEffect(
    () => () => {
      generation.current += 1;
      admissions.current.clear();
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const release = useCallback((url: string | undefined) => {
    if (!url) return;
    urls.current.delete(url);
    URL.revokeObjectURL(url);
  }, []);

  // Fetched back from main so the preview shows what was stored, not what was offered.
  const read = useCallback(async (ref: ChatFileRef, name: string): Promise<{ draft: AttachmentDraft; textBytes: number } | null> => {
    let stored;
    try { stored = await studio().attachmentBytes({ id: ref.id }); }
    catch { stored = null; }
    if (!stored) return null;
    if ('kind' in ref) {
      return { draft: { ref, name }, textBytes: ref.mediaType === 'text/plain' ? stored.bytes.byteLength : 0 };
    }
    if (stored.mediaType === 'text/plain' || stored.mediaType === 'application/pdf') return null;
    const url = imageBytesToObjectUrl({ bytes: stored.bytes, mediaType: stored.mediaType });
    const dimensions = await decodeImageSize(url);
    if (!dimensions) {
      URL.revokeObjectURL(url);
      return null;
    }
    return { draft: { ref: { ...ref, ...dimensions }, name, previewUrl: url }, textBytes: 0 };
  }, []);

  const admit = useCallback(async (ref: ChatFileRef, name: string, revision: number): Promise<void> => {
    if (revision !== generation.current) return;
    if ('kind' in ref && ref.mediaType === 'application/pdf' && agent !== 'claude') {
      setState((s) => noteFailure(s, { reason: 'pdf-unsupported', name }));
      return;
    }
    const startedIn = startedProject.current;
    const token = Symbol();
    admissions.current.set(ref.id, token);
    // The project too: a read that started in the one the user left must not chip the next one's composer (ONL-2509).
    const isCurrent = (): boolean => revision === generation.current
      && admissions.current.get(ref.id) === token
      && startedIn === startedProject.current;
    const result = await read(ref, name);
    if (!isCurrent()) {
      if (result) release(result.draft.previewUrl);
      return;
    }
    if (!result) {
      setState((s) => noteFailure(s, { reason: 'unreadable', name }));
      return;
    }
    if (result.textBytes > 0) {
      const total = [...textSizes.current.values()].reduce((sum, size) => sum + size, 0);
      if (total + result.textBytes > TEXT_ATTACHMENT_MAX_BYTES) {
        setState((s) => noteFailure(s, { reason: 'text-too-large', name }));
        return;
      }
      textSizes.current.set(ref.id, result.textBytes);
    }
    if (result.draft.previewUrl) urls.current.add(result.draft.previewUrl);
    setState((s) => addDraft(s, result.draft));
  }, [agent, startedProject, read, release]);

  const restore = useCallback(
    (refs: readonly ChatFileRef[]) => {
      // Outside a state updater: StrictMode runs one twice, and the second pass admits a duplicate chip.
      for (const ref of refs) {
        if (restored.current.has(ref.id)) continue;
        restored.current.add(ref.id);
        void admit(ref, ref.name ?? t('chat.attach.restoredName'), generation.current);
      }
    },
    [admit],
  );

  const pick = useCallback(() => {
    if (!cwd) return;
    const revision = generation.current;
    void studio()
      .pickAttachments({
        cwd,
        agent,
        existingIds: [...textSizes.current.keys()],
        title: t('chat.attach.pickerTitle'),
        buttonLabel: t('chat.attach.pickerButton'),
      })
      .then(async (result) => {
        if (result.canceled || revision !== generation.current) return;
        setState((s) => beginBatch(dismissFailure(s)));
        try {
          for (const rejection of result.rejected) {
            setState((s) => noteFailure(s, rejection));
          }
          for (const ref of result.files) await admit(ref, ref.name ?? t('chat.attach.restoredName'), revision);
        } finally {
          setState(endBatch);
        }
      })
      // Main rejects per file; this catch is the picker itself dying, without which the batch vanishes with no failure state.
      .catch(() => {
        if (revision !== generation.current) return;
        setState((s) => noteFailure(s, { reason: 'unreadable', name: t('chat.attach.selectionName') }));
      });
  }, [cwd, agent, admit]);

  const acceptFiles = useCallback(
    (files: File[], source: AttachmentSource = 'drop') => {
      if (!cwd) return;
      setState((s) => beginBatch(dismissFailure(s)));
      const revision = generation.current;
      void (async () => {
        try {
          for (const file of files) {
            if (revision !== generation.current) return;
            const name = file.name || t('chat.attach.pastedName');
            // Checked before `arrayBuffer()`: reading materialises the whole file in the renderer heap and the clone to main copies it again, which can take the window down before main's cap runs.
            if (file.size > IMAGE_MAX_BYTES) {
              studio().telemetryEvent({ event: 'attachment_rejected', properties: { kind: 'unknown', coarse_type: 'unknown', size_bucket: 'large', source, agent, reason: 'too-large' } });
              setState((s) => noteFailure(s, { reason: 'too-large', name }));
              continue;
            }
            let registered;
            try {
              const bytes = new Uint8Array(await file.arrayBuffer());
              registered = await studio().registerAttachment({ cwd, bytes, name, agent, source, existingIds: [...textSizes.current.keys()] });
            } catch {
              if (revision !== generation.current) return;
              setState((s) => noteFailure(s, { reason: 'unreadable', name }));
              continue;
            }
            if (revision !== generation.current) return;
            if (!registered.ok) {
              setState((s) => noteFailure(s, { reason: registered.reason, name }));
              continue;
            }
            await admit(registered.ref, name, revision);
          }
        } finally {
          setState(endBatch);
        }
      })();
    },
    [cwd, agent, admit],
  );

  const remove = useCallback(
    (id: string) => {
      admissions.current.delete(id);
      // Or re-attaching the same image after removing it silently does nothing.
      restored.current.delete(id);
      textSizes.current.delete(id);
      setState((s) => {
        const { state: next, revokedUrl } = removeDraft(dismissFailure(s), id);
        release(revokedUrl);
        return next;
      });
    },
    [release],
  );

  const replace = useCallback(async (refs: readonly ChatFileRef[], isCurrent: () => boolean = () => true): Promise<string[]> => {
    const revision = generation.current;
    const startedIn = startedProject.current;
    const sizes = new Map<string, number>();
    const swap = await planDraftSwap(
      refs.map((ref) => ({ ref, name: ref.name ?? t('chat.attach.restoredName') })),
      async (ref, name) => {
        // A walk is not an attach, so this agent's refusal is named among what it could not bring back (ONL-2607).
        if ('kind' in ref && ref.mediaType === 'application/pdf' && agent !== 'claude') return null;
        const result = await read(ref, name);
        if (result && result.textBytes > 0) sizes.set(ref.id, result.textBytes);
        return result?.draft ?? null;
      },
      () => revision === generation.current && startedIn === startedProject.current && isCurrent(),
    );
    if (!swap.isCurrent) {
      for (const draft of swap.drafts) release(draft.previewUrl);
      return [];
    }
    generation.current += 1;
    admissions.current.clear();
    // Every ref it tried, not only the ones it read: an id that failed once is not re-read by a later restore.
    restored.current = new Set(refs.map((ref) => ref.id));
    // The cap counts what the composer now holds, so a recalled prompt's text does not read as free room (ONL-2409).
    textSizes.current = sizes;
    for (const draft of swap.drafts) {
      if (draft.previewUrl) urls.current.add(draft.previewUrl);
    }
    setState((s) => {
      const { state: next, revokedUrls } = replaceDrafts(s, swap.drafts);
      for (const url of revokedUrls) release(url);
      return next;
    });
    return swap.unreadable;
  }, [agent, startedProject, read, release]);

  return {
    state,
    pick,
    acceptFiles,
    remove,
    dismissFailure: useCallback(() => setState(dismissFailure), []),
    dismissFailureOnKeystroke: useCallback(() => setState(dismissFailureOnKeystroke), []),
    refs: useCallback(() => attachmentRefs(state), [state]),
    restore,
    replace,
  };
}
