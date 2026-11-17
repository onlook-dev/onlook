import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { ArtifactAttachment, AttachmentSource, ChatFileRef, ComposerDraft, RetryPrompt } from '@studio/events';
import type { RecallHandle } from '@studio/chat-ui';
import { artifactChipId, isArtifactChipId, restoreArtifactReferences } from './draftRestore.js';
import { createEndRecall, createRecallRestore, endingRecall, settleRecallRestore, type RecallEnd } from './recallRestore.js';
import type { AttachmentsHandle } from './useAttachments.js';
import { t } from '@studio/i18n';
import { studio } from '../bridge.js';

export interface RecalledPayload {
  /** The artifact chips the read has to confirm before any of them is shown. */
  artifacts: ArtifactAttachment[];
  missing: string[];
}

interface PromptRecallCanvas {
  /** The chip's own remove on a frame, text or image object. */
  deselectFrame: (id: string) => void;
  removeElement: (id: string) => void;
}

interface PromptRecallChat {
  workspacePath: string | undefined;
  /** The announced session: `state.sessionId` fills at the first turn, mid-walk (ONL-2556). */
  sessionId: string | undefined;
}

export interface PromptRecallOptions {
  chat: PromptRecallChat;
  attachments: AttachmentsHandle;
  canvas: PromptRecallCanvas;
  /** Puts one step's text and canvas picks in place, before anything is read. */
  take: (prompt: RetryPrompt, isDraft: boolean) => RecalledPayload;
  /** The composer's durable content this render, or `undefined` until this project's own draft has been read. */
  draft: () => ComposerDraft | undefined;
}

/** The controls that hand the composer back to the user; each ends the walk first. */
type ComposerPayloadControls = {
  removeFrame: (id: string) => void;
  removeElement: (id: string) => void;
  removeAttachment: (id: string) => void;
  acceptFiles: (files: File[], source?: AttachmentSource) => void;
  pickImages: () => void;
};

export interface PromptRecallHandle {
  walk: RefObject<RecallHandle | null>;
  isRecalling: boolean;
  setRecalling: (isRecalling: boolean) => void;
  isRestoring: boolean;
  missing: string[];
  clearMissing: () => void;
  artifacts: ArtifactAttachment[];
  setArtifacts: Dispatch<SetStateAction<ArtifactAttachment[]>>;
  end: (nextAction: RecallEnd) => void;
  restore: (prompt: RetryPrompt, isDraft: boolean) => void;
  restoreDraft: (prompt: RetryPrompt) => void;
  payload: ComposerPayloadControls;
  /** Takes what was just read as already saved, so restoring a draft never writes it back. */
  markSaved: (cwd: string, draft: ComposerDraft) => void;
}

function savedKey(cwd: string, draft: ComposerDraft): string {
  return JSON.stringify([cwd, draft]);
}

export function usePromptRecall({ chat, attachments, canvas, take, draft }: PromptRecallOptions): PromptRecallHandle {
  const { workspacePath, sessionId } = chat;
  const [isRecalling, setRecalling] = useState(false);
  const [isRestoring, setRestoring] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactAttachment[]>([]);
  const owner = useMemo(createRecallRestore, []);
  const walk = useRef<RecallHandle | null>(null);
  const end = useMemo(
    () => createEndRecall(owner, walk, { setRestoring, setRecalling }),
    [owner],
  );

  // The walk ends with the surface it belongs to, and reports why before the panel's handle goes.
  useEffect(() => () => { end('abandon'); }, [end]);

  // A walk belongs to the chat it started in: the project the user left, or the chat they replaced, ends it (ONL-2509).
  useEffect(() => {
    end('abandon');
    // Same reference when there is nothing to clear, so the mount pass is not a render.
    setMissing((names) => names.length === 0 ? names : []);
  }, [workspacePath, sessionId, end]);

  const { deselectFrame, removeElement } = canvas;
  const { remove, acceptFiles, pick, replace } = attachments;
  const payload = useMemo(
    () => endingRecall<ComposerPayloadControls>(end, {
      removeFrame: (id: string): void => {
        if (isArtifactChipId(id)) setArtifacts((refs) => refs.filter((ref) => artifactChipId(ref) !== id));
        else deselectFrame(id);
      },
      removeElement,
      removeAttachment: remove,
      acceptFiles,
      pickImages: pick,
    }),
    [end, deselectFrame, removeElement, remove, acceptFiles, pick],
  );

  const saved = useRef<string | undefined>(undefined);
  const markSaved = useCallback((cwd: string, written: ComposerDraft) => {
    saved.current = savedKey(cwd, written);
  }, []);
  // Every render: what the composer holds is this render's own value, not a dependency of one.
  useEffect(() => {
    const held = draft();
    if (workspacePath === undefined || held === undefined) return;
    // The walk holds the composer until it ends: a save now would persist a recalled prompt over the user's own draft (ONL-2509).
    if (isRecalling || isRestoring) return;
    const written = savedKey(workspacePath, held);
    // An unchanged draft never re-arms main's debounce.
    if (saved.current === written) return;
    saved.current = written;
    studio().draftSave({ cwd: workspacePath, draft: held });
  });

  return {
    walk,
    isRecalling,
    setRecalling,
    isRestoring,
    missing,
    clearMissing: useCallback(() => setMissing((names) => names.length === 0 ? names : []), []),
    artifacts,
    setArtifacts,
    end,
    payload,
    markSaved,
    restoreDraft: (prompt: RetryPrompt): void => {
      end('abandon');
      const taken = take(prompt, true);
      setArtifacts(taken.artifacts);
      setMissing(taken.missing);
    },
    restore: (prompt: RetryPrompt, isDraft: boolean): void => {
      const pass = owner.begin();
      setRestoring(true);
      setMissing([]);
      // Cleared, never seeded: a chip the read never confirms would outlive a cancelled walk and ride out on the next send (ONL-2509).
      setArtifacts([]);
      const taken = take(prompt, isDraft);
      // Text files and PDFs too: every chip the composer can hold comes back, and only the skill token is not a read (ONL-2409).
      const files = (prompt.attachments ?? []).filter((ref): ref is ChatFileRef => !('kind' in ref) || ref.kind === 'file');
      void settleRecallRestore(owner, pass, {
        work: {
          images: (isCurrent) => replace(files, isCurrent),
          artifacts: () => restoreArtifactReferences(taken.artifacts, (artifactId) => studio().artifactRead({ artifactId }), 'drop'),
        },
        requested: taken.artifacts,
        missing: taken.missing,
        sink: { setArtifacts, setMissing, setRestoring },
        unreadableLabel: t('chat.recall.unreadable'),
      });
    },
  };
}
