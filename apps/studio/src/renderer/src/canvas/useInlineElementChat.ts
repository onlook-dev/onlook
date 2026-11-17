import { useCallback, useEffect } from 'react';
import type { InlineDismissMethod } from '@studio/events';
import type { ComposerStatus } from '@studio/chat-ui';
import { attachmentRefs, type AttachFailure } from '../attachments.js';
import { attachFailureStatus, gatherRefusalStatus } from '../chat/composerStatus.js';
import { submitChatPrompt, type ChatSubmitResult } from '../chat/submitRegistry.js';
import { t } from '@studio/i18n';
import { isInteractiveTarget } from '../shortcuts/isInteractiveTarget.js';
import { useLatestRef } from '../useLatestRef.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { isPickerLive } from './frame/geometry.js';
import {
  clearInlineAttachments,
  dismissInlineAttachFailure,
  openInlineAttachments,
} from './inlineAttachments.js';
import {
  inlineChatAnchor,
  inlineSubmitText,
  type InlineChatEntry,
  type InlineChatRecord,
  type InlinePlacement,
} from './inlinePlacement.js';
import { selectionFrameIds, type GatherRefusal } from './selection.js';
import { useCanvasStore, type CanvasTool } from './store.js';
import { sendTelemetry } from './telemetry.js';
import { studio } from '../bridge.js';

export type InlineChatEvent =
  | { type: 'opened'; anchorId: string; entry: InlineChatEntry }
  | { type: 'openedOnNode'; nodeId: string }
  | { type: 'expanded' }
  | { type: 'collapsed' }
  | { type: 'latched'; placement: InlinePlacement }
  | { type: 'drafted'; draft: string }
  | { type: 'sending' }
  | { type: 'refused' }
  | { type: 'gatherRefused'; reason: GatherRefusal };

export function inlineChatReducer(
  record: InlineChatRecord | null,
  event: InlineChatEvent,
): InlineChatRecord | null {
  if (event.type === 'openedOnNode') {
    // Enter asked for the input: it opens expanded, with nothing of an earlier surface carried over.
    return record !== null
      ? record
      : {
          anchorId: event.nodeId,
          anchor: 'node',
          draft: '',
          expanded: true,
          entry: 'input',
          placement: null,
          send: 'idle',
          refusal: null,
        };
  }
  if (event.type === 'opened') {
    return {
      anchorId: event.anchorId,
      draft: record?.draft ?? '',
      // A re-anchor keeps the surface as the user left it: the draft follows and a ball stays a ball.
      expanded: record?.expanded ?? event.entry === 'input',
      entry: record?.entry ?? event.entry,
      placement: record?.placement ?? null,
      send: 'idle',
      refusal: null,
    };
  }
  if (record === null) return null;
  switch (event.type) {
    case 'expanded':
      return record.expanded ? record : { ...record, expanded: true };
    case 'collapsed':
      // The draft stays; a surface that opened as the input has no orb to collapse into.
      return record.expanded && record.entry === 'orb' ? { ...record, expanded: false } : record;
    case 'latched':
      return record.placement === null ? { ...record, placement: event.placement } : record;
    case 'drafted':
      // A keystroke retires a failure and keeps a refusal: the failure was about the sentence, the refusal about the selection.
      return record.draft === event.draft && record.send === 'idle'
        ? record
        : { ...record, draft: event.draft, send: 'idle' };
    case 'sending':
      // The refusal band steps aside for the send it would outrank.
      return record.send === 'sending' && record.refusal === null
        ? record
        : { ...record, send: 'sending', refusal: null };
    case 'refused':
      return record.send === 'failed' ? record : { ...record, send: 'failed' };
    case 'gatherRefused':
      return record.refusal === event.reason ? record : { ...record, refusal: event.reason };
  }
}

export type InlineBand =
  | { kind: 'attach-failed'; failure: AttachFailure }
  | { kind: 'refusal'; reason: GatherRefusal }
  | { kind: 'send-failed' }
  | null;

/** The newest transient wins: a refusal is about the selection the user just changed, and a paste they just tried is newer than both (ONL-2549). */
export function inlineChatBand(
  record: InlineChatRecord,
  attachFailure: AttachFailure | undefined,
): InlineBand {
  if (attachFailure !== undefined) return { kind: 'attach-failed', failure: attachFailure };
  if (record.refusal !== null) return { kind: 'refusal', reason: record.refusal };
  return record.send === 'failed' ? { kind: 'send-failed' } : null;
}

export function inlineChatStatus(
  record: InlineChatRecord,
  attachFailure: AttachFailure | undefined,
): ComposerStatus | undefined {
  const band = inlineChatBand(record, attachFailure);
  if (band === null) return undefined;
  switch (band.kind) {
    case 'attach-failed':
      return attachFailureStatus(band.failure);
    case 'refusal':
      return gatherRefusalStatus(band.reason);
    case 'send-failed':
      return { type: 'error', message: t('chat.error.sendFailed') };
  }
}

export function freshAnchorId(
  before: readonly string[],
  after: readonly string[],
): string | null {
  const first = after[0];
  if (first === undefined || before.includes(first)) return null;
  return first;
}

/** `isPicking` routes the pick to a composer chip; an anchor the selection write already re-pointed to is not a second open. */
export function opensInlineChat(
  state: {
    isPicking: boolean;
    tool: CanvasTool;
    mode: 'design' | 'interact';
    openAnchorId: string | null;
  },
  anchorId: string,
): boolean {
  if (state.isPicking || !isPickerLive(state)) return false;
  return state.openAnchorId !== anchorId;
}

export type InlineSubmitVerdict = 'accepted' | 'held' | 'refused' | 'unchanged';

export function inlineSubmitVerdict(
  outcome: ChatSubmitResult['outcome'],
  isHeld = false,
): InlineSubmitVerdict {
  switch (outcome) {
    case 'accepted':
      return isHeld ? 'held' : 'accepted';
    case 'rejected':
    case 'failed':
    case 'unavailable':
      return 'refused';
    default:
      return 'unchanged';
  }
}

/** Counts and one flag: the prompt's text never reaches telemetry (ONL-2455). */
export function inlineSubmittedFields(facts: {
  elementCount: number;
  frameCount: number;
  imageCount: number;
  text: string;
  isRightRailHidden: boolean;
}): {
  element_count: number;
  frame_count: number;
  image_count: number;
  prompt_chars: number;
  rail_open: boolean;
} {
  return {
    element_count: facts.elementCount,
    frame_count: facts.frameCount,
    image_count: facts.imageCount,
    prompt_chars: facts.text.length,
    rail_open: !facts.isRightRailHidden,
  };
}


export function ownsInlineRecord(record: InlineChatRecord | null, sentAnchor: string): boolean {
  return record !== null && record.anchorId === sentAnchor;
}

export function carriesInlineAnchor(
  record: InlineChatRecord | null,
  evidence: readonly { id: string }[],
): boolean {
  return record !== null && evidence.some((item) => item.id === record.anchorId);
}

export function closeInlineChatCarrying(evidence: readonly { id: string }[]): void {
  const state = useCanvasStore.getState();
  if (carriesInlineAnchor(state.inlineChat, evidence)) state.closeInlineChat('chat-sent');
}

function dispatch(event: InlineChatEvent): void {
  const state = useCanvasStore.getState();
  const next = inlineChatReducer(state.inlineChat, event);
  if (next !== null) state.setInlineChat(next);
}

export function draftInlineChat(draft: string): void {
  // A keystroke retires an attach failure as it retires a failed send: both were about the message being written (ONL-2549).
  dismissInlineAttachFailure();
  dispatch({ type: 'drafted', draft });
}

export function latchInlineChat(placement: InlinePlacement): void {
  dispatch({ type: 'latched', placement });
}

/** One refusal, one band: the open bubble carries it, and the composer when no bubble is open (ONL-2482). */
export function refuseGather(reason: GatherRefusal): void {
  const state = useCanvasStore.getState();
  if (state.inlineChat === null) {
    state.noteGatherRefusal(reason);
    return;
  }
  dispatch({ type: 'gatherRefused', reason });
}

export function expandInlineChat(): void {
  dispatch({ type: 'expanded' });
}

export function escapeInlineChat(): boolean {
  const state = useCanvasStore.getState();
  if (state.inlineChat?.anchor === 'node') {
    dismissInlineChat('escape');
    return true;
  }
  if (state.inlineChat?.expanded === true && state.inlineChat.entry === 'orb') {
    dispatch({ type: 'collapsed' });
    return true;
  }
  if (state.elementSelections.length === 0 && !state.isPicking) return false;
  dismissInlineChat('escape');
  return true;
}

export function releaseFieldFocus(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !isInteractiveTarget(active)) return;
  // Not the bubble's own input: blurring it sends the next keystrokes to the canvas as shortcuts.
  if (active.closest('.inline-morph') !== null) return;
  active.blur();
}

/** Interact parks the bubble rather than closing it; Design shows it again (ONL-2455). */
export function shownRecord(state: {
  mode: 'design' | 'interact';
  inlineChat: InlineChatRecord | null;
}): InlineChatRecord | null {
  return state.mode === 'design' ? state.inlineChat : null;
}

interface CanvasEnterKey {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
  isFieldTarget: boolean;
}

function isBareCanvasEnter(event: CanvasEnterKey): boolean {
  if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented) return false;
  if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
  return !event.isFieldTarget;
}

export function expandsOnKey(
  event: CanvasEnterKey & { record: InlineChatRecord | null },
): boolean {
  return isBareCanvasEnter(event) && event.record !== null && !event.record.expanded;
}

/** Only a lone Frame or Artifact: a multiple selection names no one subject, so Enter does nothing. */
export function nodeChatTarget(state: {
  mode: 'design' | 'interact';
  tool: CanvasTool;
  isPicking: boolean;
  inlineChat: InlineChatRecord | null;
  elementSelections: readonly unknown[];
  selectedNodeIds: readonly string[];
  renamingFrameId: string | null;
  textEditId: string | null;
  nodeKind: (id: string) => string | undefined;
}): string | null {
  if (state.inlineChat !== null || state.isPicking || !isPickerLive(state)) return null;
  if (state.elementSelections.length > 0) return null;
  if (state.renamingFrameId !== null || state.textEditId !== null) return null;
  if (state.selectedNodeIds.length !== 1) return null;
  const id = state.selectedNodeIds[0];
  if (id === undefined) return null;
  const kind = state.nodeKind(id);
  return kind === 'browser' || kind === 'artifact' ? id : null;
}

export function opensNodeChatOnKey(event: CanvasEnterKey, target: string | null): target is string {
  return isBareCanvasEnter(event) && target !== null;
}

/** The node's chat outlives no change to the node selection: it was about that one object. */
export function keepsNodeChat(record: InlineChatRecord | null, selectedNodeIds: readonly string[]): boolean {
  if (record?.anchor !== 'node') return true;
  return selectedNodeIds.length === 1 && selectedNodeIds[0] === record.anchorId;
}

function openNodeChat(nodeId: string): void {
  dispatch({ type: 'openedOnNode', nodeId });
  studio().telemetryEvent({
    event: 'inline_chat_opened',
    properties: { ...telemetryProjectFields(), anchor: 'node' },
  });
}

/** A node chat names its node, as the composer names a selected object; an element chat names the frames its elements came from. */
export function inlineSubmitFrameIds(
  record: InlineChatRecord,
  elementFrameIds: readonly string[],
): readonly string[] {
  return record.anchor === 'node' ? [record.anchorId] : elementFrameIds;
}

export function dismissInlineChat(method: InlineDismissMethod): void {
  useCanvasStore.getState().clearElementSelections(method);
}

/** Names the frames the elements came from, never the canvas frame selection, so the identity sentence reads no mismatch (ONL-2477). */
export async function submitInlineChat(draft: string): Promise<InlineSubmitVerdict> {
  const state = useCanvasStore.getState();
  if (state.inlineChat === null) return 'unchanged';
  const text = inlineSubmitText(draft);
  const images = attachmentRefs(openInlineAttachments(state));
  if (text === null && images.length === 0) return 'unchanged';
  // The surface can re-anchor or close across the await; an outcome must not land on its replacement (ONL-2455).
  const sentAnchor = state.inlineChat.anchorId;
  const anchor = inlineChatAnchor(state.inlineChat);
  const frameIds = inlineSubmitFrameIds(state.inlineChat, selectionFrameIds(state.elementSelections));
  dispatch({ type: 'sending' });
  const result = await submitChatPrompt({
    text: text ?? '',
    images,
    ...(frameIds.length === 0
      ? {}
      : {
          frames: {
            selectedFrameIds: frameIds,
            frameName: (id: string) => useCanvasStore.getState().doc?.nodes[id]?.name,
          },
        }),
  });
  const verdict = inlineSubmitVerdict(result.outcome, result.outcome === 'accepted' && result.held);
  if (result.outcome !== 'accepted') {
    sendTelemetry({
      event: 'inline_chat_send_refused',
      properties: { ...telemetryProjectFields(), outcome: result.outcome, anchor },
    });
  }
  if (verdict === 'accepted' || verdict === 'held') {
    // The set the send CARRIED, read before the await, not whatever survived it.
    studio().telemetryEvent({
      event: 'inline_chat_submitted',
      properties: {
        ...telemetryProjectFields(),
        ...inlineSubmittedFields({
          elementCount: state.elementSelections.length,
          frameCount: frameIds.length,
          imageCount: images.length,
          text: text ?? '',
          isRightRailHidden: state.hiddenRails.right,
        }),
        anchor,
      },
    });
  }
  // Ahead of the ownership guard: by id it removes only what went out, so a re-anchor mid-send
  // cannot carry a sent image onto the next bubble and deliver it twice (ONL-2549).
  if (verdict === 'accepted' || verdict === 'held') {
    clearInlineAttachments(images.map((ref) => ref.id));
  }
  if (!ownsInlineRecord(useCanvasStore.getState().inlineChat, sentAnchor)) return verdict;
  if (verdict === 'accepted') {
    useCanvasStore.getState().clearElementSelections('sent');
    return verdict;
  }
  if (verdict === 'held') {
    useCanvasStore.getState().closeInlineChat('sent');
    return verdict;
  }
  // Out of `sending` whatever turned the send away, an in-flight send included (ONL-2455).
  dispatch({ type: 'refused' });
  return verdict;
}

export function useInlineElementChat({ entry }: { entry: InlineChatEntry }): () => void {
  const entryRef = useLatestRef(entry);
  useEffect(
    () =>
      useCanvasStore.subscribe((state, prev) => {
        if (state.elementSelections === prev.elementSelections) return;
        const anchorId = freshAnchorId(
          prev.elementSelections.map((selection) => selection.evidence.id),
          state.elementSelections.map((selection) => selection.evidence.id),
        );
        if (anchorId === null) return;
        if (!opensInlineChat({ ...state, openAnchorId: state.inlineChat?.anchorId ?? null }, anchorId))
          return;
        const opened = inlineChatReducer(state.inlineChat, { type: 'opened', anchorId, entry: entryRef.current });
        if (opened !== null) state.setInlineChat(opened);
        studio().telemetryEvent({
          event: 'inline_chat_opened',
          properties: { ...telemetryProjectFields(), anchor: 'element' },
        });
      }),
    [entryRef],
  );

  useEffect(
    () =>
      useCanvasStore.subscribe((state, prev) => {
        if (state.selectedNodeIds === prev.selectedNodeIds && state.inlineChat === prev.inlineChat) return;
        if (!keepsNodeChat(state.inlineChat, state.selectedNodeIds)) state.closeInlineChat('selection-changed');
      }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const key = {
        key: event.key,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        isComposing: event.isComposing,
        defaultPrevented: event.defaultPrevented,
        isFieldTarget: isInteractiveTarget(event.target),
      };
      const state = useCanvasStore.getState();
      const target = nodeChatTarget({
        ...state,
        nodeKind: (id) => state.doc?.nodes[id]?.kind,
      });
      if (opensNodeChatOnKey(key, target)) {
        event.preventDefault();
        openNodeChat(target);
        return;
      }
      if (!expandsOnKey({ ...key, record: shownRecord(state) })) return;
      event.preventDefault();
      expandInlineChat();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    /* Visibility, not window blur: a permission dialog taking focus must not eat a draft (ONL-2455). */
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') useCanvasStore.getState().closeInlineChat('window-hidden');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return useCallback(() => {
    // With no surface open, a pane click leaves the element selection alone.
    if (useCanvasStore.getState().inlineChat === null) return;
    dismissInlineChat('click-away');
  }, []);
}
