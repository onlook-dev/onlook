import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';

import { isRailHidden, useCanvasStore } from '../canvas/store.js';
import { SidebarFoot } from './SidebarFoot.js';
import { isBlankWorkspace, useWorkspaceStore } from '../workspace/store.js';
import { useProjectName } from '../projects/useProjectName.js';
import { RenameField as NameField } from '../RenameField.js';
import { ignoreRefusal } from '../refusal.js';
import { t } from '@studio/i18n';
import { BranchIcon } from '../icons/glyphs.js';
import { DesignsList } from './DesignsList.jsx';
import { PagesList } from './PagesList.jsx';
import { SECTION_FLOOR, pagesSectionBox } from './pageSplit.js';
import { HAIRLINE, SURFACE } from '../panels/rowGeometry.js';
import { LEFT_PANEL_HEADER } from '../panels/headerGeometry.js';
import { studio } from '../bridge.js';

/**
 * The left panel — the project title, the Pages section and the Designs list.
 *
 * Width is the frame's — the resizable overlay in `App.tsx`; nothing here
 * asserts it. The panel wears its own hairline and the frame adds no border of
 * its own, or a second 1px line lands on the same edge.
 */

const TITLE_FIELD: React.CSSProperties = {
  font: 'inherit',
  // Outset by the padding so the text does not move when the field opens.
  margin: '-2px -6px',
  padding: '2px 6px',
  width: 'calc(100% + 12px)',
  borderRadius: 'var(--radius-element)',
  background: 'var(--color-background-gray)',
  boxShadow: 'inset 0 0 0 1px var(--color-border-blue)',
};

const BRANCH_LINE = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap',
  cursor: 'default',
  alignSelf: 'flex-start',
  maxWidth: '100%',
  minWidth: 0,
} as const;

/* The glyph's drawing fills the middle two-thirds of its box, so a 1.5cap box draws a mark one cap tall (ONL-2744). */
const BRANCH_GLYPH = { display: 'block', flex: 'none', width: 'calc(1cap * 1.5)', height: 'calc(1cap * 1.5)' } as const;

/** A blank project's drawn name, not one the first prompt or the user gave; matches the tab's rule (ONL-2744). */
function isDrawnName(name: string, branchName: string | undefined): boolean {
  return typeof branchName === 'string' && name === branchName.slice(branchName.lastIndexOf('/') + 1);
}

/** Reserves its height before a project lands, so the list below never jumps. */
function ProjectTitle(): React.JSX.Element {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const [isRenaming, setIsRenaming] = useState(false);
  const title = useProjectName();

  const commit = (name: string): void => {
    setIsRenaming(false);
    if (workspace === null || name === title) return;
    // No optimistic write: the workspaces broadcast is the refresh, so a failed rename leaves the old name.
    studio()
      .rename({ target: 'project', workspacePath: workspace.workspacePath, name })
      .catch(ignoreRefusal('sidebar', 'project rename'));
  };

  return (
    <VStack
      gap={0}
      width="100%"
      data-testid="sidebar-project-title"
      style={{ ...LEFT_PANEL_HEADER, borderBottom: HAIRLINE, flexShrink: 0 }}
    >
      {isRenaming && title !== undefined ? (
        <Text type="body" weight="medium" color="primary">
          <NameField
          initialValue={title}
          label={t('sidebar.projectTitle.rename')}
          testId="sidebar-project-title-input"
          style={TITLE_FIELD}
          onCommit={commit}
          onCancel={() => setIsRenaming(false)}
          />
        </Text>
      ) : (
        <Text
          type="body"
          weight="medium"
          color="primary"
          maxLines={1}
          data-panel-project-name
          onDoubleClick={title === undefined ? undefined : () => setIsRenaming(true)}
          style={{ cursor: 'default', userSelect: 'none' }}
        >
          {title === undefined ? '\u00a0' : workspace !== null && isBlankWorkspace(workspace) && isDrawnName(title, workspace.branchName) ? t('sidebar.projectTitle.untitled') : title}
        </Text>
      )}
      {workspace && workspace.history !== 'none' && typeof workspace.branchName === 'string' && workspace.branchName !== '' ? (
        <Tooltip
          content={isBlankWorkspace(workspace)
            // A blank project's folder is Studio's own, so its drawn name means nothing to the designer (ONL-2744).
            ? t('sidebar.projectTitle.blankDetail')
            : t('sidebar.projectTitle.copyDetail', { codebase: workspace.sourceRepoName, base: workspace.baseBranch })}
          placement="below"
          alignment="center"
        >
          <Text type="supporting" color="secondary" style={BRANCH_LINE} data-testid="sidebar-project-branch">
            <BranchIcon style={BRANCH_GLYPH} aria-hidden="true" />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{workspace.branchName}</span>
          </Text>
        </Tooltip>
      ) : (
        <Text type="supporting" color="secondary">{'\u00a0'}</Text>
      )}
    </VStack>
  );
}

const SPLIT_SAVE_DEBOUNCE_MS = 300;

/* Over the library's own 16px hit area (ONL-1953). */
const SPLIT_HANDLE_LIFT = `
.sidebar-split-handle .sidebar-split-line {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  border-block-start: ${HAIRLINE};
  pointer-events: none;
}
.sidebar-split-handle .sidebar-split-edge {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  height: 2px;
  pointer-events: none;
  background-color: transparent;
  transform: translateY(-50%);
}
.sidebar-split-handle:hover .sidebar-split-edge,
.sidebar-split-handle[data-resizing] .sidebar-split-edge {
  background-color: color-mix(in srgb, var(--color-icon-primary) 30%, transparent);
}
`;

/** A box's drawn height, which the clamp needs and CSS cannot hand a pure function. */
function useMeasuredHeight(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new ResizeObserver(() => {
      setHeight(node.clientHeight);
    });
    observer.observe(node);
    setHeight(node.clientHeight);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, height];
}

/** Outlives a remount: Preview unmounts the sidebar, and waiting on the read again drew one frame at the floor. Reset on every read: a view can be reassigned to another project. */
let lastStoredHeight: number | undefined;

/** The stored split of the project this view is on, and the sink a drag writes to (ONL-2488). */
function useStoredSplit(): [number | undefined, (height: number) => void] {
  const [height, setHeight] = useState<number | undefined>(lastStoredHeight);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    let isActive = true;
    studio()
      .sidebarLayoutState()
      .then((layout) => {
        lastStoredHeight = layout.pagesHeight;
        if (isActive) setHeight(layout.pagesHeight);
      })
      .catch(ignoreRefusal('sidebar', 'split read'));
    return () => {
      isActive = false;
      clearTimeout(saveTimer.current);
    };
  }, []);
  return [
    height,
    (next: number) => {
      lastStoredHeight = next;
      setHeight(next);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        studio()
          .sidebarLayoutSave({ pagesHeight: next })
          .catch(ignoreRefusal('sidebar', 'split save'));
      }, SPLIT_SAVE_DEBOUNCE_MS);
    },
  ];
}

/** The two sections and the boundary the user sets between them (ONL-2488). */
function SidebarSections(): React.JSX.Element {
  const isHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  const [bodyRef, panelHeight] = useMeasuredHeight();
  const [pagesRef, drawnHeight] = useMeasuredHeight();
  const [storedHeight, storeHeight] = useStoredSplit();
  /* Only a drag stores a split; the sync below must not reach the sink. */
  const isSyncing = useRef(false);

  const pages = useResizable({
    defaultSize: SECTION_FLOOR,
    minSizePx: SECTION_FLOOR,
    maxSizePx: Math.max(SECTION_FLOOR, panelHeight - SECTION_FLOOR),
    collapsible: false,
    onSizeChange: (size: number) => {
      if (!isSyncing.current) storeHeight(size);
    },
  });

  const box = pagesSectionBox(storedHeight, panelHeight);
  /* A drag starts from the hook's own size, so the clamp's boundary has to reach it. */
  const boundary = box.kind === 'hug' ? drawnHeight : box.height;
  useEffect(() => {
    if (boundary === 0 || boundary === pages.size) return;
    isSyncing.current = true;
    pages.resize(boundary);
    isSyncing.current = false;
  }, [pages, boundary]);

  return (
    <VStack gap={0} width="100%" style={{ flex: '1 1 auto', minHeight: 0 }} ref={bodyRef}>
      <style href="studio-sidebar-split" precedence="medium">
        {SPLIT_HANDLE_LIFT}
      </style>
      <VStack
        gap={0}
        width="100%"
        ref={pagesRef}
        style={
          box.kind === 'hug'
            ? { flex: '0 1 auto', maxHeight: box.maxHeight, minHeight: 0 }
            : { flex: '0 0 auto', height: box.height, minHeight: 0 }
        }
      >
        <PagesList />
      </VStack>
      {!isHidden && <ResizeHandle
        resizable={pages.props}
        direction="vertical"
        tabIndex={-1}
        aria-hidden="true"
        className="sidebar-split-handle"
      >
        <span aria-hidden="true" className="sidebar-split-line" />
        <span aria-hidden="true" className="sidebar-split-edge" />
      </ResizeHandle>}
      <DesignsList />
    </VStack>
  );
}

export function Sidebar(): React.JSX.Element {
  const deselectFrames = useCanvasStore((state) => state.deselectFrames);

  return (
    <VStack
      height="100%"
      onClick={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!e.currentTarget.contains(target)) return;
        if (target.closest('[role="menu"]')) return;
        if (!target.closest('[data-testid="sidebar-frame"], [data-page-row], [data-testid="agent-status-line"]')) {
          deselectFrames();
        }
      }}
      style={{
        // Not `width: 100%`, which fights the resize handle beside it for the same pixels (ONL-1953).
        flex: '1 1 auto',
        minWidth: 0,
        ...SURFACE,
        borderRight: HAIRLINE,
        overflow: 'clip',
      }}
    >
      <ProjectTitle />
      <SidebarSections />
      <SidebarFoot />
    </VStack>
  );
}
