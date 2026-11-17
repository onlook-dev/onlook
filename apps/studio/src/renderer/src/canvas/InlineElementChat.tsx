import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useStore as useFlowStore } from '@xyflow/react';
import { ChatComposerDrawer } from '@astryxdesign/core/Chat';
import { Icon } from '@astryxdesign/core/Icon';
import {
  InlineElementBall,
  InlineElementBubble,
  isComposerConnected,
  type InlineElementBubbleStrings,
} from '@studio/chat-ui';
import { useAgentStore } from '../agent/store.js';
import { DRAWER_STYLE } from '../chat/elementDrawer.js';
import { isChatSubmitRegistered } from '../chat/submitRegistry.js';
import { t } from '@studio/i18n';
import { SendArrowIcon, SparkleIcon } from '../icons/glyphs.js';
import {
  acceptInlineFiles,
  openInlineAttachments,
  removeInlineAttachment,
} from './inlineAttachments.js';
import {
  anchorPaneBand,
  inlineAnchorPoint,
  inlinePlacementFor,
  type FlowBox,
  type InlineChatRecord,
} from './inlinePlacement.js';
import { chipRowCount, InlineChipRow } from './InlineChipRow.js';
import { useCanvasStore } from './store.js';
import { INLINE_CHAT_EXIT_MS, type InlineChatExit } from './useInlineChatPresence.js';
import { useAltHeld } from './useAltHeld.js';
import { useOrbMorph } from './useOrbMorph.js';
import { safeScale } from './frame/geometry.js';
import {
  draftInlineChat,
  escapeInlineChat,
  dismissInlineChat,
  expandInlineChat,
  inlineChatStatus,
  latchInlineChat,
  submitInlineChat,
} from './useInlineElementChat.js';
import { LAYER } from '../overlay/layers.js';
import './canvas.css';

const CANVAS_INERT = 'nodrag nopan nowheel';

/** A send clears the chips in one tick; a live read would collapse the chip row mid-exit. */
function useHeldWhile<T>(value: T, hold: boolean): T {
  const [held, setHeld] = useState(value);
  if (!hold && held !== value) setHeld(value);
  return hold ? held : value;
}

/**
 * The fade is one opacity on the surface root, and stops its pointer events: with a draft, ⌥ is
 * editing it (⌥⌫, ⌥←, ⌥E); with an attachment held, it would take the pill's X too (ONL-2549).
 */
export function inlineMeasureFade(facts: {
  isMeasuring: boolean;
  draft: string;
  attachments: number;
}): boolean {
  return facts.isMeasuring && facts.draft === '' && facts.attachments === 0;
}

/** The exit's length, owned by `INLINE_CHAT_EXIT_MS` so the unmount and the keyframes agree. */
function exitStyle(exit: InlineChatExit): CSSProperties {
  return { '--inline-bubble-exit': `${String(INLINE_CHAT_EXIT_MS[exit])}ms` } as CSSProperties;
}

export function InlineElementChat({
  record,
  box,
  frame,
  exit,
}: {
  record: InlineChatRecord;
  box: FlowBox;
  /** The anchor's frame in flow units, which bounds where the surface may sit. */
  frame: { x: number; width: number };
  exit: InlineChatExit | null;
}): React.JSX.Element | null {
  const isLeaving = exit !== null;
  const paneHeight = useFlowStore((state) => state.height);
  const translateY = useFlowStore((state) => state.transform[1]);
  const zoom = useFlowStore((state) => state.transform[2]);

  const selections = useHeldWhile(
    useCanvasStore((state) => state.elementSelections),
    isLeaving,
  );
  const attachments = useHeldWhile(
    useCanvasStore((state) => openInlineAttachments(state).drafts),
    isLeaving,
  );
  const removeElementSelection = useCanvasStore((state) => state.removeElementSelection);
  /* Shift-added elements only: the page's selection box represents the anchor (ONL-2455). */
  const chips = useMemo(() => selections.slice(1), [selections]);

  const connectionStatus = useHeldWhile(
    useAgentStore((state) => state.connection.status),
    isLeaving,
  );
  /* The registry has no subscription of its own; the agent store read above is what re-renders this. */
  const hasSendPath = useHeldWhile(isChatSubmitRegistered(), isLeaving);

  const strings = useMemo<InlineElementBubbleStrings>(
    () => ({
      placeholder: t('chat.inline.placeholder'),
    }),
    [],
  );

  const placement = record.placement;
  useEffect(() => {
    if (placement !== null || isLeaving) return;
    const band = anchorPaneBand(box, { x: 0, y: translateY, zoom });
    latchInlineChat(inlinePlacementFor({ ...band, paneHeight }));
  }, [placement, isLeaving, box, translateY, zoom, paneHeight]);

  const side = placement ?? 'above';
  const surfaceRef = useOrbMorph({ expanded: record.expanded, side });
  const isMeasuring = useAltHeld();
  const liveDraft = useCanvasStore((state) =>
    state.inlineChat?.anchorId === record.anchorId ? state.inlineChat.draft : null,
  );
  // An exiting surface keeps the last draft it showed while it fades.
  const [lastDraft, setLastDraft] = useState(liveDraft ?? '');
  if (liveDraft !== null && liveDraft !== lastDraft) setLastDraft(liveDraft);
  const draft = liveDraft ?? lastDraft;
  /* Fixed at mount: the entry keyframes play once, for the form first shown. */
  const [enterForm] = useState(record.expanded ? 'input' : 'ball');
  const point = inlineAnchorPoint(box, side, zoom, frame);
  const attachFailure = useHeldWhile(
    useCanvasStore((state) => openInlineAttachments(state).failure),
    isLeaving,
  );
  const status = inlineChatStatus(record, attachFailure);

  const scale = safeScale(zoom);

  // A press or right-click anywhere else closes it outright; there is no orb to leave behind (ONL-2744).
  useEffect(() => {
    if (isLeaving) return;
    const onPress = (event: Event): void => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-testid="inline-element-anchor"]') !== null) return;
      // A press on a Frame or Artifact is a pick: the bubble moves to the new element instead of closing (ONL-2744).
      if (target instanceof Element && target.closest('.react-flow__node') !== null && event.type === 'pointerdown') return;
      dismissInlineChat('click-away');
    };
    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('contextmenu', onPress, true);
    return () => {
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('contextmenu', onPress, true);
    };
  }, [isLeaving]);

  // Shown once the side is latched, so the first painted frame is already on the side it keeps.
  if (placement === null) return null;
  // Canvas content, never the top layer: the toolbar and the Right Rail paint over it as they do over a node (ONL-2521).
  return (
    <div
      data-testid="inline-element-anchor"
      role="dialog"
      aria-label={t('chat.inline.label')}
      className={CANVAS_INERT}
      style={{
        position: 'absolute',
        left: point.left,
        top: point.top,
        zIndex: LAYER.canvasOverlay,
        // Card-sized even while only the orb shows, so the box takes no press and one on its empty rest reaches the frame (ONL-2455).
        pointerEvents: 'none',
        transform: `scale(${String(1 / scale)}) translate(-50%, ${side === 'above' ? '-100%' : '0'})`,
        transformOrigin: '0 0',
      }}
    >
      <div
        className={`${CANVAS_INERT} inline-bubble-motion`}
        data-enter={enterForm}
        data-side={side}
        data-exit={exit ?? undefined}
        inert={isLeaving}
        style={exit === null ? undefined : exitStyle(exit)}
        /* The stop covers the pane; a click needs none, since React Flow filters pane clicks to the pane element. */
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          ref={surfaceRef}
          className="inline-morph"
          data-measuring={
            inlineMeasureFade({ isMeasuring, draft, attachments: attachments.length })
              ? 'true'
              : undefined
          }
          data-side={side}
          data-state={record.expanded ? 'open' : 'orb'}
        >
          <div className="inline-morph-shape" aria-hidden="true" />
          <div className="inline-morph-content" inert={!record.expanded}>
            <InlineElementBubble
              surface="layer"
              isCollapsed={!record.expanded}
              strings={strings}
              draft={draft}
              onDraftChange={draftInlineChat}
              onSubmit={(text) => {
                void submitInlineChat(text);
              }}
              onDismiss={() => {
                escapeInlineChat();
              }}
              onFiles={acceptInlineFiles}
              sendIcon={<Icon icon={SendArrowIcon} />}
              // No chip term: an element is the prompt's subject, not its request (ONL-2455).
              hasComposerPayload={attachments.length > 0}
              isSessionUsable={hasSendPath && isComposerConnected(connectionStatus)}
              {...(status === undefined ? {} : { status })}
              {...(chipRowCount(chips, attachments) === 0
                ? {}
                : {
                    drawer: (
                      <ChatComposerDrawer
                        data-testid="inline-element-bubble-drawer"
                        style={DRAWER_STYLE}
                      >
                        <InlineChipRow
                          chips={chips}
                          attachments={attachments}
                          onRemove={removeElementSelection}
                          onRemoveAttachment={removeInlineAttachment}
                        />
                      </ChatComposerDrawer>
                    ),
                  })}
            />
          </div>
          <InlineElementBall
            label={t('chat.inline.ball')}
            icon={<Icon icon={SparkleIcon} />}
            onExpand={expandInlineChat}
            isExpanded={record.expanded}
            count={selections.length}
            hasDraft={draft.trim().length > 0 || attachments.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
