import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  discoveredWorktreesFor,
  newProjectTargetFor,
  selectedWorkspaceFor,
  type DiscoverCtaOutcome,
  type ProjectImportEntryPoint,
  type ProjectImportOutcome,
  type ProjectImportRefusalReason,
  type ProjectsSelection,
  type ProjectSummary,
  type RenameRequest,
  type WorkspaceCreated,
  type WorkspaceSummary,
  type ChromeSlots,
} from '@studio/events';
import { RefusalDialog, refusalFrom, type Refusal } from '../canvas/RefusalDialog.js';
import { accountSlot } from '../cloud/slot.js';
import { useBlankCreateStore } from '../create/store.js';
import { registerProjectsActions } from '../diagnostics/registry.js';
import { t } from '@studio/i18n';
import { useGitStatusStore } from '../git-status/store.js';
import { ignoreRefusal } from '../refusal.js';
import { discoverCardVisible } from './discoverCta.js';
import { gitCardPropsFor } from './gitCardProps.js';
import { discoveredMetaFor, type DiscoveredWorktreeItem } from './DiscoveredWorktrees.js';
import { ImportRefusalDialog } from './ImportRefusalBody.js';
import { OpenRefusalDialog } from './OpenRefusalDialog.js';
import { type ProjectGridItem } from './ProjectGrid.js';
import { ProjectMenuItems, WorkspaceMenuItems } from './menus.js';
import { ProjectsView } from './ProjectsView.js';
import type { Workspace } from './ProjectsSidebar.js';
import { relativeTime } from './relativeTime.js';
import { refreshProjects, useProjectsStore } from './store.js';
import { useSettingsStore } from '../settings/store.js';
import { useAppInfoStore } from '../app/store.js';
import { useArtifactListing } from '../canvas/artifact/listing.js';
import { ArtifactsPage } from './ArtifactsPage.js';
import { useFillWindowBar } from '../topbar/slots.js';
import { openProject } from '../workspace/session.js';
import { studio } from '../bridge.js';

const PROJECTS_SLOTS: ChromeSlots = { showFolder: true };

// Creates nothing: New Project names a folder to main, whose machine cuts the worktree and reports its phases here (ONL-2244).

function isReceded(project: ProjectSummary): boolean {
  return project.missing || project.archived;
}

type Renaming =
  | { target: 'project'; workspacePath: string }
  | { target: 'workspace'; repoIdentity: string; isAtTitle?: boolean };

export interface ProjectsScreenProps {

  onOpenProject: (workspace: WorkspaceCreated) => void;

  onCreateBlank: () => void;

  initialWorkspaceId?: string;
}

/** The Workspace wears its most recently opened Project's capture (ONL-2744). */
function toWorkspaceRow(w: WorkspaceSummary): Workspace {
  const latest = w.projects
    .filter((p) => p.previewUrl !== undefined && !p.missing)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))[0];
  return { id: w.repoIdentity, name: w.name, ...(latest?.previewUrl === undefined ? {} : { previewSrc: latest.previewUrl }) };
}

export function ProjectsScreen({
  onOpenProject,
  onCreateBlank,
  initialWorkspaceId,
}: ProjectsScreenProps): React.JSX.Element {
  useFillWindowBar(PROJECTS_SLOTS);
  const workspaces = useProjectsStore((s) => s.workspaces);
  const copyLimitReached = useProjectsStore((s) => s.copyLimitReached);
  const { records: artifacts, error: artifactError } = useArtifactListing();
  const recentRowRef = useRef<HTMLDivElement>(null);

  const discovered = useProjectsStore((s) => s.discovered);
  const gitRows = useGitStatusStore((s) => s.rows);
  const gitDefaults = useGitStatusStore((s) => s.defaults);
  const [selection, setSelection] = useState<ProjectsSelection>(
    initialWorkspaceId
      ? { kind: 'workspace', repoIdentity: initialWorkspaceId }
      : { kind: 'recent' },
  );
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [importRefusal, setImportRefusal] = useState<ProjectImportRefusalReason | null>(null);
  const [openRefusal, setOpenRefusal] = useState<React.ComponentProps<typeof OpenRefusalDialog>['reason']>(null);
  const [removing, setRemoving] = useState<string[]>([]);
  const version = useAppInfoStore((state) => state.version);
  const isSettingsPrimed = useSettingsStore((state) => state.isPrimed);
  const isDiscoverResolved = useSettingsStore((state) => state.discoverCtaResolved);
  const isDiscoverResolvedInSession = useSettingsStore((state) => state.isDiscoverResolvedInSession);
  const [renaming, setRenaming] = useState<Renaming | undefined>(undefined);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const resolveDiscover = useCallback((outcome: DiscoverCtaOutcome): void => {
    studio().telemetryEvent({ event: 'discover_cta_resolved', properties: { outcome } });
    void useSettingsStore
      .getState()
      .resolveDiscoverCta()
      .catch(ignoreRefusal('projects', 'discover cta resolve'));
  }, []);

  /* The window-open handler in `main/window/host.ts` turns this into the default browser and denies the popup; no bridge call is involved. */
  const starDiscover = useCallback(
    (url: string): void => {
      window.open(url, '_blank', 'noopener');
      resolveDiscover('starred');
    },
    [resolveDiscover],
  );

  const dismissDiscover = useCallback((): void => {
    resolveDiscover('dismissed');
  }, [resolveDiscover]);

  /* Across every workspace, not the selected one: an empty workspace beside a full one is still a user who has something. */
  const hasProject = workspaces.some((workspace) => workspace.projects.length > 0);

  const isDiscoverVisible = discoverCardVisible({
    isPrimed: isSettingsPrimed,
    hasProject,
    isResolved: isDiscoverResolved,
    isResolvedInSession: isDiscoverResolvedInSession,
  });

  /* Keyed on the card's visibility rather than on a render: a re-render that
     changes nothing a viewer sees is not a display (ONL-2443). */
  useEffect(() => {
    if (!isDiscoverVisible) return;
    studio().telemetryEvent({ event: 'discover_cta_shown', properties: {} });
  }, [isDiscoverVisible]);

  const commitRename = useCallback((req: RenameRequest): void => {

    setRenaming(undefined);
    void studio().rename(req).catch(ignoreRefusal('projects', 'rename'));
  }, []);

  const cancelRename = useCallback((): void => {
    setRenaming(undefined);
  }, []);

  useEffect(() => {

    void studio().locationSet({ kind: 'projects' });
  }, []);

  useEffect(() => {

    void refreshProjects();
  }, []);

  useEffect(() => {

    studio().tabsContext(
      selection.kind === 'workspace' ? { repoIdentity: selection.repoIdentity } : {},
    );
  }, [selection]);

  const open = useCallback(
    async (project: ProjectSummary): Promise<void> => {

      if (useBlankCreateStore.getState().status.kind !== 'idle') return;
      const opened = await openProject(project.workspacePath);
      if (!isMounted.current) return;
      if (opened.kind === 'failed') {
        setOpenRefusal(opened.reason ?? 'failed');
        await refreshProjects();
        return;
      }
      if (opened.kind === 'ready') onOpenProject(opened.workspace);
    },
    [onOpenProject],
  );

  const planAndCreate = useCallback(async (sourcePath: string): Promise<void> => {
    const result = await studio().workspacePlan({ sourcePath, entryPoint: 'projects' });
    // A plan that resolves after a card opened another project must not create into that tab.
    if (!isMounted.current || useBlankCreateStore.getState().status.kind !== 'idle') return;
    if (result.kind === 'refused') {
      setRefusal(refusalFrom(result, sourcePath));
      return;
    }
    studio().tabsCreateProject({ sourcePath: result.sourcePath, entryPoint: 'projects' });
  }, []);

  const pickAndCreate = useCallback(async (): Promise<void> => {
    const picked = await studio().pickFolder({
      title: t('project.dialog.title'),
      buttonLabel: t('project.dialog.confirm'),
      creationSource: 'folder',
    });
    if (picked.canceled || !picked.folder) return;
    void planAndCreate(picked.folder.path);
  }, [planAndCreate]);

  const selected = selectedWorkspaceFor(selection, workspaces);
  const isArtifactsSelected = selection.kind === 'artifacts';
  // The listing emptying is the event: fall back to Recent as it lands, not a render later.
  useEffect(() => {
    if (!isArtifactsSelected) return;
    const fallBack = ({ records, error }: ReturnType<typeof useArtifactListing.getState>): void => {
      if (records?.length !== 0 || error || useArtifactListing.getState().deletingIds.length > 0) return;
      setSelection({ kind: 'recent' });
      recentRowRef.current?.querySelector('button')?.focus();
    };
    fallBack(useArtifactListing.getState());
    return useArtifactListing.subscribe(fallBack);
  }, [isArtifactsSelected]);
  const viewScope = useMemo((): ProjectsSelection => {
    if (isArtifactsSelected) return { kind: 'artifacts' };
    if (selected) return { kind: 'workspace', repoIdentity: selected.repoIdentity };
    return { kind: 'recent' };
  }, [isArtifactsSelected, selected]);

  // Not a render-time fallback: the `+` target below fires on `selection`, so it has to actually move (ONL-2523).
  useEffect(() => {
    if (selection.kind === 'workspace' && selected === undefined) setSelection({ kind: 'recent' });
  }, [selection, selected]);

  const selectWorkspace = useCallback((repoIdentity: string): void => {
    setSelection({ kind: 'workspace', repoIdentity });
  }, []);

  const reveal = useCallback((project: ProjectSummary): void => {
    void studio()
      .revealProject({ workspacePath: project.workspacePath })
      .catch(ignoreRefusal('projects', 'reveal'));
  }, []);

  const remove = useCallback((project: ProjectSummary): void => {
    void studio()
      .removeProject({ target: 'project', workspacePath: project.workspacePath })
      .catch(ignoreRefusal('projects', 'remove'));
  }, []);

  const removeWorkspace = useCallback((repoIdentity: string): void => {
    setRemoving((ids) => (ids.includes(repoIdentity) ? ids : [...ids, repoIdentity]));
    void studio()
      .removeProject({ target: 'workspace', repoIdentity })
      .catch(ignoreRefusal('projects', 'remove workspace'))
      .finally(() => {
        setRemoving((ids) => ids.filter((id) => id !== repoIdentity));
      });
  }, []);

  const importWorktree = useCallback(
    async (
      handle: string,
      entryPoint: ProjectImportEntryPoint,
    ): Promise<ProjectImportOutcome | undefined> => {
      const result = await studio()
        .importWorktree({ handle, entryPoint })
        .catch(ignoreRefusal('projects', 'import worktree'));
      if (!result) return undefined;
      if (!result.ok) setImportRefusal(result.reason);
      return result;
    },
    [],
  );

  const pickAndImport = useCallback(async (): Promise<void> => {
    const picked = await studio().pickFolder({
      title: t('projects.import.dialog.title'),
      buttonLabel: t('projects.import.dialog.confirm'),
    });
    if (picked.canceled || !picked.folder) return;
    await importWorktree(picked.folder.path, 'picked');
  }, [importWorktree]);

  const selectedWorkspace = selected?.repoIdentity ?? null;
  useEffect(
    () =>
      registerProjectsActions({
        open,
        reveal,
        remove,
        removeWorkspace,
        selectWorkspace,
        selectedWorkspace,
        importWorktree,
      }),
    [open, reveal, remove, removeWorkspace, selectWorkspace, selectedWorkspace, importWorktree],
  );

  const createFrom = useCallback(
    (from: ProjectsSelection): void => {
      const target = newProjectTargetFor(from, workspaces);
      // A known folder takes no picker. A fresh worktree every time, which IS "new project" in this model.
      if (target.kind === 'pick') {
        void pickAndCreate();
        return;
      }
      void planAndCreate(target.sourcePath);
    },
    [workspaces, planAndCreate, pickAndCreate],
  );

  const newProject = useCallback((): void => {
    createFrom(selection);
  }, [createFrom, selection]);

  const toItem = useCallback(
    (project: ProjectSummary): ProjectGridItem => {
      const time = relativeTime(project.lastOpenedAt, Date.now());

      const timeText = t(time.key, time.params);
      return {
        id: project.workspacePath,
        name: project.name,
        meta: project.missing ? t('projects.card.missing') : timeText,
        isMissing: project.missing,
        isArchived: project.archived,
        ...(project.previewUrl === undefined ? {} : { previewSrc: project.previewUrl }),
        ...gitCardPropsFor(gitRows[project.workspacePath], gitDefaults, isReceded(project)),
        isRenaming:
          renaming?.target === 'project' && renaming.workspacePath === project.workspacePath,
        renameValue: project.editableName,
        onRenameCommit: (newName: string) => {
          commitRename({ target: 'project', workspacePath: project.workspacePath, name: newName });
        },
        onRenameCancel: cancelRename,
        menu: (
          <ProjectMenuItems
            onDuplicate={() => { studio().tabsDuplicateProject({ workspacePath: project.workspacePath }); }}
            copyLimitReached={copyLimitReached}
            isArchived={project.archived}
            isMissing={project.missing}
            onRename={() => {
              setRenaming({ target: 'project', workspacePath: project.workspacePath });
            }}
            onReveal={() => {
              reveal(project);
            }}
            onArchive={() => {
              void studio().setArchived({
                target: 'project',
                workspacePath: project.workspacePath,
                archived: !project.archived,
              });
            }}
            onRemove={() => {
              remove(project);
            }}
          />
        ),
        onOpen: () => {
          void open(project);
        },
      };
    },
    [open, reveal, remove, renaming, commitRename, cancelRename, gitRows, gitDefaults, copyLimitReached],
  );

  const { items, archivedItems, title } = useMemo(() => {
    if (viewScope.kind === 'artifacts') {
      return { title: t('artifact.library.title'), items: [], archivedItems: [] };
    }
    if (selected) {
      return {
        title: selected.name,
        items: selected.projects.filter((p) => !p.archived).map((p) => toItem(p)),
        archivedItems: selected.projects.filter((p) => p.archived).map((p) => toItem(p)),
      };
    }

    const recent = workspaces
      .filter((w) => !w.archived)
      .flatMap((w) =>
        w.projects
          .filter((p) => !p.archived)
          .map((p) => ({ openedAt: p.lastOpenedAt, item: toItem(p) })),
      )
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
      .map((entry) => entry.item);
    return { title: t('projects.nav.recent'), items: recent, archivedItems: [] };
  }, [viewScope, selected, workspaces, toItem]);

  const discoveredItems = useMemo((): DiscoveredWorktreeItem[] => {
    return discoveredWorktreesFor(viewScope, discovered)
      .map((candidate) => ({
      handle: candidate.handle,
      name: candidate.name,
      meta: discoveredMetaFor(candidate, Date.now()),
      ...(candidate.latestCommit === undefined ? {} : { latestCommit: candidate.latestCommit }),
      onImport: async () => {
        await importWorktree(candidate.handle, 'discovered');
      },
    }));
  }, [discovered, viewScope, importWorktree]);

  const shown = items.length + archivedItems.length;
  const withImage = [...items, ...archivedItems].filter((item) => item.previewSrc !== undefined).length;
  useEffect(() => {
    if (shown === 0) return;
    studio().telemetryEvent({
      event: 'canvas_thumbnail_displayed',
      properties: { with_image: withImage, placeholder: shown - withImage },
    });
  }, [shown, withImage]);

  const workspaceMenu = useCallback(
    (repoIdentity: string): React.ReactNode => {
      const workspace = selectedWorkspaceFor({ kind: 'workspace', repoIdentity }, workspaces);
      if (!workspace) return null;
      return (
        <WorkspaceMenuItems
          isArchived={workspace.archived}
          onNewProject={() => {
            createFrom({ kind: 'workspace', repoIdentity });
          }}
          onRename={() => {
            setRenaming({ target: 'workspace', repoIdentity });
          }}
          onArchive={() => {
            void studio().setArchived({
              target: 'workspace',
              repoIdentity,
              archived: !workspace.archived,
            });
          }}
          onRemove={() => {
            removeWorkspace(repoIdentity);
          }}
        />
      );
    },
    [workspaces, createFrom, removeWorkspace],
  );

  return (
    <>
      <ProjectsView
        title={title}
        projects={items}
        archivedProjects={archivedItems}
        discoveredWorktrees={discoveredItems}
        onImportAllDiscovered={() => studio().telemetryEvent({
          event: 'project_recovery_action',
          properties: { action: 'import-all', count: discoveredItems.length },
        })}
        workspaces={workspaces
          .filter((w) => !w.archived)
          .map(toWorkspaceRow)}
        archivedWorkspaces={workspaces
          .filter((w) => w.archived)
          .map(toWorkspaceRow)}
        removingWorkspaceIds={removing}
        {...(selected ? { selectedWorkspaceId: selected.repoIdentity } : {})}
        isRecentSelected={!selected && !isArtifactsSelected}
        hasArtifacts={(artifacts?.length ?? 0) > 0 || isArtifactsSelected}
        isArtifactsSelected={isArtifactsSelected}
        recentRowRef={recentRowRef}
        onSelectArtifacts={() => { setSelection({ kind: 'artifacts' }); }}
        {...(isArtifactsSelected ? { content: <ArtifactsPage records={artifacts} error={artifactError} />, subtitle: t('artifact.library.projectsIntro') } : {})}
        onReorderWorkspaces={(orderedIds) => {
          const rank = new Map(orderedIds.map((id, i) => [id, i]));
          const place = (id: string): number => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
          useProjectsStore.getState().apply({
            workspaces: [...workspaces].sort(
              (a, b) => place(a.repoIdentity) - place(b.repoIdentity),
            ),
          });
          void studio().reorderWorkspaces({ order: orderedIds });
        }}
        onSelectRecent={() => {
          setSelection({ kind: 'recent' });
        }}
        onSelectWorkspace={selectWorkspace}
        workspaceMenu={workspaceMenu}
        {...(renaming?.target === 'workspace' && renaming.isAtTitle !== true
          ? { renamingWorkspaceId: renaming.repoIdentity }
          : {})}
        isTitleRenaming={renaming?.target === 'workspace' && renaming.isAtTitle === true}
        {...(selected
          ? {
              onTitleRename: () => {
                setRenaming({ target: 'workspace', repoIdentity: selected.repoIdentity, isAtTitle: true });
              },
            }
          : {})}
        onWorkspaceRename={(repoIdentity) => {
          setRenaming({ target: 'workspace', repoIdentity });
        }}
        onWorkspaceRenameCommit={(repoIdentity, newName) => {
          commitRename({ target: 'workspace', repoIdentity, name: newName });
        }}
        onWorkspaceRenameCancel={cancelRename}
        onAddWorkspace={() => {
          void pickAndCreate();
        }}
        onOpenGithub={(path, existing) => {
          if (!existing) { void planAndCreate(path); return; }
          const project = workspaces.flatMap((workspace) => workspace.projects).find((candidate) => candidate.workspacePath === path);
          if (project !== undefined) void open(project);
        }}
        onNewProject={newProject}
        onImportExisting={() => {
          void pickAndImport();
        }}
        onCreateBlank={onCreateBlank}
        account={accountSlot('row')}
        {...(version !== undefined ? { version } : {})}
        isDiscoverVisible={isDiscoverVisible}
        onDiscoverStar={starDiscover}
        onDiscoverDismiss={dismissDiscover}
      />

      <RefusalDialog
        refusal={refusal ?? undefined}
        onDismiss={() => {
          setRefusal(null);
        }}
        onCreateBlank={() => {
          setRefusal(null);
          onCreateBlank();
        }}
      />
      <ImportRefusalDialog
        reason={importRefusal}
        onDismiss={() => {
          setImportRefusal(null);
        }}
      />
      <OpenRefusalDialog reason={openRefusal} onDismiss={() => { setOpenRefusal(null); }} />
    </>
  );
}
