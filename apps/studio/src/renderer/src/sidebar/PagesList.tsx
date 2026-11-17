import { useEffect, useMemo, useRef, useState } from 'react';
import { useListFocus } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ShimmerText } from '@studio/chat-ui';

import { pageWarmer } from '../canvas/artifact/warmPage.js';
import { currentCanvasPageId } from '../canvas/compose.js';
import { useCanvasStore } from '../canvas/store.js';
import { t } from '@studio/i18n';
import { PlusIcon } from '../icons/glyphs.js';
import { DropLine } from '../reorder/DropLine.jsx';
import { useRowDrag } from '../reorder/useRowDrag.js';
import { dropMarkFor } from './designOrder.js';
import { DeletePageDialog } from './DeletePageDialog.jsx';
import { PageRowMenu } from './PageRowMenu.jsx';
import { pageDeleteRequest, type PageDeleteRequest } from './pageConfirm.js';
import {
  currentAfterRename,
  nextPageName,
  orderForPageDrop,
  pageKeyIntent,
  pageRowFacts,
  type PageRowFacts,
} from './pageRow.js';
import { RenameField } from './RenameField.jsx';
import {
  DESIGN_LEADING_12,
  HAIRLINE,
  LIST_PADDING_INLINE,
  ROW_BOX,
  ROW_GAP,
  SECTION_PADDING_INLINE,
} from '../panels/rowGeometry.js';
import './sidebar.css';

/** This section's rows alone, so a drop index cannot be derived from a Designs row. */
const PAGE_ROW_SELECTOR = '[data-page-row]';
/** The rows a Tab and the arrows can land on — a divider carries none (ONL-2488). */
const PAGE_FOCUS_SELECTOR = '[data-page-focus]';

/* The rule rides a blank row of text, so a divider keeps the height, the hit area
   and the drag of a row that shows a name (ONL-2488). */
const DIVIDER_RULE_BOX: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
};
const DIVIDER_RULE: React.CSSProperties = {
  position: 'absolute',
  insetInline: 0,
  top: '50%',
  borderBlockStart: HAIRLINE,
};

/** Sized to a page name, as the designs row's is to a design name: the default 73ch reads as a pulse on a short label. */
const PAGE_SWEEP_PERIOD_CH = 14;

export interface PageRowProps {
  facts: PageRowFacts;
  isRenaming: boolean;
  /** This row's place in the list — staggers its sweep against its neighbours' (ONL-2200). */
  phase: number;
  onSelect: () => void;
  onBeginRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  /** A prop, never row state: the lit treatment is CSS, so a hover must still re-render nothing (ONL-2791). */
  onWarm: () => void;
}

/** One row of the Pages section, in the Designs rows' geometry; the current page is neutral, never accented (ONL-2488). */
export function PageRow({
  facts,
  isRenaming,
  phase,
  onSelect,
  onBeginRename,
  onCommitRename,
  onCancelRename,
  onWarm,
}: PageRowProps): React.JSX.Element {
  // A `<button>` may not contain an `<input>`, and a divider is not selectable,
  // so either one steps the row down to a plain container.
  const isPressable = !isRenaming && !facts.isDivider;
  return (
    <HStack
      as={isPressable ? 'button' : 'div'}
      gap={ROW_GAP}
      vAlign="center"
      width="100%"
      onClick={facts.isDivider ? undefined : onSelect}
      onDoubleClick={onBeginRename}
      onPointerEnter={onWarm}
      onFocus={onWarm}
      {...(facts.isDivider && !isRenaming ? { role: 'separator' } : {})}
      aria-label={facts.isDivider ? t('sidebar.pages.dividerLabel') : facts.name}
      aria-current={facts.isCurrent ? 'true' : undefined}
      {...(isPressable ? { 'data-page-focus': '' } : {})}
      {...(facts.isWorking ? { 'data-working': '' } : {})}
      data-testid="sidebar-page"
      className="design-row"
      style={{
        ...ROW_BOX,
        cursor: facts.isDivider ? 'default' : 'pointer',
        backgroundColor: facts.isCurrent ? 'var(--color-overlay-pressed)' : undefined,
        // Unset when resting, so the `.design-row` hover rule can reach the ink.
        color: facts.isCurrent ? 'var(--color-text-primary)' : undefined,
        ...(facts.isCurrent ? { ['--studio-row-ink-rest' as string]: 'var(--color-text-primary)' } : {}),
        ['--studio-shimmer-phase' as string]: phase,
      } as React.CSSProperties}
    >
      {isRenaming ? (
        <RenameField
          label={t('sidebar.pages.renameLabel')}
          name={facts.name}
          testId="sidebar-page-rename"
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : facts.isDivider ? (
        <div style={DIVIDER_RULE_BOX}>
          <Text
            type="supporting"
            color="inherit"
            weight="normal"
            style={{ lineHeight: DESIGN_LEADING_12, visibility: 'hidden' }}
          >
            {'\u00a0'}
          </Text>
          <div style={DIVIDER_RULE} />
        </div>
      ) : (
        <ShimmerText
          isActive={facts.isWorking}
          type="supporting"
          weight="normal"
          maxLines={1}
          hasTruncateTooltip={false}
          style={{ lineHeight: DESIGN_LEADING_12, minWidth: 0 }}
          phase={phase}
          periodCh={PAGE_SWEEP_PERIOD_CH}
        >
          {facts.name}
        </ShimmerText>
      )}
    </HStack>
  );
}

/** The named canvases of this project, in page order (ONL-2488). */
export function PagesList(): React.JSX.Element | null {
  const doc = useCanvasStore((state) => state.doc);
  // Project-wide, never the composed page: the frames the turn is touching are exactly the ones not on screen (ONL-2488).
  const overlay = useCanvasStore((state) => state.overlay);
  const currentPageId = useCanvasStore((state) => currentCanvasPageId(state));
  const renamingPageId = useCanvasStore((state) => state.renamingPageId);
  const setCurrentPage = useCanvasStore((state) => state.setCurrentPage);
  const beginPageRename = useCanvasStore((state) => state.beginPageRename);
  const endPageRename = useCanvasStore((state) => state.endPageRename);
  const createPage = useCanvasStore((state) => state.createPage);
  const renamePage = useCanvasStore((state) => state.renamePage);
  const reorderPage = useCanvasStore((state) => state.reorderPage);
  const deletePage = useCanvasStore((state) => state.deletePage);
  const raiseCanvasRefusal = useCanvasStore((state) => state.raiseCanvasRefusal);
  const [ask, setAsk] = useState<PageDeleteRequest | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // The hook owns the tab stop; the keys are this list's own, since the registry's listener is global (ONL-2488).
  const { listRef, handleFocus } = useListFocus<HTMLDivElement>({
    itemSelector: PAGE_FOCUS_SELECTOR,
    hasRovingTabIndex: true,
  });
  // Recomputed only when what it reads changes: a drag re-renders this list on every pointer step (ONL-2488).
  const rows = useMemo(
    () => (doc === null ? [] : pageRowFacts(doc, currentPageId, overlay)),
    [doc, currentPageId, overlay],
  );
  const drag = useRowDrag(scrollerRef, PAGE_ROW_SELECTOR, (id, index) => {
    const order = orderForPageDrop(rows, id, index);
    if (order === null) return;
    reorderPage(id, order);
  });

  // `block: 'nearest'` keeps an already-visible row still (ONL-2488).
  useEffect(() => {
    if (currentPageId === null) return;
    const root: ParentNode = scrollerRef.current ?? document;
    root
      .querySelector(`[data-page-row="${currentPageId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [currentPageId]);

  if (doc === null) return null;

  const focusRow = (pageId: string): void => {
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-page-row="${pageId}"] [data-page-focus]`)
      ?.focus();
  };

  const commitRename = (pageId: string, name: string): void => {
    // Before the op, while the page is still one `setCurrentPage` accepts: the leave restores the destination's camera (ONL-2488).
    const next = currentAfterRename(doc, pageId, name, currentPageId);
    if (next !== null) setCurrentPage(next, 'vacated');
    renamePage(pageId, name);
  };

  const requestDelete = (pageId: string): void => {
    const outcome = pageDeleteRequest(doc, pageId);
    if (outcome.kind === 'gone') return;
    if (outcome.kind === 'refused') {
      // Delete doing nothing at all is the silent no-op a refusal exists to prevent (ONL-2488).
      raiseCanvasRefusal(outcome.code);
      return;
    }
    if (outcome.kind === 'delete') {
      deletePage(pageId, false);
      return;
    }
    setAsk(outcome);
  };

  return (
    <VStack
      gap={0}
      width="100%"
      data-testid="sidebar-pages"
      // On the section, not the rows: a drag released over another row clicks their common ancestor, which no row sees.
      onClickCapture={(event: React.MouseEvent) => {
        if (drag.wasDrag()) event.stopPropagation();
      }}
      // The height is the split's, not this section's: `Sidebar` sizes the box (ONL-2488).
      style={{ flex: '1 1 auto', minHeight: 0 }}
    >
      <HStack
        width="100%"
        hAlign="between"
        vAlign="center"
        style={{
          paddingInlineStart: SECTION_PADDING_INLINE,
          // The add button's edge meets the rows' fill edge, not their ink.
          paddingInlineEnd: LIST_PADDING_INLINE,
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
          {t('sidebar.pages')}
        </Text>
        <IconButton
          label={t('sidebar.pages.add')}
          tooltip={t('sidebar.pages.add')}
          variant="ghost"
          size="sm"
          icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
          // Zero layout height, so this header matches the Designs header's text-only height.
          style={{ marginBlock: -14 }}
          data-testid="sidebar-pages-add"
          onClick={() => {
            createPage(nextPageName(doc));
          }}
        />
      </HStack>
      <VStack
        gap={0}
        width="100%"
        // The quiet scrollbar treatment lives in styles.css.
        className="designs-scroller"
        ref={(node: HTMLDivElement | null) => {
          scrollerRef.current = node;
          listRef.current = node;
        }}
        onFocus={handleFocus}
        onScroll={(e: React.UIEvent<HTMLElement>) => {
          setIsScrolled(e.currentTarget.scrollTop > 0);
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          // The caret owns the arrows and Delete for as long as a name is open.
          if (renamingPageId !== null) return;
          const row = (event.target as HTMLElement).closest('[data-page-row]');
          const intent = pageKeyIntent(rows, row?.getAttribute('data-page-row') ?? null, event);
          if (intent === null) return;
          event.preventDefault();
          if (intent.kind === 'switch') {
            setCurrentPage(intent.pageId, 'keyboard');
            focusRow(intent.pageId);
            return;
          }
          if (intent.kind === 'reorder') {
            reorderPage(intent.pageId, intent.order);
            return;
          }
          if (intent.kind === 'rename') {
            beginPageRename(intent.pageId);
            return;
          }
          requestDelete(intent.pageId);
        }}
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          paddingInline: LIST_PADDING_INLINE,
          paddingBlockEnd: 12,
          overflowY: 'auto',
        }}
      >
        {rows.map((facts, index) => {
          // Always drawn while dragging, at the gap nearest the pointer — even the dragged row's own, where the drop is no move.
          const dropMark =
            drag.drag === null ? null : dropMarkFor(drag.drag.index, index, rows.length);
          return (
            <PageRowMenu
              key={facts.id}
              canDelete={rows.length > 1}
              onRename={() => {
                beginPageRename(facts.id);
              }}
              onDelete={() => {
                requestDelete(facts.id);
              }}
            >
              <div
                data-page-row={facts.id}
                data-row-selected={facts.isCurrent ? 'true' : undefined}
                style={{
                  position: 'relative',
                  userSelect: 'none',
                  opacity: drag.drag?.id === facts.id ? 0.5 : 1,
                }}
                onPointerDown={(event) => {
                  drag.begin(facts.id, event);
                }}
              >
                <PageRow
                  facts={facts}
                  phase={index}
                  isRenaming={renamingPageId === facts.id}
                  onSelect={() => {
                    setCurrentPage(facts.id, 'click');
                  }}
                  onBeginRename={() => {
                    beginPageRename(facts.id);
                  }}
                  onCommitRename={(name) => {
                    commitRename(facts.id, name);
                  }}
                  onCancelRename={endPageRename}
                  onWarm={() => {
                    pageWarmer.post({ doc, pageId: facts.id });
                  }}
                />
                {dropMark === null ? null : (
                  <DropLine edge={dropMark.edge} isAtListEnd={dropMark.isAtListEnd} />
                )}
              </div>
            </PageRowMenu>
          );
        })}
      </VStack>
      <DeletePageDialog
        isOpen={ask !== null}
        name={ask?.name ?? ''}
        nodeCount={ask?.nodeCount ?? 0}
        onOpenChange={(isOpen) => {
          if (!isOpen) setAsk(null);
        }}
        onConfirm={() => {
          if (ask !== null) deletePage(ask.pageId, true);
          setAsk(null);
        }}
      />
    </VStack>
  );
}
