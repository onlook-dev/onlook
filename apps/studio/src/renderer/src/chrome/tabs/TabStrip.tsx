import { MAX_PROJECT_TABS, type TabPreview } from '@studio/events';
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { MENU_SURFACE, MenuKeyHint } from '../../menu/surface.js';
import { tabShortcutGlyph } from '../../shortcuts/glyphs.js';

import { PlusIcon } from '../../icons/glyphs.js';
import { ignoreRefusal } from '../../refusal.js';
import { t } from '@studio/i18n';
import { Tab, type StudioTab } from './Tab.js';
import { useTabDrag } from './useTabDrag.js';
import { useSlideOnReorder } from './useSlideOnReorder.js';
import { useStripHover } from './useStripHover.js';
import { resumeExpansion, suspendExpansion, useChromeExpansion } from '../expansion.js';
import { PREVIEW_EXTENT_HEIGHT, TabPreviewCard, previewCardLeft } from './TabPreviewCard.js';
import {
  DIVIDER_RESERVED,
  OVERFLOW_FADE_WIDTH,
  PLUS_INSET,
  PLUS_INSET_START,
  PLUS_PADDING,
  PLUS_PADDING_BLOCK,
  PLUS_WIDTH,
  TAB_HEIGHT,
} from './geometry.js';
import '../chrome.css';

export interface TabStripProps {
  tabs: readonly StudioTab[];
  activeTabId: string;
  /** Absent, not disabled, when nothing can be created. */
  canCreate: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  /** Present, the `+` opens a menu instead of creating straight away. */
  onNewDraft?: () => void;
  isCreatingDraft?: boolean;
  /** False on the Projects Screen: there is no Workspace to stay in. */
  canNewInWorkspace?: boolean;
  canReopen?: boolean;
  onReopen?: () => void;
  onRename: (id: string, name: string) => void;
  onReload?: (id: string) => void;
  /** Still-life overrides: a gallery cannot hover or double-click. */
  hoveredTabId?: string;
  editingTabId?: string;
  /** Main reads ⌘: the chrome view never has the keyboard (ONL-2364). */
  isChordHintHeld?: boolean;
  /** `toIndex` counts the tabs this strip was given; main maps it onto its own order (ONL-2364). */
  onReorder?: (tabId: string, toIndex: number) => void;
  /** The band quiets its own controls; the strip cannot reach them (ONL-2364). */
  onDragActive?: (isActive: boolean) => void;
  /** The `+`'s own hover layer reports here, so the band grows to hold it. No tab opens one. */
  onTabTooltipOpenChange?: (id: string, isOpen: boolean) => void;
  /** Present, hovering a tab opens its preview card below the band. */
  onPreview?: (tabId: string) => Promise<TabPreview>;
  testId?: string;
}

interface ShownPreview {
  tabId: string;
  preview: TabPreview;
  left: number;
  top: number;
  now: number;
}

export function previewTab(state: {
  hoveredId: string | undefined;
  tabs: ReadonlyMap<string, StudioTab>;
  editingId?: string | undefined;
  pressedId?: string | undefined;
  /** A drag or the new-tab menu holds the strip. */
  isBlocked: boolean;
}): string | undefined {
  const { hoveredId } = state;
  if (hoveredId === undefined || state.isBlocked || !state.tabs.has(hoveredId)) return undefined;
  if (hoveredId === state.editingId || hoveredId === state.pressedId) return undefined;
  return hoveredId;
}

const HOVER_HREF = 'studio-tab-strip-hover';

/** Positional: `TAB_SHORTCUTS` binds ⌘9 to the ninth tab, not the last (ONL-2211). */
const MAX_CHORD = 9;

function chordFor(index: number): number | undefined {
  return index < MAX_CHORD ? index + 1 : undefined;
}

const HOVER_RULES = `
.studio-tab-close {
  color: inherit;
  background: transparent;
}
.studio-tab-close:hover,
.studio-tab-plus-chip:hover,
.studio-tab-plus:hover .studio-tab-plus-chip,
.studio-tab-plus[aria-expanded='true'] .studio-tab-plus-chip {
  background: color-mix(in srgb, var(--color-text-primary) 12%, transparent);
  color: var(--color-text-primary);
}
`;

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: '0 1 auto',
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  overscrollBehaviorX: 'contain',
};

/** A mask, not a painted strip: it fades the tabs themselves, whatever sits behind them. */
function fadeMask(start: boolean, end: boolean): string | undefined {
  if (!start && !end) return undefined;
  const fade = `${String(OVERFLOW_FADE_WIDTH)}px`;
  return `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 ${start ? fade : '0px'}, #000 calc(100% - ${end ? fade : '0px'}), ${end ? 'transparent' : '#000'})`;
}

const PLUS_BUTTON: CSSProperties = {
  appearance: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  width: PLUS_WIDTH,
  height: TAB_HEIGHT,
  paddingInlineStart: PLUS_INSET_START,
  paddingInlineEnd: PLUS_INSET,
  margin: 0,
  border: 0,
  /* Reserved, not drawn: two abutting 0.5px borders paint as a 1px line. */
  borderInlineStart: DIVIDER_RESERVED,
  font: 'inherit',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

const PLUS_CHIP: CSSProperties = {
  display: 'flex',
  padding: `${PLUS_PADDING_BLOCK}px ${PLUS_PADDING}px`,
  borderRadius: 'var(--radius-element)',
};

const NEW_TAB_TRIGGER = 'strip:new';
const REOPEN_GLYPH = tabShortcutGlyph('tabs.reopen') ?? '';
const NEW_TAB_GLYPH = tabShortcutGlyph('tabs.new') ?? '';

export function TabStrip({
  tabs,
  activeTabId,
  canCreate,
  onSelect,
  onClose,
  onNew,
  onNewDraft,
  isCreatingDraft = false,
  canNewInWorkspace = true,
  canReopen = false,
  onReopen,
  onRename,
  onReload,
  hoveredTabId,
  editingTabId,
  isChordHintHeld = false,
  onReorder,
  onDragActive,
  onTabTooltipOpenChange,
  onPreview,
  testId = 'tab-strip',
}: TabStripProps): React.JSX.Element {
  const [isNewSuppressed, setIsNewSuppressed] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newMenuExpansion = useChromeExpansion();
  const newMenuGeneration = useRef(0);
  const isNewReportedOpen = useRef(false);
  const isNewArmed = useRef(false);
  /** The tab last pressed keeps its card down until the pointer leaves it. */
  const [pressedId, setPressedId] = useState<string | undefined>(undefined);
  const [ownEditingId, setOwnEditingId] = useState<string | undefined>(undefined);
  const isAtLimit = tabs.length >= MAX_PROJECT_TABS;
  const [overflow, setOverflow] = useState({ start: false, end: false });
  const rowRef = useRef<HTMLDivElement>(null);

  const ids = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  // New Draft turns the active Projects tab into a strip tab without changing which tab is active.
  const [ownHoveredId, setOwnHoveredId] = useStripHover([activeTabId, ...ids].join('\n'));
  const { state: drag, begin } = useTabDrag(ids, (tabId, toIndex) => onReorder?.(tabId, toIndex));
  const byId = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab])), [tabs]);
  const shown = useMemo(() => {
    const ordered = drag.order.flatMap((id) => { const tab = byId.get(id); return tab ? [tab] : []; });
    if (ordered.length === tabs.length) return ordered;
    /* A tab opened mid-drag is not in the frozen order (⌘T is live while dragging). */
    const placed = new Set(drag.order);
    return [...ordered, ...tabs.filter((tab) => !placed.has(tab.id))];
  }, [drag.order, byId, tabs]);

  useSlideOnReorder(rowRef, drag.order, drag.draggingId);

  // A claim mid-drag resizes a WebContentsView. Stuck hover goes too: with the controls quieted, no mouseleave arrives.
  const isDragActive = drag.draggingId !== undefined;
  const onDragActiveRef = useRef(onDragActive);
  useEffect(() => {
    onDragActiveRef.current = onDragActive;
  });
  useEffect(() => {
    if (!isDragActive) return undefined;
    suspendExpansion();
    setOwnHoveredId(undefined);
    onDragActiveRef.current?.(true);
    return () => {
      resumeExpansion();
      onDragActiveRef.current?.(false);
    };
  }, [isDragActive]);

  /** Which + is mounted. Reaching the limit swaps the subtree under the pointer, and no mouseleave follows. */
  const newControl = isCreatingDraft ? 'loading' : onNewDraft !== undefined && canCreate && !isAtLimit ? 'menu' : canCreate || isAtLimit ? 'plain' : 'none';
  const reportRef = useRef(onTabTooltipOpenChange);
  useEffect(() => {
    reportRef.current = onTabTooltipOpenChange;
  });
  const armNew = (next: boolean): void => {
    isNewArmed.current = next;
    reportRef.current?.(`arm:${NEW_TAB_TRIGGER}`, next);
  };
  // The layer library fires no hide on unmount; a claim left held keeps the grown band over the app.
  useEffect(() => () => {
    newMenuGeneration.current += 1;
    setIsNewMenuOpen(false);
    newMenuExpansion.release();
    if (isNewArmed.current) armNew(false);
    if (isNewReportedOpen.current) {
      isNewReportedOpen.current = false;
      reportRef.current?.(NEW_TAB_TRIGGER, false);
    }
  }, [newControl, newMenuExpansion]);
  const hoveredId = hoveredTabId ?? ownHoveredId;
  const editingId = editingTabId ?? ownEditingId;

  const previewExpansion = useChromeExpansion();
  const previewCache = useRef(new Map<string, TabPreview>());
  const [shownPreview, setShownPreview] = useState<ShownPreview | undefined>(undefined);
  const previewTarget = previewTab({
    hoveredId: ownHoveredId,
    tabs: byId,
    editingId,
    pressedId,
    isBlocked: isDragActive || isNewMenuOpen,
  });
  // Warmed ahead of any hover, so the first card paints with its image.
  useEffect(() => {
    if (onPreview === undefined) return;
    for (const id of ids) {
      void onPreview(id).then((preview) => previewCache.current.set(id, preview), ignoreRefusal('chrome', 'tabPreview'));
    }
  }, [ids, activeTabId, onPreview]);
  useEffect(() => {
    if (previewTarget === undefined) {
      setShownPreview(undefined);
      previewExpansion.release();
      return undefined;
    }
    let isCurrent = true;
    const place = (preview: TabPreview): void => {
      const node = rowRef.current?.querySelector(`[data-testid="tab-${previewTarget}"]`);
      if (!(node instanceof HTMLElement)) return;
      const bounds = node.getBoundingClientRect();
      setShownPreview({ tabId: previewTarget, preview, left: previewCardLeft(bounds.left, window.innerWidth), top: bounds.bottom + 4, now: Date.now() });
    };
    const grown = previewExpansion.claim({ kind: 'strip', height: PREVIEW_EXTENT_HEIGHT });
    const cached = previewCache.current.get(previewTarget);
    void grown.then(() => { if (isCurrent) place(cached ?? {}); });
    const requested = onPreview?.(previewTarget) ?? Promise.resolve({});
    void Promise.all([requested.catch((error: unknown) => { ignoreRefusal('chrome', 'tabPreview')(error); return cached ?? {}; }), grown]).then(([fresh]) => {
      previewCache.current.set(previewTarget, fresh);
      if (isCurrent) place(fresh);
    }, () => undefined);
    return () => {
      isCurrent = false;
    };
  }, [previewTarget, onPreview, previewExpansion]);
  const previewName = shownPreview === undefined ? undefined : byId.get(shownPreview.tabId)?.name;

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const measure = (): void => {
      const start = row.scrollLeft > 1;
      const end = row.scrollWidth - row.clientWidth - row.scrollLeft > 1;
      setOverflow((was) => (was.start === start && was.end === end ? was : { start, end }));
    };
    const onWheel = (event: WheelEvent): void => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    // The tabs resize inside a row that can hold its own width, so the row alone never reports the overflow ending.
    for (const tab of row.children) observer.observe(tab);
    row.addEventListener('scroll', measure, { passive: true });
    row.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      row.removeEventListener('scroll', measure);
      row.removeEventListener('wheel', onWheel);
    };
  }, [tabs.length]);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const tab = row?.querySelector(`[data-testid="tab-${activeTabId}"]`);
    if (!row || !(tab instanceof HTMLElement)) return;
    const start = tab.offsetLeft - row.offsetLeft;
    const end = start + tab.offsetWidth;
    if (start < row.scrollLeft) row.scrollTo({ left: start, behavior: 'smooth' });
    else if (end > row.scrollLeft + row.clientWidth) row.scrollTo({ left: end - row.clientWidth, behavior: 'smooth' });
  }, [activeTabId, tabs.length]);

  return (
    <div
      role="tablist"
      aria-label={t('tabs.list')}
      data-testid={testId}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        // Content-sized, not the master's `flex-[1_0_0]`: its four-tab frame puts the `+` right after tab 4.
        flex: '0 1 auto',
        minWidth: 0,
        height: TAB_HEIGHT,
        /* The drag runs on window listeners, so nothing here needs the pointer; the band's rule never reaches the `+` inside the strip. */
        pointerEvents: isDragActive ? 'none' : undefined,
      }}
    >
      <style href={HOVER_HREF} precedence="medium">
        {HOVER_RULES}
      </style>

      <div
        ref={rowRef}
        data-testid="tab-strip-row"
        style={{ ...ROW, maskImage: fadeMask(overflow.start, overflow.end) }}
      >
        {shown.map((tab, index) => (
          <Tab
            key={tab.id}
            tab={tab}
            phase={index}
            isActive={tab.id === activeTabId}
            isFirst={index === 0}
            isHovered={tab.id === hoveredId}
            isEditing={tab.id === editingId}
            dragOffset={drag.draggingId === tab.id ? drag.offset : 0}
            isDragging={drag.draggingId === tab.id}
            onDragBegin={(event) => {
              setPressedId(tab.id);
              begin(tab.id, event);
            }}
            {...(isChordHintHeld && chordFor(index) !== undefined ? { chord: chordFor(index) } : {})}
            onSelect={() => {
              setPressedId(tab.id);
              onSelect(tab.id);
            }}
            onClose={() => onClose(tab.id)}
            onReload={() => onReload?.(tab.id)}
            onBeginRename={() => setOwnEditingId(tab.id)}
            onCommitRename={(name) => {
              setOwnEditingId(undefined);
              onRename(tab.id, name);
            }}
            onCancelRename={() => setOwnEditingId(undefined)}
            onHover={(isHovered) => {
              setOwnHoveredId(isHovered ? tab.id : undefined);
              if (isHovered ? tab.id !== pressedId : tab.id === pressedId) setPressedId(undefined);
            }}
          />
        ))}
      </div>

      {shownPreview !== undefined && previewName !== undefined ? (
        <TabPreviewCard name={previewName} preview={shownPreview.preview} left={shownPreview.left} top={shownPreview.top} now={shownPreview.now} />
      ) : null}

      {newControl === 'loading' ? (
        <output aria-label={t('blank.create.stage.settingUp')} data-testid="tab-strip-new-loading" style={{ ...PLUS_BUTTON, cursor: 'default' }}>
          <Spinner size="sm" shade="subtle" />
        </output>
      ) : null}

      {newControl === 'menu' ? (
        <span
          className="region-no-drag"
          style={{ display: 'flex', flex: '0 0 auto' }}
          onMouseEnter={() => armNew(true)}
          onMouseLeave={() => armNew(false)}
        >
          <Tooltip
            content={t('tabs.new')}
            placement="below"
            alignment="end"
            focusTrigger="always"
            hasHoverIndication={false}
            /* Reported like the plain +'s: an unreported tooltip renders inside the band-high view and flickers between two seats. */
            isOpen={isNewMenuOpen || isDragActive ? false : undefined}
            {...(onTabTooltipOpenChange
              ? { onOpenChange: (open: boolean) => { isNewReportedOpen.current = open; onTabTooltipOpenChange(NEW_TAB_TRIGGER, open); } }
              : {})}
          >
          <DropdownMenu
            hasChevron={false}
            placement="below"
            style={MENU_SURFACE}
            isMenuOpen={isNewMenuOpen}
            onOpenChange={(open) => {
              const generation = ++newMenuGeneration.current;
              // The full view, as the git menu claims: a light-dismiss click must land in the chrome page.
              if (open) void newMenuExpansion.claim({ kind: 'full' }).then(() => {
                if (newMenuGeneration.current === generation) setIsNewMenuOpen(true);
              });
              else {
                setIsNewMenuOpen(false);
                newMenuExpansion.release();
              }
            }}
            data-testid="tab-strip-new"
            button={{
              label: t('tabs.new'),
              variant: 'ghost',
              size: 'sm',
              isIconOnly: true,
              style: PLUS_BUTTON,
              className: 'studio-tab-plus',
              icon: (
                <span className="studio-tab-plus-chip" style={PLUS_CHIP}>
                  <Icon icon={PlusIcon} size="md" color="inherit" />
                </span>
              ),
            }}
          >
            {canReopen && onReopen !== undefined ? (
              <DropdownMenuItem label={t('tabs.newMenu.reopen')} endContent={<MenuKeyHint keys={REOPEN_GLYPH} />} onClick={onReopen} />
            ) : null}
            <DropdownMenuItem label={t('tabs.newMenu.draft')} onClick={onNewDraft} />
            {canNewInWorkspace ? (
              <DropdownMenuItem label={t('tabs.newMenu.sameWorkspace')} endContent={<MenuKeyHint keys={NEW_TAB_GLYPH} />} onClick={onNew} />
            ) : null}
          </DropdownMenu>
          </Tooltip>
        </span>
      ) : newControl === 'plain' ? (
      <Tooltip
        content={isAtLimit ? t('tabs.newAtLimit', { max: MAX_PROJECT_TABS }) : t('tabs.new')}
        placement="below"
        alignment="end"
        focusTrigger="always"
        hasHoverIndication={false}
        /* `isOpen`, not `isEnabled`: `isEnabled` cannot close a layer already open (@astryxdesign/core 0.1.9). */
        isOpen={isNewSuppressed || isDragActive ? false : undefined}
        {...(onTabTooltipOpenChange
          ? { onOpenChange: (open: boolean) => { isNewReportedOpen.current = open; onTabTooltipOpenChange(NEW_TAB_TRIGGER, open); } }
          : {})}
      >
      <button
        type="button"
        className="region-no-drag"
        aria-label={t('tabs.new')}
        aria-disabled={isAtLimit ? true : undefined}
        data-testid="tab-strip-new"
        onMouseEnter={() => {
          setIsNewSuppressed(false);
          armNew(true);
        }}
        onMouseLeave={() => {
          setIsNewSuppressed(false);
          armNew(false);
        }}
        onMouseDown={() => {
          // At the limit the press does nothing, so the tooltip saying why stays up.
          if (isAtLimit) return;
          setIsNewSuppressed(true);
          if (isNewReportedOpen.current) onTabTooltipOpenChange?.(NEW_TAB_TRIGGER, false);
          // No mouseleave follows the view swap to retract the arm.
          armNew(false);
          onNew();
        }}
        style={isAtLimit ? { ...PLUS_BUTTON, cursor: 'default', color: 'var(--color-text-disabled)' } : PLUS_BUTTON}
      >
        <span
          className={isAtLimit ? undefined : 'studio-tab-plus-chip'}
          style={PLUS_CHIP}
        >
          <Icon icon={PlusIcon} size="md" color="inherit" />
        </span>
      </button>
      </Tooltip>
      ) : null}
    </div>
  );
}
