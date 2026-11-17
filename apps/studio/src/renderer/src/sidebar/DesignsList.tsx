import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';
import { ShimmerText, SHIMMER_CREST_ALPHA, SHIMMER_STAGGER_MS, SHIMMER_SWEEP_MS } from '@studio/chat-ui';

import { CORNER_FOOTPRINT } from '../canvas/cornerPlacement.js';
import { artifactAccentAttrs } from '../canvas/artifactAccent.js';
import { CanvasNodeMenu } from '../canvas/menu/CanvasNodeMenu.jsx';
import { focusedFrameId } from '../canvas/elementPicking.js';
import type { CanvasFlowNode } from '../canvas/model.js';
import { useCanvasStore } from '../canvas/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { t } from '@studio/i18n';
import { designRowFacts, designRowGlyph, type DesignRowFacts } from './designRow.js';
import { designTreeRows, isReorderableRow } from './designTree.js';
import { canvasNodeLabeller } from '../nodeLabel.js';
import { useArtifactListing } from '../canvas/artifact/listing.js';
import { dropMarkFor, orderForDrop } from './designOrder.js';
import { DropLine } from '../reorder/DropLine.jsx';
import { useRowDrag } from '../reorder/useRowDrag.js';
import { RenameField } from './RenameField.jsx';
import { renameArtifactTitle } from '../canvas/artifact/listing.js';
import { ChevronDownIcon } from '../icons/glyphs.js';
import {
  DESIGN_LEADING_12,
  HAIRLINE,
  LIST_PADDING_INLINE,
  ROW_BOX,
  ROW_CARET_BOX,
  ROW_GAP,
  ROW_ICON_BOX,
  ROW_INDENT,
  ROW_PADDING_INLINE,
  SECTION_PADDING_INLINE,
  SELECTED_INK,
} from '../panels/rowGeometry.js';
import { studio } from '../bridge.js';
import './sidebar.css';

// The row is hand-stacked: the library's nav rows are 28/32/36 against this design's 23, a gap for the design-system owner (ONL-2486).

/** Every row a drag may land beside — the top-level objects of this list alone, so a drop index cannot cross into the Pages section or into a Section's contents. */
const DESIGN_ROW_SELECTOR = '[data-design-row]';

/** The string's natural width, cached by font and string: `scrollWidth` lies under `text-overflow: ellipsis`, reporting ~0 for a visibly cut-off label (ONL-2486). */
const textWidthCache = new Map<string, number>();
let measureContext: CanvasRenderingContext2D | null = null;

function naturalTextWidth(text: string, font: string): number {
  const key = `${font}|${text}`;
  const cached = textWidthCache.get(key);
  if (cached !== undefined) return cached;
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return 0;
  measureContext.font = font;
  const width = measureContext.measureText(text).width;
  textWidthCache.set(key, width);
  return width;
}

let fontSwap: Promise<void> | null = null;

/** `getComputedStyle` reports the declared stack before and after the swap, so a width cached under the fallback face is indistinguishable from the real one (ONL-2650). */
function widthsAfterFontSwap(): Promise<void> {
  fontSwap ??= document.fonts.ready.then(() => {
    textWidthCache.clear();
  });
  return fontSwap;
}

/** Sized to a design name; the default 73ch reads as a pulse on a short label. */
const LABEL_SWEEP_PERIOD_CH = 14;

/** Period and delay come from ShimmerText's exports, or the glyph and label drift apart. */
const ROW_WORKING_PULSE = `
@keyframes studio-design-row-icon-pulse {
  0%, 100% { color: var(--studio-row-pulse-floor); }
  50%      { color: color-mix(in srgb, var(--studio-row-pulse-crest) ${String(SHIMMER_CREST_ALPHA)}%, var(--studio-row-pulse-floor)); }
}
.design-row-icon[data-working] {
  animation: studio-design-row-icon-pulse ${String(SHIMMER_SWEEP_MS)}ms ease-in-out infinite;
  animation-delay: calc(var(--studio-shimmer-phase, 0) * ${String(SHIMMER_STAGGER_MS)}ms);
}
/* Under reduced motion the icon settles on the row's inherited ink, which is the pulse's floor. */
@media (prefers-reduced-motion: reduce) {
  .design-row-icon[data-working] { animation: none; }
}
`;

/** The caret beside a Section row, not inside it: a row is a `<button>`, which may not hold another one. */
function RowCaret({ id, isOpen, depth, isSelected }: {
  id: string;
  isOpen: boolean;
  depth: number;
  /** A Section is never element-focused, so selection alone decides its ink. */
  isSelected: boolean;
}): React.JSX.Element {
  const toggleSectionClosed = useCanvasStore((state) => state.toggleSectionClosed);
  const hoverNode = useCanvasStore((state) => state.hoverNode);
  return (
    <button
      type="button"
      data-testid="sidebar-section-caret"
      aria-expanded={isOpen}
      aria-label={t(isOpen ? 'sidebar.section.hide' : 'sidebar.section.show')}
      className="design-row-caret"
      onClick={() => {
        toggleSectionClosed(id);
      }}
      /* The caret covers the box its row reserves, so without these the row un-lights as the pointer reaches its only control. */
      onMouseEnter={() => {
        hoverNode(id);
      }}
      onMouseLeave={() => {
        hoverNode(null);
      }}
      style={{
        position: 'absolute',
        insetInlineStart: ROW_PADDING_INLINE + depth * ROW_INDENT,
        top: '50%',
        transform: 'translateY(-50%)',
        appearance: 'none', border: 0, background: 'transparent', padding: 0, margin: 0,
        width: ROW_CARET_BOX, height: ROW_CARET_BOX,
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        color: isSelected ? SELECTED_INK : 'var(--color-text-secondary)',
      }}
    >
      <Icon
        icon={ChevronDownIcon}
        color="inherit"
        style={{
          width: ROW_CARET_BOX, height: ROW_CARET_BOX,
          transform: isOpen ? undefined : 'rotate(-90deg)',
          transition: 'transform 120ms ease',
        }}
      />
    </button>
  );
}

/** One row of the Designs list — one node of any kind; `designRow.ts` owns its glyph and label. */
export function DesignRow({ id, facts, label, isSelected, isWorking, phase, depth, reservesCaret }: {
  id: string;
  /** What this row's kind needs — the glyph, the accent and the label all read it. */
  facts: DesignRowFacts;
  /** Resolved against the whole list, since a title two sketches share needs its tag (ONL-2568). */
  label: string;
  isSelected: boolean;
  /** The running turn is touching this frame (ONL-2194). */
  isWorking: boolean;
  /** This row's position in the list — staggers its shimmer sweep (ONL-2200). */
  phase: number;
  /** How many Sections hold this row; its indent, and the box it leaves for the caret beside it (ONL-2661). */
  depth: number;
  /** True while the list holds a caret somewhere, so every glyph in it lines up under the ones that have one. */
  reservesCaret: boolean;
}): React.JSX.Element {
  const selectFrame = useCanvasStore((state) => state.selectFrame);
  const hoverNode = useCanvasStore((state) => state.hoverNode);
  const beginRename = useCanvasStore((state) => state.beginRename);
  const renameFrame = useCanvasStore((state) => state.renameFrame);
  const endRename = useCanvasStore((state) => state.endRename);
  /** The shared hover — true whether the pointer is on this row OR its frame. */
  const isHighlighted = useCanvasStore((state) => state.hoveredNodeId === id);
  const isRenaming = useCanvasStore((state) => state.renamingFrameId === id);
  /** The frame the element selections were picked in (ONL-2455). */
  const isFocused = useCanvasStore((state) => focusedFrameId(state) === id);
  /** ONE accent treatment: selected and element-focused paint the same row, never two competing ones. */
  const isAccented = isSelected || isFocused;
  const isArriving = useCanvasStore((state) => state.inspiration?.frameId === id);

  /** Enabled only while the name is cut off: a tooltip that repeats a label you can already read is noise. */
  const rowRef = useRef<HTMLElement | null>(null);
  const labelRef = useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  /* Re-registering is the re-measure, since the shared observer fires on registration: the caret reserve and the indent give the label width without resizing the row (ONL-2650). */
  useEffect(() => {
    const el = labelRef.current;
    const row = rowRef.current;
    if (!el || !row) return;
    const font = getComputedStyle(el).font;
    const measure = (): void => {
      /* The live node, never the captured one: the font-swap callback can land after a re-render replaced the label, and a detached node measures 0. */
      const current = labelRef.current;
      if (!current) return;
      /* Half a pixel, not zero: a label that fits exactly flickers the tooltip as the panel is dragged. */
      setIsTruncated(naturalTextWidth(label, font) > current.clientWidth + 0.5);
    };
    /* A fallback face measures narrower, so a label can start fitting and stop when the webfont lands. */
    void widthsAfterFontSwap().then(measure);
    /* The row's box, never the label's: Astryx's `Text` holds that node's one callback slot in the shared observer, and the registration entry carries `target` alone. */
    observeResize(row, measure);
    return () => {
      unobserveResize(row);
    };
    // `isRenaming` swaps the row's element type and `isWorking` swaps the label's, so without them the shared observer keeps a detached node and every name measures as cut off (ONL-2650).
  }, [label, reservesCaret, depth, isRenaming, isWorking]);
  if (isArriving) return <></>;
  return (
    /* The tooltip anchors to the row, not to its label: the label ends wherever the name does, which puts `end` in the middle of the panel. */
    <>
    <style href="studio-design-row-working" precedence="medium">
      {ROW_WORKING_PULSE}
    </style>
    <Tooltip content={label} placement="end" isEnabled={isTruncated}>
    {/* `as="button"` does not widen the props type, so `type="button"` is a compile error and this button takes the UA default of `submit`. */}
    <HStack
      // A `<button>` may not contain an `<input>`, so the row steps down while the rename field is mounted.
      as={isRenaming ? 'div' : 'button'}
      ref={rowRef}
      gap={ROW_GAP}
      vAlign="center"
      width="100%"
      // The row reports the modifier, never the verb: shift gathers into the shared multi-selection (ONL-2043).
      onClick={(event) => {
        selectFrame(id, event.shiftKey);
      }}
      // The store refuses non-document ids, so no per-row guard is needed here.
      onDoubleClick={() => {
        beginRename(id);
      }}
      // The canvas draws its hover ring on the frame this row names.
      onMouseEnter={() => {
        hoverNode(id);
      }}
      onMouseLeave={() => {
        hoverNode(null);
      }}
      /* The frame SELECTION alone — element focus tints, and joins no selection (ONL-2455). */
      aria-current={isSelected ? 'true' : undefined}
      data-hovered={isHighlighted ? 'true' : undefined}
      data-frame-id={id}
      /* An attribute because a spec cannot ask a component whether the name is cut off. */
      data-truncated={isTruncated ? 'true' : undefined}
      data-testid="sidebar-frame"
      /* The accent scope, on the row: every accented part of it reads the family from here. */
      {...artifactAccentAttrs(facts.kind === 'artifact')}
      // Resting and hover ink live in styles.css; the accented pair is inline below, where it beats the hover rule.
      className="design-row"
      style={{
        ...ROW_BOX,
        paddingInlineStart: ROW_PADDING_INLINE + depth * ROW_INDENT,
        backgroundColor: isAccented ? 'var(--color-accent-muted)' : undefined,
        // Unset when resting, so the `.design-row` hover rule can reach the ink.
        color: isAccented ? SELECTED_INK : undefined,
        /* Follows the row's ink so the pulse floor matches it. */
        ...(isAccented
          ? {
              ['--studio-row-ink-rest' as string]: SELECTED_INK,
              /* Accent pair on the accented row only, the same pair ShimmerText gets. */
              ['--studio-row-pulse-floor' as string]: 'var(--color-accent)',
              ['--studio-row-pulse-crest' as string]: SELECTED_INK,
            }
          : {}),
        /* On the row: ShimmerText's wrapper is the icon's sibling, so the icon would not inherit it. */
        ['--studio-shimmer-phase' as string]: phase,
      } as React.CSSProperties}
    >
      {/* The caret's box, held open whether or not this row has one, so every glyph in the list sits on one line; a list with no caret in it reserves nothing (ONL-2661). */}
      {reservesCaret && <span aria-hidden style={{ width: ROW_CARET_BOX, flexShrink: 0 }} />}
      <Icon
        icon={designRowGlyph(facts)}
        color="inherit"
        className="design-row-icon"
        {...(isWorking ? { 'data-working': '' } : {})}
        // Inline: the icon ramp is 12/16/20/24 and the design is 14, and `Icon` spreads `...props` after `stylex.props`.
        style={{ width: ROW_ICON_BOX, height: ROW_ICON_BOX, flexShrink: 0 }}
      />
      {isRenaming ? (
        <RenameField
          label={t('sidebar.frame.renameLabel')}
          name={facts.kind === 'artifact' ? label : facts.name}
          testId="sidebar-frame-rename"
          onCommit={(name) => {
            // An artifact's row renames the artifact, the one name it shows (ONL-2593).
            if (facts.kind === 'artifact') {
              endRename();
              void renameArtifactTitle(facts.artifactId, name);
              return;
            }
            renameFrame(id, name);
          }}
          onCancel={endRename}
        />
      ) : (
        <ShimmerText
          ref={labelRef}
          isActive={isWorking}
          type="supporting"
          // Matches `--text-supporting-weight`, which the resting `Text` inherited from its type.
          weight="normal"
          maxLines={1}
          /* Off: the row carries the tooltip, and both on shows two at once. */
          hasTruncateTooltip={false}
          style={{ lineHeight: DESIGN_LEADING_12, minWidth: 0 }}
          phase={phase}
          periodCh={LABEL_SWEEP_PERIOD_CH}
          {...(isAccented ? { base: 'var(--color-accent)', crest: SELECTED_INK } : {})}
        >
          {label}
        </ShimmerText>
      )}
    </HStack>
    </Tooltip>
    </>
  );
}

function DesignsEmptyState(): React.JSX.Element {
  return (
    <VStack
      align="center"
      width="100%"
      data-testid="sidebar-designs-empty"
      className="sidebar-designs-empty"
      style={{ flex: '1 0 0', minHeight: 0, paddingInline: LIST_PADDING_INLINE, paddingBlockStart: 'var(--spacing-3)' }}
    >
      <Text type="supporting" color="inherit" style={{ textAlign: 'center', color: 'var(--color-text-disabled)' }}>
        {t('sidebar.empty.title')}
      </Text>
    </VStack>
  );
}

/** The current page's objects: the top level front first, each Section followed by what it holds (ONL-2488, ONL-2661). */
export function DesignsList(): React.JSX.Element {
  const frames = useCanvasStore((state) => state.nodes);
  const artifacts = useArtifactListing((state) => state.records);
  const artifactTitles = useMemo(() => new Map((artifacts ?? []).map((artifact) => [artifact.id, artifact.title])), [artifacts]);
  /** The designs list has scrolled — the heading's hairline turns on. */
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const closedSectionIds = useCanvasStore((state) => state.closedSectionIds);
  const closed = useMemo(() => new Set(closedSectionIds), [closedSectionIds]);
  // The canvas paints later nodes above; the list reads like a layers panel, front first.
  const frontFirst = [...frames].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
  const tree = designTreeRows(frontFirst, closed);
  const rows = tree.map((row) => ({ ...row, facts: designRowFacts(row.node) }));
  /* One answer for the whole list: a Project with no Section pays no indent for one, on any build (ONL-2661). */
  const reservesCaret = rows.some((row) => row.hasChildren);
  const labelOf = canvasNodeLabeller(rows.map((row) => row.facts), t, artifactTitles);
  const reorderFrame = useCanvasStore((state) => state.reorderFrame);
  const docNodes = useCanvasStore((state) => state.doc?.nodes);
  /* The stack a drop reads: top-level objects alone — a Section sorts last on the document's highest `order`, which would make the sequence non-monotone. */
  const reorderable: CanvasFlowNode[] = [];
  for (const row of tree) if (isReorderableRow(row)) reorderable.push(row.node);
  const stack = reorderable.map((node) => ({ id: node.id, order: docNodes?.[node.id]?.order ?? 0 }));
  const drag = useRowDrag(scrollerRef, DESIGN_ROW_SELECTOR, (id, index) => {
    const order = orderForDrop(stack, id, index);
    if (order === null) return;
    reorderFrame(id, order);
    studio().telemetryEvent({ event: 'frame_reordered', properties: telemetryProjectFields() });
  });

  /* Keyed on the selected id alone: a re-render from hover, rename or a node moving must not yank a scroll the user is doing by hand. */
  const selectedId = frames.find((frame) => frame.selected === true)?.id ?? null;
  useEffect(() => {
    if (selectedId === null) return;
    /* Astryx's layout primitives do not promise to forward a ref, so a dropped one must not make this silently do nothing. */
    const root: ParentNode = scrollerRef.current ?? document;
    const row = root.querySelector(`[data-testid="sidebar-designs"] [data-frame-id="${selectedId}"], [data-frame-id="${selectedId}"]`);
    /* `nearest` makes a row already in view a no-op instead of a jump. */
    row?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [selectedId]);

  return (
    <VStack
      gap={0}
      width="100%"
      data-testid="sidebar-designs"
      // On the section, not the rows: a drag released over another row clicks their common ancestor, which no row sees.
      onClickCapture={(event: React.MouseEvent) => {
        if (drag.wasDrag()) event.stopPropagation();
      }}
      style={{ flex: '1 0 0', minHeight: 0 }}
    >
      {/* The transparent border reserves the hairline's half-pixel, so the list does not jump when the line appears. */}
      <HStack
        width="100%"
        style={{
          paddingInline: SECTION_PADDING_INLINE,
          paddingBlockStart: 16,
          paddingBlockEnd: 12,
          borderBottom: isScrolled ? HAIRLINE : '0.5px solid transparent',
          flexShrink: 0,
        }}
      >
        <Text
          type="supporting"
          weight="medium"
          color="primary"
          style={{ lineHeight: DESIGN_LEADING_12 }}
        >
          {t('sidebar.designs')}
        </Text>
      </HStack>
      {frames.length === 0 ? (
        <DesignsEmptyState />
      ) : (
        <VStack
          gap={0}
          width="100%"
          // The quiet scrollbar treatment lives in styles.css.
          className="designs-scroller"
          ref={scrollerRef}
          style={{
            flex: '1 0 0',
            minHeight: 0,
            paddingInline: LIST_PADDING_INLINE,
            // The guide's invitation floats in this corner, so the last row scrolls clear of it.
            paddingBlockEnd: CORNER_FOOTPRINT,
            overflowY: 'auto',
          }}
          onScroll={(e: React.UIEvent<HTMLElement>) => {
            setIsScrolled(e.currentTarget.scrollTop > 0);
          }}
        >
          {rows.map(({ node: frame, facts, depth, hasChildren }, index) => {
            /* The gap a Section's contents span belongs to the top-level row below them. */
            const dropRow = reorderable.indexOf(frame);
            const isDragSource = dropRow !== -1;
            // Always drawn while dragging, at the gap nearest the pointer — even the dragged row's own, where the drop is no move.
            const mark =
              drag.drag === null || !isDragSource
                ? null
                : dropMarkFor(drag.drag.index, dropRow, reorderable.length);
            /* `isAtListEnd` is the scroller's own edge, which a Section's rows sit past, so it reads the rendered list and not the reorderable one. */
            const dropMark =
              mark === null
                ? null
                : { ...mark, isAtListEnd: mark.edge === 'before' ? index === 0 : index === rows.length - 1 };
            return (
              // The node's own menu, so a row and its node cannot offer different verbs (ONL-2486).
              <CanvasNodeMenu key={frame.id} nodeId={frame.id}>
                <div
                  {...(isDragSource ? { 'data-design-row': frame.id } : {})}
                  data-row-selected={frame.selected === true ? 'true' : undefined}
                  style={{
                    position: 'relative',
                    userSelect: 'none',
                    opacity: drag.drag?.id === frame.id ? 0.5 : 1,
                  }}
                  onPointerDown={(event) => {
                    if (isDragSource) drag.begin(frame.id, event);
                  }}
                >
                  <DesignRow
                    id={frame.id}
                    facts={facts}
                    label={labelOf(facts)}
                    isSelected={frame.selected === true}
                    isWorking={frame.data.working === true}
                    phase={index}
                    depth={depth}
                    reservesCaret={reservesCaret}
                  />
                  {hasChildren && (
                    <RowCaret
                      id={frame.id}
                      isOpen={!closed.has(frame.id)}
                      depth={depth}
                      isSelected={frame.selected === true}
                    />
                  )}
                  {dropMark === null ? null : <DropLine edge={dropMark.edge} isAtListEnd={dropMark.isAtListEnd} />}
                </div>
              </CanvasNodeMenu>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}
