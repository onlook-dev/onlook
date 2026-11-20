import { Divider } from '@astryxdesign/core/Divider';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { PILL_FIXTURES } from '@studio/git-ui/fixtures';
import { SetupTurn } from '@studio/chat-ui';
import type { CopyFailure } from '@studio/events';
import { narrationFor } from '../create/projectCreate.js';
import { setupNarration } from '../chat/panelProps.js';
import { t } from '@studio/i18n';
import { discoveredMetaFor, type DiscoveredWorktreeItem } from '../projects/DiscoveredWorktrees.js';
import { ProjectCard } from '../projects/ProjectCard.js';
import { type ProjectGridItem } from '../projects/ProjectGrid.js';
import { ProjectsView } from '../projects/ProjectsView.js';
import { ImportRefusalBody } from '../projects/ImportRefusalBody.js';
import { RefusalBody } from '../canvas/RefusalDialog.js';
import { WindowFrame } from '../topbar/WindowFrame.js';
import { ForwardIcon } from '../icons/glyphs.js';
import { MENU_SURFACE } from '../menu/surface.js';
import { ProjectMenuItems, WorkspaceMenuItems } from '../projects/menus.js';
import { noop } from './showroom/Showroom.js';

const PROJECTS: ProjectGridItem[] = [
  { id: '1', name: 'red-skylark', meta: '2d', showMenu: true },
  { id: '2', name: 'blue-harron', meta: '3d' },
  { id: '3', name: 'green-swan', meta: '4d ago' },
  { id: '4', name: 'green-swan', meta: '6d ago' },
  { id: '5', name: 'amber-quail', meta: '4d ago' },
  { id: '6', name: 'slate-heron', meta: '4d ago' },
  { id: '7', name: 'violet-crane', meta: '4d ago' },
  { id: '8', name: 'a-considerably-longer-project-name-than-fits', meta: '4d ago' },
];

const WORKSPACES = [
  { id: 'zest-maps', name: 'zest-maps' },
  { id: 'unselected', name: 'unselected folder' },
  { id: 'hovered', name: 'a-workspace-with-a-very-long-name' },
];

/** Enough rows to overflow the column — the footer row must stay in view (ONL-2184). */
const MANY_WORKSPACES = Array.from({ length: 40 }, (_, i) => ({
  id: `folder-${String(i)}`,
  name: `folder-${String(i)}`,
}));

/** Worktrees on disk the registry has no record of — the recovery path (ONL-2522). */
/* Fixed, so the still life does not change wording as the clock moves. */
const DISCOVERED_NOW = Date.parse('2026-10-05T12:00:00.000Z');

const DISCOVERED: DiscoveredWorktreeItem[] = [
  {
    handle: '/workspaces/zest-maps/amber-quail',
    name: 'amber-quail',
    meta: discoveredMetaFor(
      { groupName: 'zest-maps', lastEditedAt: '2026-09-28T12:00:00.000Z' },
      DISCOVERED_NOW,
    ),
    onImport: noop,
  },
  {
    // No record answered for this one, so it carries no date rather than a guessed one.
    handle: '/workspaces/zest-maps/slate-heron',
    name: 'slate-heron',
    meta: discoveredMetaFor({ groupName: 'zest-maps' }, DISCOVERED_NOW),
    onImport: noop,
  },
];



/* A stand-in for a stored thumbnail: frames fit-all at the card's ratio over a zeroed buffer, so
   the margin and the gaps between frames are transparent and the card's ground shows through. */
const COMPOSITE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 273 140">
     <g fill="#fafafa">
       <rect x="12" y="12" width="141" height="116" rx="3"/>
       <rect x="159" y="12" width="102" height="70" rx="3"/>
       <rect x="159" y="88" width="102" height="40" rx="3"/>
     </g>
     <g fill="#d4d4d4">
       <rect x="22" y="24" width="64" height="7" rx="3"/>
       <rect x="22" y="39" width="110" height="5" rx="2"/>
       <rect x="169" y="24" width="48" height="6" rx="3"/>
       <rect x="169" y="100" width="40" height="6" rx="3"/>
     </g>
   </svg>`,
)}`;

const PAGE = { background: 'var(--studio-ground)' } as const;

/** The design frame's own 1512x949, so a capture compares to it with no scaling. */
const SCREEN = {
  width: '1512px',
  height: '949px',
  flex: '0 0 auto',
  overflow: 'hidden',
  borderRadius: 'var(--radius-page)',
  border: 'var(--border-width) solid var(--color-border)',
} as const;

const SECTION = { padding: '24px 32px' } as const;

/** A stand-in for the words the failing command printed, which the row keeps behind Show details. */
const COPY_OUTPUT = 'git commit -q -m "Initial copy of the project folder"\nnothing added to commit but untracked files present';
const CARD_SLOT = { width: '263px', minWidth: 0 } as const;

/** The open menus float below their triggers; the room is reserved so a capture is not overlapped. */
const MENU_ROW = {
  minHeight: '460px',
  '--color-background-popover': 'var(--color-background-surface)',
} as React.CSSProperties;

function Screen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VStack gap={2}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <VStack style={SCREEN} data-testid="showroom-screen">
        {/* The window's own bar: the view no longer reserves the band, so without this the screen starts 38px above the design frame (ONL-1935). */}
        <WindowFrame>{children}</WindowFrame>
      </VStack>
    </VStack>
  );
}

export function ProjectsShowroom({ scenario = '' }: { scenario?: string }): React.JSX.Element {
  const [hasPendingProject, setHasPendingProject] = useState(false);
  const [isCopyLimitTooltipOpen, setIsCopyLimitTooltipOpen] = useState(false);
  let discoveredItems = DISCOVERED;
  if (scenario === 'empty') discoveredItems = [];
  if (scenario.startsWith('imported')) discoveredItems = DISCOVERED.slice(1);
  if (scenario === 'pending') {
    discoveredItems = DISCOVERED.map((item, index) => ({
      ...item,
      onImport: index === 0 ? async () => { setHasPendingProject(true); } : () => new Promise<void>(() => {}),
    }));
    if (hasPendingProject) discoveredItems = discoveredItems.slice(1);
  }
  useLayoutEffect(() => {
    setIsCopyLimitTooltipOpen(false);
    let menuFrame: number | undefined;
    const frame = requestAnimationFrame(() => {
      if (scenario.endsWith('-focus')) document.documentElement.dataset.input = 'keyboard';
      if (scenario.startsWith('copy-failure-') && scenario.endsWith('-focus')) {
        document.querySelector<HTMLElement>('[data-testid="chat-setup-retry"], [data-testid="chat-setup-choose-folder"]')?.focus();
      }
      if (scenario.startsWith('copy-failure-') && scenario.endsWith('-details')) {
        document.querySelector<HTMLElement>('[data-testid="chat-setup-output-toggle"]')?.click();
      }
      if (scenario.startsWith('copy-') && scenario !== 'copy-setup' && scenario !== 'copy-error') {
        const card = document.querySelector<HTMLElement>('[data-project-id="copy-source"]');
        if (card !== null) {
          const box = card.getBoundingClientRect();
          card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: box.right - 24, clientY: box.top + 24 }));
          if (scenario === 'copy-limit' || scenario === 'copy-focus' || scenario === 'copy-hover') {
            menuFrame = requestAnimationFrame(() => {
              if (scenario === 'copy-limit') {
                setIsCopyLimitTooltipOpen(true);
                return;
              }
              const copy = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) => item.textContent?.includes(t('projects.menu.duplicate')));
              copy?.focus();
              if (scenario === 'copy-hover') document.documentElement.dataset.input = 'pointer';
            });
          }
        }
      } else if (scenario === 'menu') {
        document.querySelector<HTMLElement>('[data-testid="new-project-menu"]')?.click();
      } else if (scenario === 'collapsed') {
        document.querySelector<HTMLElement>('[data-testid="discovered-worktrees-toggle"]')?.click();
      } else if (scenario === 'pending') {
        document.querySelector<HTMLElement>('[data-testid="discovered-worktrees-import-all"]')?.click();
      } else if (scenario === 'recovery-focus') {
        document.querySelector<HTMLElement>('[data-testid="discovered-worktrees-import-all"]')?.focus();
      } else if (scenario === 'imported-focus') {
        document.querySelector<HTMLElement>('[data-testid="project-card-open"]')?.focus();
      } else if (scenario === 'imported-hover') {
        document.querySelector<HTMLElement>('[data-project-id="1"]')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (menuFrame !== undefined) cancelAnimationFrame(menuFrame);
    };
  }, [scenario]);

  if (scenario.startsWith('copy-')) {
    const causes: CopyFailure['cause'][] = ['ignored_files', 'permission_denied', 'folder_unavailable', 'copy_in_progress', 'disk_full', 'git_timed_out', 'git_failed', 'unknown'];
    const cause = causes.find((value) => scenario.replace(/-(hover|focus|details)$/, '') === `copy-failure-${value.replaceAll('_', '-')}`);
    const showsSetup = scenario === 'copy-setup' || scenario === 'copy-error' || cause !== undefined;
    const setup = narrationFor(
      cause !== undefined
        ? { kind: 'failed', phase: 'copying', sourceRepoName: 'Landing', copyFailure: { step: 'copy_files', cause }, detail: COPY_OUTPUT }
        : scenario === 'copy-error'
        ? { kind: 'failed', phase: 'copying', sourceRepoName: 'Landing', detail: t('projects.copy.error.submodules') }
        : { kind: 'copying', sourceRepoName: 'fixture-app', workspaceName: 'landing-copy', duplicateSourceName: 'Landing' },
      { hasLiveServer: false },
    );
    const setupProps = setupNarration(setup, { onRetry: noop, onChooseFolder: noop, onDismiss: noop });
    return (
      <ProjectsView
        title="zest-maps"
        projects={showsSetup ? [] : [{
          id: 'copy-source', name: 'Landing', meta: '2d', onOpen: noop,
          isArchived: scenario === 'copy-archived', isMissing: scenario === 'copy-missing',
          menu: <ProjectMenuItems
            isArchived={scenario === 'copy-archived'} isMissing={scenario === 'copy-missing'}
            copyLimitReached={scenario === 'copy-unresolved' ? null : scenario === 'copy-limit'} isCopyLimitTooltipOpen={scenario === 'copy-limit' && isCopyLimitTooltipOpen}
            onRename={noop} onDuplicate={noop} onReveal={noop} onArchive={noop} onRemove={noop}
          />,
        }]}
        {...(showsSetup && setupProps !== undefined ? {
          content: (
            <VStack style={SECTION}>
              {scenario.endsWith('-hover') && <style>{'[data-testid="chat-setup-retry"], [data-testid="chat-setup-choose-folder"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>}
              {/* The panel hands the row its chevron; this instrument renders the row alone and hands it the same one. */}
              <SetupTurn {...setupProps} chevronIcon={ForwardIcon} />
            </VStack>
          ),
        } : {})}
        workspaces={WORKSPACES.slice(0, 1)} selectedWorkspaceId="zest-maps" isRecentSelected={false}
        onNewProject={noop} onImportExisting={noop}
      />
    );
  }

  if (scenario) {
    return (
      <>
        {scenario === 'recovery-hover' && (
          <style>{'[data-testid="discovered-worktrees"] .astryx-button { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>
        )}
        {scenario.endsWith('-focus') && (
          <style>{'[data-testid="discovered-worktrees-import-all"]:focus, [data-testid="project-card-open"]:focus { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }'}</style>
        )}
        <ProjectsView
          title={scenario === 'menu' || scenario === 'workspace-recovery' ? 'zest-maps' : 'Recent projects'}
          projects={scenario.startsWith('imported') || scenario === 'menu' || hasPendingProject ? PROJECTS.slice(0, 1).map(project => ({
            ...project,
            onOpen: noop,
            previewSrc: scenario === 'imported-thumbnail' ? COMPOSITE : undefined,
            isMissing: scenario === 'imported-missing',
          })) : []}
          workspaces={scenario === 'empty' ? [] : WORKSPACES.slice(0, 1)}
          discoveredWorktrees={discoveredItems}
          isRecentSelected={scenario !== 'menu' && scenario !== 'workspace-recovery'}
          {...(scenario === 'menu' || scenario === 'workspace-recovery' ? { selectedWorkspaceId: 'zest-maps' } : {})}
          onImportExisting={noop}
          version="0.4.0-beta.812"
        />
        <Dialog isOpen={scenario === 'refused'} onOpenChange={noop} purpose="form" width={460}>
          <ImportRefusalBody reason="is-the-repository" onDismiss={noop} />
        </Dialog>
        <Dialog isOpen={scenario === 'refused-copy' || scenario === 'start-fresh'} onOpenChange={noop} purpose="form" width={460} data-testid="connect-dialog">
          <RefusalBody
            refusal={scenario === 'start-fresh' ? { reason: 'nothing-to-copy', folderName: 'my-new-site' } : { reason: 'already-copied', projectName: 'zest-maps' }}
            onDismiss={noop}
            onCreateBlank={noop}
          />
        </Dialog>
      </>
    );
  }
  return (
    <VStack style={PAGE}>
      <VStack gap={8} style={SECTION}>
        <Screen label="populated · a workspace selected, third row hovered">
          <ProjectsView
            title="zest-maps"
            projects={PROJECTS}
            workspaces={WORKSPACES}
            selectedWorkspaceId="zest-maps"
            hoveredId="hovered"
          />
        </Screen>

        <Screen label="empty · Recent Projects selected">
          <ProjectsView
            title="Recent projects"
            projects={[]}
            workspaces={[{ id: 'zest-maps', name: 'zest-maps' }]}
            isRecentSelected
            onImportExisting={noop}
            version="0.4.0-beta.812"
          />
        </Screen>

        <Screen label="recovery · every project gone, the worktrees still on disk">
          <ProjectsView
            title="Recent projects"
            projects={[]}
            workspaces={[]}
            discoveredWorktrees={DISCOVERED}
            isRecentSelected
            onImportExisting={noop}
            version="0.4.0-beta.812"
          />
        </Screen>

        <Screen label="populated · the section under the grid, New Project split">
          <ProjectsView
            title="zest-maps"
            projects={PROJECTS.slice(0, 3)}
            workspaces={WORKSPACES}
            selectedWorkspaceId="zest-maps"
            discoveredWorktrees={DISCOVERED}
            onImportExisting={noop}
          />
        </Screen>

        <Screen label="forty workspaces · the sections scroll, the safety row stays">
          <ProjectsView
            title="Recent projects"
            projects={[]}
            workspaces={MANY_WORKSPACES}
            isRecentSelected
            version="0.4.0-beta.812"
          />
        </Screen>

        <Screen label="discover card · at rest, above the version row (ONL-2443)">
          <ProjectsView
            title="Recent projects"
            projects={PROJECTS}
            workspaces={WORKSPACES}
            isRecentSelected
            version="0.4.0-beta.812"
            isDiscoverVisible
            onDiscoverStar={noop}
            onDiscoverDismiss={noop}
          />
        </Screen>

        <Screen label="discover card · forty workspaces, the list scrolls under it">
          <ProjectsView
            title="Recent projects"
            projects={PROJECTS}
            workspaces={MANY_WORKSPACES}
            isRecentSelected
            version="0.4.0-beta.812"
            isDiscoverVisible
            onDiscoverStar={noop}
            onDiscoverDismiss={noop}
          />
        </Screen>

        <Screen label="discover card · resolved, the rail the user keeps">
          <ProjectsView
            title="Recent projects"
            projects={PROJECTS}
            workspaces={MANY_WORKSPACES}
            isRecentSelected
            version="0.4.0-beta.812"
            isDiscoverVisible={false}
          />
        </Screen>

        <Divider />

        <Heading level={2} color="primary">
          Context menus
        </Heading>
        <HStack gap={10} align="start" style={MENU_ROW}>
          <VStack gap={2}>
            <Text type="supporting" color="secondary">
              on a project card
            </Text>
            <DropdownMenu
              button={{ label: 'card', variant: 'secondary', size: 'sm' }}
              menuWidth={200}
              style={MENU_SURFACE}
              data-testid="menu-project"
            >
              <ProjectMenuItems
                onRename={noop}
                onReveal={noop}
                onArchive={noop}
                onRemove={noop}
              />
            </DropdownMenu>
          </VStack>
          <VStack gap={2}>
            <Text type="supporting" color="secondary">
              on a project card whose folder is gone
            </Text>
            <DropdownMenu
              button={{ label: 'card, missing', variant: 'secondary', size: 'sm' }}
              menuWidth={200}
              style={MENU_SURFACE}
              data-testid="menu-project-missing"
            >
              <ProjectMenuItems
                isMissing
                isArchived
                onRename={noop}
                onReveal={noop}
                onArchive={noop}
                onRemove={noop}
              />
            </DropdownMenu>
          </VStack>
          <VStack gap={2}>
            <Text type="supporting" color="secondary">
              on a workspace folder
            </Text>
            <DropdownMenu
              button={{ label: 'workspace', variant: 'secondary', size: 'sm' }}
              menuWidth={200}
              style={MENU_SURFACE}
              data-testid="menu-workspace"
            >
              <WorkspaceMenuItems
                onNewProject={noop}
                onRename={noop}
                onArchive={noop}
                onRemove={noop}
              />
            </DropdownMenu>
          </VStack>
          <VStack gap={2}>
            <Text type="supporting" color="secondary">
              on an archived workspace folder
            </Text>
            <DropdownMenu
              button={{ label: 'workspace, archived', variant: 'secondary', size: 'sm' }}
              menuWidth={200}
              style={MENU_SURFACE}
              data-testid="menu-workspace-archived"
            >
              <WorkspaceMenuItems
                isArchived
                onNewProject={noop}
                onRename={noop}
                onArchive={noop}
                onRemove={noop}
              />
            </DropdownMenu>
          </VStack>
        </HStack>

        <Divider />

        <Heading level={2} color="primary">
          Project card — states
        </Heading>
        <HStack gap={8} align="start">
          <VStack gap={2} style={CARD_SLOT}>
            <Text type="supporting" color="secondary">
              the canvas, composed — the pill sits over it
            </Text>
            <ProjectCard
              name="red-skylark"
              meta="2d"
              previewSrc={COMPOSITE}
              gitPill={PILL_FIXTURES['ready-to-merge']}
            />
          </VStack>
          <VStack gap={2} style={CARD_SLOT}>
            <Text type="supporting" color="secondary">
              no thumbnail — the design&apos;s populated state
            </Text>
            <ProjectCard name="red-skylark" meta="2d" />
          </VStack>
          <VStack gap={2} style={CARD_SLOT}>
            <Text type="supporting" color="secondary">
              the image never arrives — the ground, and no error
            </Text>
            <ProjectCard name="red-skylark" meta="2d" previewSrc="studio-thumb://canvas/absent?v=1" />
          </VStack>
          <VStack gap={2} style={CARD_SLOT}>
            <Text type="supporting" color="secondary">
              menu showing
            </Text>
            <ProjectCard name="red-skylark" meta="2d" showMenu />
          </VStack>
          <VStack gap={2} style={CARD_SLOT}>
            <Text type="supporting" color="secondary">
              long name truncates
            </Text>
            <ProjectCard name="a-considerably-longer-project-name" meta="just now" showMenu />
          </VStack>
        </HStack>
      </VStack>
    </VStack>
  );
}
import { useLayoutEffect, useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
