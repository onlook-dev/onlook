import { type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { ShimmerText } from '@studio/chat-ui';
import type { TabStatus } from '@studio/events';

import { CloseSmallIcon, GlyphLoadingCircle, ReloadIcon } from '../../icons/glyphs.js';
import { CHORD_HEIGHT, CHORD_WIDTH, ChordCap } from '../ChordCap.js';
import { StatusDot } from '../StatusDot.js';
import { t } from '@studio/i18n';
import { RenameField } from '../../RenameField.js';
import {
  CLOSE_SIZE,
  DIVIDER,
  DIVIDER_RESERVED,
  LABEL_FADE,
  MIN_TAB_WIDTH,
  TAB_HEIGHT,
  TAB_PADDING_INLINE,
  TAB_WIDTH,
} from './geometry.js';
import { LAYER } from '../../overlay/layers.js';
import '../chrome.css';

export type TrailingSlot = 'chord' | 'reload' | 'close' | 'working' | 'none';

/** The trailing slot holds one thing; a working tab's spinner gives way to the ✕ on hover (ONL-2593). */
export function trailingSlot(state: {
  isDead: boolean;
  isWorking: boolean;
  isActive: boolean;
  isHovered: boolean;
  isEditing: boolean;
  hasChord: boolean;
}): TrailingSlot {
  if (state.hasChord && !state.isEditing) return 'chord';
  if (state.isDead) return 'reload';
  if (state.isEditing) return 'none';
  if (state.isHovered) return 'close';
  if (state.isWorking) return 'working';
  return state.isActive ? 'close' : 'none';
}

/** A turn parked on a question or approval is waiting on the person, not working: the dot says so, and nothing spins. */
export function isTabWorking(tab: Pick<StudioTab, 'isWorking' | 'status'>): boolean {
  return Boolean(tab.isWorking) && tab.status !== 'waiting';
}

export interface StudioTab {
  id: string;
  name: string;
  isWorking?: boolean;
  status?: TabStatus;
  health?: 'gone' | 'failed';
}

export interface TabProps {
  tab: StudioTab;
  /** Position in the strip; staggers the shimmer sweep (ONL-2200). */
  phase: number;
  isActive: boolean;
  /** The first tab draws its leading divider even when inactive: on the projects list none is active. */
  isFirst: boolean;
  isHovered: boolean;
  isEditing: boolean;
  /** Positional, so the tenth tab and beyond carry none (ONL-2364). Absent when ⌘ is not down. */
  chord?: number;
  dragOffset?: number;
  isDragging?: boolean;
  onDragBegin?: (event: { clientX: number }) => void;
  onSelect: () => void;
  onClose: () => void;
  onReload: () => void;
  onBeginRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onHover: (isHovered: boolean) => void;
}

// On the box, not only the text inside it: without them the strut is the browser's 16px and the glyphs ride 1.25px low.
const LABEL_TYPE: CSSProperties = {
  fontSize: 'var(--text-supporting-size)',
  lineHeight: 'var(--text-supporting-leading)',
};

const LABEL_BOX: CSSProperties = {
  ...LABEL_TYPE,
  flex: '1 1 auto',
  minWidth: 0,
  display: 'block',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

// The label's only overflow treatment: a gradient mask, not an ellipsis, and off the `Text`, whose shimmer paints its own gradient.
// The mask reaches zero at the OVERLAY's leading edge, not the label's — width varies, because the ⌘ legend is wider than the ✕.
function fadeMask(overlayWidth: number): string {
  if (overlayWidth === 0) {
    return `linear-gradient(to right, black calc(100% - ${LABEL_FADE}px), transparent 100%)`;
  }
  return `linear-gradient(to right, black calc(100% - ${overlayWidth + LABEL_FADE}px), transparent calc(100% - ${overlayWidth}px))`;
}

const FIELD_METRICS: CSSProperties = {
  ...LABEL_TYPE,
  flex: '1 1 auto',
  fontWeight: 'var(--font-weight-medium)',
};

const CLOSE_BUTTON: CSSProperties = {
  appearance: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  padding: 0,
  margin: 0,
  border: 0,
  font: 'inherit',
  /* No `color` or `background`: an inline one outranks `.studio-tab-close`'s :hover in TabStrip and the lift silently does nothing. */
  borderRadius: 'var(--radius-element)',
  cursor: 'pointer',
};

/** Into the padding by eye: the cross's ink ends 7px inside its box, and the full 7 read as too far. */
const CLOSE_NUDGE = 5;

export function Tab({
  tab,
  phase,
  isActive,
  isFirst,
  isHovered,
  isEditing,
  chord,
  dragOffset = 0,
  isDragging = false,
  onDragBegin,
  onSelect,
  onClose,
  onReload,
  onBeginRename,
  onCommitRename,
  onCancelRename,
  onHover,
}: TabProps): React.JSX.Element {
  const isDead = tab.health !== undefined;
  const isWorking = isTabWorking(tab);
  const slot = trailingSlot({
    isDead,
    isWorking,
    isActive,
    isHovered,
    isEditing,
    hasChord: chord !== undefined,
  });
  const isChordShown = slot === 'chord';
  const isControlShown = slot === 'reload' || slot === 'close';
  // Only `done` is cleared by looking: the host drops it on activation. `waiting` is a condition — sitting on a tab is not answering it.
  // Working shows as the spinner in the close slot; the dot keeps done and waiting (ONL-2593).
  const shownStatus = (isActive && tab.status === 'done') || tab.status === 'working' ? undefined : tab.status;
  const overlayWidth = isChordShown ? CHORD_WIDTH : isControlShown || slot === 'working' ? CLOSE_SIZE : 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Only when the tab itself has focus: Space bubbling from the rename field would be swallowed (ONL-2205).
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const closeTab = (event: MouseEvent): void => {
    // Closing must not also select the tab being removed.
    event.stopPropagation();
    event.preventDefault();
    onClose();
  };

  const reloadTab = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    onReload();
  };

  return (
    <div
      // Not a <button>: it holds the ✕ button and, while renaming, an <input>.
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className="region-no-drag"
      data-testid={`tab-${tab.id}`}
      data-active={isActive ? 'true' : undefined}
      data-health={tab.health}
      // Mouse-DOWN, not click: a press on a control is instant and never a drag.
      onMouseDown={isEditing ? undefined : (event) => {
        onSelect();
        onDragBegin?.(event);
      }}
      onDoubleClick={onBeginRename}
      onMouseEnter={() => onHover(true)}
      onMouseMove={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        flex: '0 1 auto',
        width: TAB_WIDTH,
        minWidth: MIN_TAB_WIDTH,
        maxWidth: TAB_WIDTH,
        height: TAB_HEIGHT,
        paddingInline: TAB_PADDING_INLINE,
        position: 'relative',
        background: isActive
          ? 'var(--color-background-gray)'
          : isHovered
            ? 'var(--color-overlay-hover)'
            : 'transparent',
        transform: dragOffset === 0 ? undefined : `translateX(${String(dragOffset)}px)`,
        /* The RELEASE only: a dragged tab tracks the pointer with no transition. */
        transition: isDragging ? undefined : 'transform 200ms cubic-bezier(0.22, 1.2, 0.36, 1)',
        zIndex: isDragging ? LAYER.raised : undefined,
        cursor: isDragging ? 'grabbing' : undefined,
        borderInlineStart: isActive || isFirst ? DIVIDER : DIVIDER_RESERVED,
        borderInlineEnd: DIVIDER,
        /* Part of the way to primary: all of it would make a hovered tab look active. */
        color: isActive
          ? 'var(--color-text-primary)'
          : isHovered
            ? 'color-mix(in srgb, var(--color-text-primary) 35%, var(--color-text-secondary))'
            : 'var(--color-text-secondary)',
        userSelect: 'none',
      }}
    >
      <StatusDot testId="tab-status" phase={phase} {...(shownStatus === undefined ? {} : { status: shownStatus })} />

      {isEditing ? (
        <RenameField
          initialValue={tab.name}
          label={t('tabs.rename')}
          testId={`tab-rename-${tab.id}`}
          style={FIELD_METRICS}
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span
          style={{ ...LABEL_BOX, maskImage: fadeMask(overlayWidth), WebkitMaskImage: fadeMask(overlayWidth) }}
          data-testid={`tab-label-${tab.id}`}
        >
          <ShimmerText
            isActive={isWorking && !isActive}
            type="supporting"
            weight="medium"
            hasGlow={false}
            base="var(--color-text-secondary)"
            crest="var(--color-text-primary)"
            phase={phase}
          >
            {tab.name}
          </ShimmerText>
        </span>
      )}

      {/* OVER the label's faded tail, out of flow: showing any of these moves nothing and costs the label no width. */}
      <span
        style={{
          position: 'absolute',
          insetInlineEnd: TAB_PADDING_INLINE,
          top: '50%',
          transform: 'translateY(-50%)',
          height: CHORD_HEIGHT,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ChordCap keyLabel={String(chord ?? '')} isShown={isChordShown} testId={`tab-chord-${tab.id}`} />
      </span>

      <span
        style={{
          position: 'absolute',
          insetInlineEnd: TAB_PADDING_INLINE - CLOSE_NUDGE,
          top: '50%',
          transform: 'translateY(-50%)',
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
          visibility: isControlShown ? 'visible' : 'hidden',
        }}
      >
        <button
          type="button"
          className="studio-tab-close"
          aria-label={isDead ? t('tabs.reload') : t('tabs.close', { name: tab.name })}
          title={isDead ? t('tabs.failed') : undefined}
          data-testid={isDead ? `tab-reload-${tab.id}` : `tab-close-${tab.id}`}
          onMouseDown={isDead ? reloadTab : closeTab}
          onClick={(event) => event.stopPropagation()}
          style={CLOSE_BUTTON}
        >
          {isDead ? <Icon icon={ReloadIcon} size="sm" color="inherit" /> : <Icon icon={CloseSmallIcon} size="lg" color="inherit" />}
        </button>
      </span>

      {slot === 'working' && (
        <span
          data-testid={`tab-working-${tab.id}`}
          aria-hidden
          style={{
            position: 'absolute',
            insetInlineEnd: TAB_PADDING_INLINE - CLOSE_NUDGE,
            top: '50%',
            transform: 'translateY(-50%)',
            width: CLOSE_SIZE,
            height: CLOSE_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'flex', animation: 'frame-reload-turn 900ms linear infinite' }}>
            <GlyphLoadingCircle size={18} />
          </span>
        </span>
      )}
    </div>
  );
}
