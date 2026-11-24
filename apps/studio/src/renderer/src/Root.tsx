import { lazy, useCallback, useEffect, useState } from 'react';
import type { HarnessId, LaunchLocation, ProjectCreateState, TabAssignment, WorkspaceCreated } from '@studio/events';
import { VStack } from '@astryxdesign/core/Layout';

import { primeAgentConnection } from './agent/store.js';
import { primeAgentSetup, subscribeToAgentSetup } from './agent-setup/store.js';
import { App } from './App.js';
import { canvasSessionSurface } from './canvas/sessionSurface.js';
import { useCanvasStore } from './canvas/store.js';
import { clearCode } from './code/store.js';
import { BlankCreateModal } from './create/BlankCreateModal.js';
import { startBlankCreate } from './create/store.js';
import { useProjectCreateStore } from './create/projectCreate.js';
import { applyCreateScreen, commitFirstScreen, screenForCreate, type Screen } from './activation/advance.js';
import { primeAppInfo } from './app/store.js';
import { capable } from './capabilities.js';
import { primeFlags } from './flags/store.js';
import { heldProjectPath, parkedAssignment } from './heldProject.js';
import { ParkedTab } from './ParkedScreen.js';
import { BIRTH_PURPOSE, BIRTH_REQUIRES_SESSION, TAB_ID } from './tabIdentity.js';
import { registerRootActions } from './diagnostics/registry.js';
import { OnboardingFlow } from './onboarding/OnboardingFlow.js';
import { primePanels } from './panels/store.js';
import { ignoreRefusal } from './refusal.js';
import { ProjectsScreen } from './projects/ProjectsScreen.js';
import { primeProjects } from './projects/store.js';
import { primeArtifactListing } from './canvas/artifact/listing.js';
import { ReportDialog } from './report/ReportDialog.js';
import { SettingsDialog } from './settings/SettingsDialog.js';
import { openSettings } from './settings/settingsDialogStore.js';
import { primeSettings, useSettingsStore } from './settings/store.js';
import { ConsentGate } from './telemetry/Consent.js';
import { primeGitStatus, watchOpenWorktree } from './git-status/store.js';
import { BlendedWindowBar } from './topbar/slots.js';
import { WindowFrame } from './topbar/WindowFrame.js';
import {
  beginCreate,
  activateRestoredProject,
  closeProject,
  createPrimed,
  followCreate,
  installProjectSession,
  joinCreate,
  leaveProject,
  openCreated,
  openProject,
} from './workspace/session.js';
import { useWorkspaceStore } from './workspace/store.js';
import { useTabNotices } from './notifications/NotificationSurfaces.js';
import { useSurface } from './activation/useSurface.js';
import { ReadyToPresent } from './activation/ReadyToPresent.js';
import { ScreenLoadingBoundary } from './activation/ScreenLoadingBoundary.js';
import { LoginAside } from './login/LoginAside.js';
import { screenSurface } from './activation/surfaces.js';
import { primeGithub, watchGithub } from './github-import/store.js';
import { chooseHelp } from './rail/helpMenuRows.js';
import { studio } from './bridge.js';

/* Module scope: the session is the tab's, not a component's, and every screen below opens projects through it. */
installProjectSession({ ...canvasSessionSurface, clearCode });

const AccessBoundary = capable('account') ? lazy(() => import('./cloud/AccessBoundary.js')) : null;

export function Root(): React.JSX.Element {
  useTabNotices();
  const consent = useSettingsStore((state) => state.telemetryConsent);
  const needsConsent = import.meta.env.RENDERER_VITE_ONLOOK_CLOUD === 'false'
    && import.meta.env.RENDERER_VITE_TELEMETRY !== 'false'
    && (consent === undefined || consent === 'unknown');
  const [screen, setScreen] = useState<Screen>(
    BIRTH_PURPOSE === 'parked' ? { kind: 'parked' } : { kind: 'pending' },
  );
  useSurface('screen', screenSurface(screen.kind));
  /** `failed` sends a scaffold home; `stale` leaves the screen to the newer run (ONL-2593). */
  const prepareAssigned = useCallback(async (workspacePath: string, background = false): Promise<Screen | 'failed' | 'stale'> => {
    const opened = await openProject(workspacePath, background);
    if (opened.kind === 'ready') return { kind: 'editor', restored: opened.workspace };
    return opened.kind === 'failed' ? 'failed' : 'stale';
  }, []);

  const openAssigned = useCallback(async (workspacePath: string, background = false): Promise<void> => {
    if (!background) await activateRestoredProject(workspacePath);
    const next = await prepareAssigned(workspacePath, background);
    if (next === 'stale') return;
    /* The scaffold has no exit: an unopenable assignment would leave dead rails forever (ONL-2318). Only off the scaffold: an assignment must not land over a gate this view already committed. */
    setScreen((current) => (current.kind === 'parked' ? (next === 'failed' ? { kind: 'projects' } : next) : current));
  }, [prepareAssigned]);

  /** Stable, or the editor's memoized bar slots re-fill on every render (`topbar/slots.ts`). */
  const exitToProjects = useCallback(() => {
    /* One-shot, not subscribed: `Root` must not re-render when a project opens. */
    const open = useWorkspaceStore.getState().workspace;
    leaveProject();
    setScreen({
      kind: 'projects',
      ...(open ? { selectedWorkspaceId: open.repoIdentity } : {}),
    });
  }, []);

  const landBlank = useCallback((workspace: WorkspaceCreated): void => {
    void openCreated(workspace).then((opened) => {
      if (opened.kind === 'ready') setScreen({ kind: 'editor', restored: opened.workspace });
    });
  }, []);

  const createBlankFromProjects = useCallback((): void => {
    startBlankCreate('projects', landBlank);
  }, [landBlank]);

  useEffect(() => {
    const take = (): void => {
      void studio().takeDraftRequest().then((isRequested) => {
        if (isRequested) startBlankCreate('projects', landBlank, true);
      }, ignoreRefusal('projects', 'draft request'));
    };
    const unsubscribe = studio().onDraftRequested(take);
    take();
    return unsubscribe;
  }, [landBlank]);

  // After the editor unmounts, not before: a create from here would paint the left project's name, git band and outgoing restore until it lands.
  useEffect(() => {
    if (screen.kind !== 'projects') return;
    closeProject();
  }, [screen.kind]);

  /* The one puller of the settings one-shot: two pullers race, and the emit reaches every screen only from here (ONL-2499). */
  useEffect(() => {
    const take = (): void => {
      void studio().takeSettingsRequest().then((isRequested) => {
        if (isRequested) openSettings('menu');
      }, ignoreRefusal('settings', 'settings request'));
    };
    take();
    return studio().onSettingsOpen(take);
  }, []);

  useEffect(() => studio().onHelpAction((action) => chooseHelp(action, 'menu')), []);

  useEffect(() => {
    let isActive = true;
    /* Awaited one branch at a time, just before it commits; memoised, so later navigation never waits on a read (ONL-1948). */
    const projectsReady = primeProjects();
    void primeArtifactListing();
    /* Awaited with the list so the Agent row never paints blank and then flips (ONL-2115). */
    const settingsReady = primeSettings();
    /* The first screen waits on this: a surface it gates would otherwise paint and then disappear (ONL-2661). */
    const flagsReady = primeFlags();
    let stopGithub: (() => void) | undefined;
    void flagsReady.then(() => {
      if (!isActive) return;
      stopGithub = watchGithub();
      void primeGithub();
    });
    void primeAppInfo();
    void primeAgentConnection();
    /* Subscribed before the prime, never awaited: the connect grid paints nothing from it at arrival. */
    const unsubscribeSetup = subscribeToAgentSetup();
    void primeAgentSetup();
    const panelsReady = primePanels();
    /* `uiReady` sits behind the gate below, so a rejection here would strand the window unshown. */
    const gitStatusReady = primeGitStatus().catch(() => {});
    watchOpenWorktree(
      (listener) => useCanvasStore.subscribe((state) => listener(state.project?.path)),
      useCanvasStore.getState().project?.path,
    );

    // Per-read catches: an unanswered read strands the app in `pending`, the one state with no recovery.
    const auth = studio()
      .authState()
      .catch(() => ({ identity: null }));
    const onboarding = studio()
      .onboardingState()
      .catch(() => ({ hasOnboarded: false }));
    const location = studio()
      .locationState()
      .catch((): LaunchLocation => ({ kind: 'projects' }));
    /* A read as well as the subscription, so a reload lands on the phase the creation is in (ONL-2244). */
    const creating = studio()
      .tabCreateState()
      .catch((): ProjectCreateState | null => null);
    void Promise.all([auth, onboarding, location, creating]).then(
      async ([, onboardingState, launch, createState]) => {
        if (!isActive) return;

        const commitFirst = (next: Screen): void => {
          setScreen((current) => commitFirstScreen(current, next));
        };

        // No door of its own: a cloud build's sign-in is `AccessBoundary`, around every screen, and a build without one asks for nothing (ONL-2950).
        await settingsReady;
        if (!isActive) return;
        if (!onboardingState.hasOnboarded) {
          commitFirst({ kind: 'onboarding' });
          return;
        }

        /* Before the projects prime: a tab making a project does not wait on the list (ONL-2244). */
        const fromCreate = createState === null ? null : screenForCreate(createState);
        if (fromCreate !== null) {
          useProjectCreateStore.getState().set(createState);
          /* `useResizable` reads its default once at mount, so an editor committed before the widths prime is stranded at default widths. */
          await Promise.all([panelsReady, flagsReady]);
          if (!isActive) return;
          joinCreate();
          commitFirst(fromCreate);
          return;
        }

        await Promise.all([projectsReady, gitStatusReady, settingsReady, flagsReady]);
        if (!isActive) return;
        /* A reloaded tab keeps the project main still holds for it; landing on Projects would report it gone and empty the saved tabs (ONL-2593). */
        const held = BIRTH_PURPOSE === 'parked'
          ? undefined
          : heldProjectPath(BIRTH_PURPOSE, await studio().tabAssignment().catch((error: unknown) => { ignoreRefusal('tabs', 'tabAssignment')(error); return null; }));
        if (!isActive) return;
        if (held !== undefined) {
          const reopened = await prepareAssigned(held);
          if (!isActive) return;
          if (reopened !== 'failed' && reopened !== 'stale') {
            commitFirst(reopened);
            return;
          }
        }
        commitFirst(launch);
      },
    );
    const unsubscribeCreate = studio().onTabCreateState((state) => {
      useProjectCreateStore.getState().set(state);
      // `null` is a dismissed failure (ONL-2363): the record clears, the editor stays.
      if (state === null) return;
      const next = screenForCreate(state);
      /* Outside the updater, so StrictMode's second call cannot double it. */
      void followCreate(state).then((isCurrent) => {
        if (!isCurrent || next === null) return;
        setScreen((current) => applyCreateScreen(current, next));
      });
    });

    /* Idempotent: the pull covers a view minted before its listener exists, the push a spare promoted later (ONL-2318). */
    const applyAssignment = (assignment: TabAssignment): void => {
      if (assignment.tabId !== TAB_ID) return;
      if (assignment.purpose === 'projects') {
        setScreen((current) => (current.kind === 'parked' ? { kind: 'projects' } : current));
        return;
      }
      void openAssigned(assignment.workspacePath, assignment.restoring === true);
    };
    /* Registered synchronously: a tab mid-cut is assigned nothing (`assignment.ts`), and a listener attached after the read would miss its push. */
    const unsubscribeAssigned = studio().onTabAssigned(applyAssignment);
    if (BIRTH_PURPOSE === 'parked') {
      void Promise.all([studio().tabAssignment().catch(() => null), creating]).then(([assignment, createState]) => {
        if (!isActive) return;
        const taken = parkedAssignment(assignment, createState);
        if (taken !== null) applyAssignment(taken);
      });
    }

    // A sign-in that lands after the first screen still needs this Tab's panels primed for the account it belongs to.
    const unsubscribe = studio().onAuthChanged(() => {
      void primePanels();
    });
    return () => {
      isActive = false;
      unsubscribe();
      unsubscribeCreate();
      unsubscribeAssigned();
      unsubscribeSetup();
      stopGithub?.();
    };
  }, [openAssigned, prepareAssigned]);

  useEffect(
    () => registerRootActions({ kind: screen.kind, createBlank: createBlankFromProjects }),
    [screen.kind, createBlankFromProjects],
  );

  /** Not early returns, so `WindowFrame` wraps every branch once (ONL-1935). */
  function currentScreen(): React.JSX.Element {
    if (screen.kind === 'pending') {
      return <VStack width="100%" height="100%" style={{ background: 'var(--studio-ground)' }} />;
    }

    if (screen.kind === 'parked') {
      return <ParkedTab />;
    }

    if (needsConsent) return <ConsentGate />;

    if (screen.kind === 'onboarding') {
      return (
        <OnboardingFlow
          aside={<LoginAside />}
          onOpenExisting={(path) => {
            void prepareAssigned(path).then((next) => {
              if (next === 'stale' || next === 'failed') return;
              void studio().onboardingComplete({});
              setScreen(next);
            });
          }}
          onComplete={(plan, harness) => {
            void studio().onboardingComplete(harness ? { harness } : {});
            beginCreate();
            /* The editor screen is set here so the create's pushes find one to land on; the subscription never transitions over onboarding (ONL-2179). */
            studio().tabsCreateProject({ sourcePath: plan.sourcePath, entryPoint: 'onboarding' });
            void createPrimed().then((isCurrent) => {
              if (isCurrent) setScreen((current) => (current.kind === 'onboarding' ? { kind: 'editor' } : current));
            });
          }}
          onCreateBlank={(harness?: HarnessId) => {
            /* Only once the project lands: a cancel leaves the user here, and next launch should too. */
            startBlankCreate('onboarding', (workspace) => {
              void studio().onboardingComplete(harness ? { harness } : {});
              landBlank(workspace);
            });
          }}
        />
      );
    }

    if (screen.kind === 'projects') {
      return (
        <ProjectsScreen
          {...(screen.selectedWorkspaceId
            ? { initialWorkspaceId: screen.selectedWorkspaceId }
            : {})}
          onOpenProject={(workspace) => {
            setScreen({ kind: 'editor', restored: workspace });
          }}
          onCreateBlank={createBlankFromProjects}
        />
      );
    }

    return (
      <App
        {...(screen.restored ? { restoredWorkspace: screen.restored } : {})}
        {...(screen.creating ? { creating: screen.creating } : {})}
        onExitToProjects={exitToProjects}
      />
    );
  }

  const content = (
    <>
      {screen.kind === 'onboarding' || needsConsent ? <BlendedWindowBar /> : null}
      {currentScreen()}
      <ReadyToPresent screen={screen.kind} />
      {/* The create outlives the screen it was pushed from. */}
      <BlankCreateModal />
      {/* One mount for every surface and gate: the Help item is always enabled (ONL-2350). */}
      <ReportDialog />
      {/* Here, not in `App`: this returns the Projects Screen before `App` renders, so a mount there has no door on Projects. */}
      <SettingsDialog />
    </>
  );

  return (
    <WindowFrame>
      {AccessBoundary !== null && screen.kind !== 'parked'
        ? <ScreenLoadingBoundary hasProjectScaffold={BIRTH_PURPOSE === 'parked'}><AccessBoundary requiresSession={BIRTH_REQUIRES_SESSION}>{content}</AccessBoundary></ScreenLoadingBoundary>
        : content}
    </WindowFrame>
  );
}
