import { useWorkspacePreview, WorkspacePreviewCard } from './WorkspacePreviewCard.js';
import { useRef, useState } from 'react';
import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Stack } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import { useBlankCreateStore } from '../create/store.js';
import { t } from '@studio/i18n';
import {
  ClockIcon,
  Folder2Icon,
  NewDraftIcon,
  SettingsIcon,
  PlaygroundGlyph,
} from '../icons/glyphs.js';
import { OnlookWordmark } from '../icons/OnlookWordmark.js';
import { MENU_SURFACE } from '../menu/surface.js';
import { useToastFootClaim } from '../notifications/foot.js';
import { openSettings } from '../settings/settingsDialogStore.js';
import { DiscoverCard } from './DiscoverCard.jsx';
import { SidebarRow } from './SidebarRow.js';
import { SidebarSectionHeader } from './SidebarSectionHeader.js';
import { DropLine } from '../reorder/DropLine.jsx';
import { AddCodebase } from '../github-import/AddCodebase.js';
import { studio } from '../bridge.js';

/**
 * The projects view's sidebar. NOT the editor's, and not built on its geometry:
 * that one is an inset overlay on a full-bleed canvas, this one an opaque column
 * flush to the window edge. Reusing `REGION` here imports a frame this view does
 * not have.
 */

const SIDEBAR_WIDTH = 300;

/*
 * The seam is a BACKGROUND, not a border: it stops short of the window's bottom
 * edge rather than running into the corner, and a `border-right` cannot be inset
 * — it spans the box or it does not exist. As a background layer,
 * `background-size` sets its height and `background-position` centres it.
 */
const SEAM_INSET = 'var(--spacing-6)';

const SIDEBAR = {
  width: `${SIDEBAR_WIDTH}px`,
  flex: '0 0 auto',
  height: '100%',
  /* The root takes focus when the discover card unmounts under it, and a 300px focus ring is not what that move is for (ONL-2443). */
  outline: 'none',
  backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08))',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right center',
  backgroundSize: `0.5px calc(100% - ${SEAM_INSET} * 2)`,
} as const;

/** The `Beta` chip beside the wordmark — teal on teal, both already tokenised. */
const BETA_BADGE = {
  flex: '0 0 auto',
  background: 'var(--color-background-teal)',
  borderRadius: 'var(--radius-page)',
  border: 0,
  cursor: 'pointer',
} as const;

const BETA_INK = { color: 'var(--color-text-teal)' } as const;

/* The two list sections scroll between the fixed nav above and the pinned footer
   group below, so the footer stays in the viewport at any workspace count. */
const SCROLLING_SECTIONS = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  // Its own lane beside the rows, never drawn over them (ONL-2744).
  scrollbarGutter: 'stable',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--color-background-gray) transparent',
} as const;
/* `marginTop: auto` on two siblings pushes them apart instead of pushing the pair down (ONL-2443). */
const FOOTER = { flex: '0 0 auto', marginTop: 'auto' } as const;

export interface Workspace {
  id: string;
  name: string;
  previewSrc?: string;
}

export interface ProjectsSidebarProps {
  /** The signed-in account, under the star card and above the version line. Null in a build with no cloud. */
  account?: React.ReactNode;
  workspaces: Workspace[];
  /** Workspaces wearing the archive label — their own section, below. The label
   * moves a row; nothing about the workspace itself changes. */
  archivedWorkspaces?: Workspace[];
  /** `undefined` means a workspace holds selection, not the nav row. */
  selectedWorkspaceId?: string;
  isRecentSelected?: boolean;
  hasArtifacts?: boolean;
  isArtifactsSelected?: boolean;
  onSelectArtifacts?: () => void;
  /** FORCES a row into its hovered look. Rows track their own pointer, so this
   * is staging only (the showroom). */
  hoveredId?: string;
  onSelectRecent?: () => void;
  recentRowRef?: React.Ref<HTMLDivElement>;
  /** The blank-project door (ONL-2152): a nav row under Recent. Absent, no row. */
  onCreateBlank?: () => void;
  onSelectWorkspace?: (id: string) => void;
  /** This row's context-menu content. When present, right-click and the `⋯` both
   * open it; when absent the chip falls back to `onWorkspaceMenu`, the
   * showroom's staging hook. */
  workspaceMenu?: (id: string) => React.ReactNode;
  onWorkspaceMenu?: (id: string) => void;
  onAddWorkspace?: () => void;
  onOpenGithub?: (path: string, existing: boolean) => void;
  /** Drag-to-reorder commit: the active Workspaces ids, top to bottom. */
  onReorderWorkspaces?: (orderedIds: string[]) => void;
  /** Workspaces whose removal is running: the row spins and takes no click until it ends. */
  removingWorkspaceIds?: readonly string[];
  /** Which workspace row's label is in inline edit (rename), if any. */
  renamingWorkspaceId?: string;
  onWorkspaceRenameCommit?: (id: string, name: string) => void;
  onWorkspaceRenameCancel?: () => void;
  onWorkspaceRename?: (id: string) => void;
  /** The running app's version, drawn in the footer. Absent, no version row. */
  version?: string;
  /** The screen's answer on whether the discover card is up; the version row
   * keeps its own condition (ONL-2443). */
  isDiscoverVisible?: boolean;
  onDiscoverStar?: (url: string) => void;
  onDiscoverDismiss?: () => void;
}

/** A row mid-removal is left out of the order a drop commits: the write replaces the whole list, and that row's slot is about to be forgotten (ONL-2523). */
export function reorderedWorkspaceIds(
  workspaces: readonly Workspace[],
  draggingId: string,
  target: { id: string; edge: 'before' | 'after' },
  removingWorkspaceIds: readonly string[],
): string[] | undefined {
  if (draggingId === target.id) return undefined;
  const removing = new Set(removingWorkspaceIds);
  const ids: string[] = [];
  for (const { id } of workspaces) if (id !== draggingId && !removing.has(id)) ids.push(id);
  const at = ids.indexOf(target.id);
  if (at < 0) return undefined;
  ids.splice(target.edge === 'before' ? at : at + 1, 0, draggingId);
  return ids;
}

export function ProjectsSidebar({
  account = null,
  workspaces,
  archivedWorkspaces = [],
  selectedWorkspaceId,
  isRecentSelected = false,
  hasArtifacts = false,
  isArtifactsSelected = false,
  onSelectArtifacts,
  recentRowRef,
  hoveredId,
  onSelectRecent,
  onCreateBlank,
  onSelectWorkspace,
  workspaceMenu,
  onWorkspaceMenu,
  onAddWorkspace,
  onOpenGithub,
  onReorderWorkspaces,
  removingWorkspaceIds = [],
  renamingWorkspaceId,
  onWorkspaceRenameCommit,
  onWorkspaceRenameCancel,
  onWorkspaceRename,
  version,
  isDiscoverVisible = false,
  onDiscoverStar,
  onDiscoverDismiss,
}: ProjectsSidebarProps): React.JSX.Element {
  const railRef = useRef<HTMLElement | null>(null);
  const claimFoot = useToastFootClaim();
  /* Whose menu is open — the grid's problem and the grid's fix (see
     `ProjectGrid`): opening the menu takes the pointer off the row, so without
     this the chip the menu belongs to vanishes under it. */
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const isCreatingBlank = useBlankCreateStore((s) => s.status.kind === 'creating');

  /* Both sections collapse independently. Session-only for now — persisting it
     is a stored-state decision, not a component one. */
  const [isWorkspacesCollapsed, setIsWorkspacesCollapsed] = useState(false);
  const [isArchiveCollapsed, setIsArchiveCollapsed] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; edge: 'before' | 'after' } | null>(
    null,
  );
  const endDrag = (): void => {
    setDraggingId(null);
    setDropTarget(null);
  };
  const dropAt = (target: { id: string; edge: 'before' | 'after' }): void => {
    if (draggingId === null) return;
    const ids = reorderedWorkspaceIds(workspaces, draggingId, target, removingWorkspaceIds);
    if (ids) onReorderWorkspaces?.(ids);
  };

  /* The card is the rail's last control, so its unmount drops focus to the
     document body unless this runs first (ONL-2443). */
  const handOffFocus = (): void => {
    railRef.current?.focus();
  };

  const workspacePreview = useWorkspacePreview(workspaces);

  const draggableRow = (workspace: Workspace): React.JSX.Element => {
    const { id } = workspace;
    // Drawn over the dragged row too: the line always shows where a drop lands, a no-move included.
    const edge = dropTarget?.id === id && draggingId !== null ? dropTarget.edge : null;
    return (
      <Stack
        key={id}
        draggable={
          onReorderWorkspaces !== undefined &&
          renamingWorkspaceId !== id &&
          !removingWorkspaceIds.includes(id)
        }
        onDragStart={(event: React.DragEvent) => {
          event.dataTransfer.effectAllowed = 'move';
          setDraggingId(id);
        }}
        onDragOver={(event: React.DragEvent) => {
          if (draggingId === null) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          const box = event.currentTarget.getBoundingClientRect();
          const next = event.clientY < box.top + box.height / 2 ? 'before' : 'after';
          if (dropTarget?.id !== id || dropTarget.edge !== next) setDropTarget({ id, edge: next });
        }}
        onDrop={(event: React.DragEvent) => {
          event.preventDefault();
          if (dropTarget) dropAt(dropTarget);
          endDrag();
        }}
        onDragEnd={endDrag}
        data-testid="sidebar-workspace"
        data-workspace-id={id}
        data-drop-edge={edge ?? undefined}
        style={{
          position: 'relative',
          opacity: draggingId === id ? 0.5 : 1,
          borderRadius: 'var(--radius-element)',
        }}
      >
        {workspaceRow(workspace)}
        {edge === null ? null : (
          <DropLine
            edge={edge}
            isAtListEnd={
              (edge === 'before' && workspaces[0]?.id === id) || (edge === 'after' && workspaces.at(-1)?.id === id)
            }
          />
        )}
      </Stack>
    );
  };

  const workspaceRow = ({ id, name }: Workspace): React.JSX.Element => {
    const isRemoving = removingWorkspaceIds.includes(id);
    const row = (
      <SidebarRow
        key={workspaceMenu ? undefined : id}
        icon={Folder2Icon}
        label={name}
        isSelected={id === selectedWorkspaceId}
        // The open menu holds the row's fill: the pointer is over the menu, not the row it belongs to (ONL-2523).
        isHovered={id === hoveredId || id === openMenuId}
        isBusy={isRemoving}
        showMenu={!isRemoving && (id === hoveredId || id === openMenuId)}
        isRenaming={id === renamingWorkspaceId}
        onRenameCommit={(newName) => onWorkspaceRenameCommit?.(id, newName)}
        {...(onWorkspaceRenameCancel ? { onRenameCancel: onWorkspaceRenameCancel } : {})}
        {...(onWorkspaceRename ? { onRename: () => onWorkspaceRename(id) } : {})}
        onSelect={() => onSelectWorkspace?.(id)}
        onMenu={(event) => {
          if (workspaceMenu) {
            // The grid's pattern: the chip re-dispatches and the row's
            // ContextMenu answers, so one list serves both ways in.
            event.currentTarget.dispatchEvent(
              new MouseEvent('contextmenu', {
                bubbles: true,
                clientX: event.clientX,
                clientY: event.clientY,
              }),
            );
            return;
          }
          onWorkspaceMenu?.(id);
        }}
      />
    );
    // No menu while it goes: a second Remove on a row already being removed would only be refused.
    if (!workspaceMenu || isRemoving) return row;
    return (
      <ContextMenu
        key={id}
        menuContent={workspaceMenu(id)}
        menuWidth={220}
        style={MENU_SURFACE}
        onOpenChange={(isOpen) =>
          setOpenMenuId((current) => (isOpen ? id : current === id ? null : current))
        }
      >
        {row}
      </ContextMenu>
    );
  };

  return (
    <VStack
      className="projects-sidebar"
      style={SIDEBAR}
      padding={6}
      gap={6}
      tabIndex={-1}
      ref={railRef}
      data-testid="projects-sidebar"
    >
      <HStack vAlign="center" justify="between">
        <OnlookWordmark role="img" aria-label={t('app.name')} height={11} style={{ marginInlineStart: 'var(--spacing-2)', marginInlineEnd: 'var(--spacing-1)' }} />
        <Tooltip content={t('projects.badge.beta.tooltip')} placement="below">
        <HStack
          as="button"
          vAlign="center"
          justify="center"
          paddingInline={2}
          paddingBlock={1}
          style={BETA_BADGE}
          aria-label={t('projects.badge.beta.tooltip')}
          onClick={() => studio().updateCheck()}
          data-testid="projects-beta-badge"
        >
          {/* ⚠️ The ink rides on the TEXT node, not the badge — `Text` carries
              its own colour rule, so a colour inherited from the wrapper is
              overridden and the badge paints white (the same defeat as the
              destructive menu item; see `menus.tsx`). */}
          <Text size="2xs" style={BETA_INK}>
            {t('projects.badge.beta')}
          </Text>
        </HStack>
        </Tooltip>
      </HStack>

      {/* The two ways to start, together; a code folder leads because those projects retain far longer; inside a Workspace, New Project is that page's lead instead (ONL-2744). */}
      {(onAddWorkspace !== undefined || onCreateBlank !== undefined) && (
        <VStack gap={1}>
          {onAddWorkspace !== undefined && (
            <Stack data-testid="projects-add-workspace">
              <AddCodebase entryPoint="projects" onFolder={onAddWorkspace} isPrimary={selectedWorkspaceId === undefined} isRowSized {...(onOpenGithub ? { onOpen: onOpenGithub } : {})} />
            </Stack>
          )}
          {onCreateBlank && (
            <Stack data-testid="projects-new-draft">
              <SidebarRow
                icon={NewDraftIcon}
                label={t('projects.nav.newDraft')}
                isBusy={isCreatingBlank}
                onSelect={onCreateBlank}
              />
            </Stack>
          )}
        </VStack>
      )}

      {/* The nav rows are one 4px group; the sidebar's 24px gap sits between groups (ONL-2115). */}
      <VStack gap={1}>
      <Stack ref={recentRowRef}>
      <SidebarRow
        icon={ClockIcon}
        label={t('projects.nav.recent')}
        isSelected={isRecentSelected}
        isHovered={hoveredId === 'recent'}
        onSelect={onSelectRecent}
      />
      </Stack>
      {hasArtifacts && <Stack data-testid="projects-artifacts">
        <SidebarRow icon={PlaygroundGlyph} label={t('artifact.library.title')}
          isSelected={isArtifactsSelected} isHovered={hoveredId === 'artifacts'} onSelect={onSelectArtifacts} />
      </Stack>}
      <Stack data-testid="projects-settings">
        <SidebarRow
          icon={SettingsIcon}
          label={t('settings.nav')}
          isHovered={hoveredId === 'settings'}
          onSelect={() => {
            openSettings('sidebar');
          }}
        />
      </Stack>
      </VStack>

      <VStack gap={6} style={SCROLLING_SECTIONS}>
        <VStack gap={2}>
          <SidebarSectionHeader
            label={t('projects.section.workspaces')}
            isCollapsed={isWorkspacesCollapsed}
            onToggleCollapse={() => setIsWorkspacesCollapsed((collapsed) => !collapsed)}
          />
          {/* The rows sit tighter than the section does: one `gap` would space
              header-to-rows and row-to-row alike, and rows that carry their own
              padding then read as separate things rather than one list. */}
          <VStack
            gap={0.5}
            onPointerOver={workspacePreview.onPointerOver}
            onPointerLeave={workspacePreview.onPointerLeave}
            onPointerDownCapture={workspacePreview.onPointerDown}
          >
            {isWorkspacesCollapsed ? null : workspaces.map(draggableRow)}
          </VStack>
          <WorkspacePreviewCard shown={draggingId === null && openMenuId === null ? workspacePreview.shown : null} workspaces={workspaces} />
        </VStack>

        {/* No action icon: archiving is a context-menu action on a row, never a
            thing you create from the header. Absent while empty: a heading over
            nothing reads as a section that failed to load (ONL-2523). */}
        {archivedWorkspaces.length === 0 ? null : (
        <VStack gap={2}>
          <SidebarSectionHeader
            label={t('projects.section.archive')}
            isCollapsed={isArchiveCollapsed}
            onToggleCollapse={() => setIsArchiveCollapsed((collapsed) => !collapsed)}
          />
          {/* Same tightening as Workspaces above — the two sections are one list
              in two parts and must not space their rows differently. */}
          <VStack gap={0.5}>
            {isArchiveCollapsed ? null : archivedWorkspaces.map(workspaceRow)}
          </VStack>
        </VStack>
        )}
      </VStack>

      {/* Absent entirely when it can hold nothing: the rail's 24px group gap
          is charged for an empty group too, and the scroller loses it. */}
      {(isDiscoverVisible || version !== undefined || account !== null) && (
        <VStack gap={6} style={FOOTER} ref={claimFoot} data-testid="projects-footer">
          {isDiscoverVisible && (
            <DiscoverCard
              onStar={(url) => {
                handOffFocus();
                onDiscoverStar?.(url);
              }}
              onDismiss={() => {
                handOffFocus();
                onDiscoverDismiss?.();
              }}
            />
          )}

          {/* One group, so the account keeps its place above the version line whether or not the card above is up (ONL-2701). */}
          {(account !== null || version !== undefined) && <VStack gap={1} data-testid="projects-footer-group">
            {account}
            {version !== undefined && (
              <Stack data-testid="projects-version" paddingInline={2}>
                <Text size="sm" style={{ color: 'var(--color-text-disabled)', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}>
                  {t('projects.version', { version })}
                </Text>
              </Stack>
            )}
          </VStack>}
        </VStack>
      )}
    </VStack>
  );
}
