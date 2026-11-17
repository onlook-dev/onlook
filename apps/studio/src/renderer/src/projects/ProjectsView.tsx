import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useState, type ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { t } from '@studio/i18n';
import { NewProjectButton } from './NewProjectButton.js';
import { ProjectGrid, type ProjectGridItem } from './ProjectGrid.js';
import { ProjectsSidebar, type ProjectsSidebarProps } from './ProjectsSidebar.js';
import { ArchiveDisclosure } from './ArchiveDisclosure.js';
import { DiscoveredWorktrees, type DiscoveredWorktreeItem } from './DiscoveredWorktrees.js';
import { RenameField } from '../RenameField.js';
import { AddCodebase } from '../github-import/AddCodebase.js';

// WindowFrame already reserves the top band (ONL-1935).
const VIEW = {
  height: '100%',

  // Menu layers inherit this value without a theming handle.
  '--color-background-popover': 'var(--color-background-surface)',
  background: 'var(--studio-ground)',
  overflow: 'hidden',
} as React.CSSProperties;

const CONTENT = {
  minWidth: 0,
  flex: '1 1 auto',

  overflow: 'hidden',
} as const;

const HEADER = {
  flex: '0 0 auto',
  paddingInline: 'var(--spacing-8)',
  background: 'var(--studio-ground)',
} as const;

/** Holds the New Project button's height whether or not it is drawn, so the title does not move (ONL-2593). */
const HEADER_INNER = {
  flex: '1 1 auto',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 'calc(var(--size-element-md) + 2 * var(--spacing-6) + 0.5px)',
  paddingBlock: 'var(--spacing-6)',
  borderBottom: '0.5px solid transparent',
} as const;

const SCROLL_RULE = 'rgba(255, 255, 255, 0.08)';

const HEADER_INNER_STUCK = {
  ...HEADER_INNER,

  borderBottom: `0.5px solid ${SCROLL_RULE}`,
} as const;

const BODY = {
  minWidth: 0,
  flex: '1 1 auto',
  overflowY: 'auto',
  paddingInline: 'var(--spacing-8)',
  paddingBlockEnd: 'var(--spacing-6)',
} as const;

const TITLE_FIELD = {
  font: 'inherit',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  letterSpacing: 'inherit',
  color: 'inherit',
} as const;

const EMPTY = { flex: '1 1 auto' } as const;

const EMPTY_MESSAGE = { color: 'var(--color-text-secondary)' } as const;

const RECOVERY = { flex: '1 1 auto' } as const;

export interface ProjectsViewProps extends ProjectsSidebarProps {

  title: string;
  projects: ProjectGridItem[];

  archivedProjects?: ProjectGridItem[];

  discoveredWorktrees?: DiscoveredWorktreeItem[];
  onImportAllDiscovered?: () => void;
  onNewProject?: () => void;

  onImportExisting?: () => void;

  content?: ReactNode;
  /** A line under the title, for a page that explains itself (ONL-2593). */
  subtitle?: string;

  onTitleRename?: () => void;
  isTitleRenaming?: boolean;
}

export interface ProjectsViewState {
  body: 'content' | 'empty' | 'recovery' | 'projects';
  canCreateProject: boolean;

  canImportProject: boolean;
}

export function projectsViewStateFor({
  content,
  projects,
  archivedProjects = [],
  discoveredWorktrees = [],
  isRecentSelected,
}: Pick<
  ProjectsViewProps,
  'content' | 'projects' | 'archivedProjects' | 'discoveredWorktrees' | 'isRecentSelected'
>): ProjectsViewState {

  const isEmpty = projects.length === 0 && archivedProjects.length === 0;
  const body = !isEmpty ? 'projects' : discoveredWorktrees.length > 0 ? 'recovery' : 'empty';
  return {
    body: content !== undefined ? 'content' : body,

    canCreateProject: content === undefined && isRecentSelected !== true,
    canImportProject: content === undefined && isRecentSelected !== true,
  };
}

export function ProjectsView({
  title,
  projects,
  archivedProjects = [],
  discoveredWorktrees = [],
  onNewProject,
  onImportAllDiscovered,
  onImportExisting,
  content,
  subtitle,
  onTitleRename,
  isTitleRenaming = false,
  ...sidebar
}: ProjectsViewProps): React.JSX.Element {
  const { body, canCreateProject, canImportProject } = projectsViewStateFor({
    content,
    projects,
    archivedProjects,
    discoveredWorktrees,
    isRecentSelected: sidebar.isRecentSelected,
  });

  const menu = canImportProject && onImportExisting !== undefined ? { onImportExisting } : {};

  const control = canCreateProject ? (
    <NewProjectButton onPress={onNewProject} {...menu} />
  ) : null;

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);

  return (
    <HStack style={VIEW} data-testid="projects-view">
      <ProjectsSidebar {...sidebar} />

      <VStack style={CONTENT} data-testid="projects-content">
        <HStack style={HEADER}>
          <HStack
            vAlign="center"
            justify="between"
            style={isScrolled ? HEADER_INNER_STUCK : HEADER_INNER}
          >
            <VStack gap={1} style={{ minWidth: 0 }}>
            <Heading level={1} type="display-3" color="primary" onDoubleClick={onTitleRename}>
              {isTitleRenaming && sidebar.selectedWorkspaceId !== undefined ? (
                <RenameField
                  initialValue={title}
                  label={t('projects.rename.workspaceField')}
                  testId="workspace-title-rename-input"
                  style={TITLE_FIELD}
                  onCommit={(name) => sidebar.onWorkspaceRenameCommit?.(sidebar.selectedWorkspaceId ?? '', name)}
                  {...(sidebar.onWorkspaceRenameCancel ? { onCancel: sidebar.onWorkspaceRenameCancel } : {})}
                />
              ) : (
                title
              )}
            </Heading>
            {subtitle !== undefined && <Text size="base" color="secondary">{subtitle}</Text>}
            </VStack>

            {control}
          </HStack>
        </HStack>

        <VStack
          style={BODY}
          gap={6}

          // Elastic overscroll can settle at a fractional scrollTop.
          onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 1)}
          data-testid="projects-scroll"
        >
        {body === 'content' ? (
          content
        ) : body === 'empty' ? (
          <VStack style={EMPTY} hAlign="center" justify="center" gap={3}>
            <Text size="2xl" weight="normal" style={EMPTY_MESSAGE}>
              {t(sidebar.isRecentSelected ? 'projects.emptyRecent' : 'projects.empty')}
            </Text>
            {sidebar.isRecentSelected && sidebar.workspaces.length === 0 && (sidebar.onAddWorkspace !== undefined || sidebar.onCreateBlank !== undefined) ? (
              <HStack gap={2} data-testid="projects-empty-actions">
                {sidebar.onAddWorkspace !== undefined && (
                  <AddCodebase entryPoint="projects" onFolder={sidebar.onAddWorkspace} isFullWidth={false} {...(sidebar.onOpenGithub ? { onOpen: sidebar.onOpenGithub } : {})} />
                )}
                {sidebar.onCreateBlank !== undefined && (
                  <Button label={t('projects.nav.newDraft')} variant="secondary" onClick={sidebar.onCreateBlank} />
                )}
              </HStack>
            ) : control}
          </VStack>
        ) : (
          <VStack
            style={body === 'recovery' ? RECOVERY : undefined}
            gap={6}
            data-testid={discoveredWorktrees.length > 0 ? 'projects-recovery' : undefined}
          >
            <DiscoveredWorktrees
              worktrees={discoveredWorktrees}
              {...(onImportAllDiscovered ? { onImportAll: onImportAllDiscovered } : {})}
            />
            {projects.length > 0 && <ProjectGrid projects={projects} />}
            {archivedProjects.length > 0 && (
              <VStack gap={3} data-testid="archived-projects">
                <ArchiveDisclosure
                  label={t('projects.section.archivedProjects')}
                  isOpen={isArchiveOpen}
                  onToggle={() => setIsArchiveOpen((open) => !open)}
                />
                {isArchiveOpen ? <ProjectGrid projects={archivedProjects} /> : null}
              </VStack>
            )}
          </VStack>
        )}
        </VStack>
      </VStack>
    </HStack>
  );
}
