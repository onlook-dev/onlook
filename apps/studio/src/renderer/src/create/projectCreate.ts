import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { creationWorkspace, type CopyFailure, type ProjectCreatePhase, type ProjectCreateState, type ProjectSetupFailure, type SetupRepairStep, type WorkspaceCreated } from '@studio/events';
import type { StringKey } from '@studio/i18n';
import { useWorkspaceStore } from '../workspace/store.js';
import { PhasePainter } from './phasePainter.js';

export interface CreateLanding {
  record: ProjectCreateState;
  failure: ProjectSetupFailure | null;
}

interface ProjectCreateStore {
  state: ProjectCreateState | null;
  /** When this tab first saw the current copy; held from planning through copying, cleared by any other record. */
  copyStartedAt?: number;
  /** The record whose app this tab saw live on its canvas, and the setup failure standing then; a newer record never matches it. */
  landing?: CreateLanding;
  set: (state: ProjectCreateState | null, now?: number) => void;
  noteLanding: (record: ProjectCreateState, failure: ProjectSetupFailure | null) => void;
}

const isCopyPhase = (state: ProjectCreateState | null): boolean => state?.kind === 'planning' || state?.kind === 'copying';

function nextCopyStart(since: number | undefined, copying: boolean, now: number): number | undefined {
  if (!copying) return undefined;
  return since ?? now;
}

export const useProjectCreateStore = create<ProjectCreateStore>()((set) => ({
  state: null,
  set: (state, now = Date.now()) => {
    set((prev) => ({ state, copyStartedAt: nextCopyStart(prev.copyStartedAt, isCopyPhase(state), now) }));
  },
  noteLanding: (record, failure) => {
    set({ landing: { record, failure } });
  },
}));

const PHASE_PAINT_DELAY_MS = 300;

/** A tab's creation record outlives its landing, so with another Project open it is none of this one's (ONL-2960). */
export function ownCreateState(create: ProjectCreateState | null, open: WorkspaceCreated | null): ProjectCreateState | null {
  const created = create === null ? undefined : creationWorkspace(create);
  return open !== null && created !== undefined && created.workspacePath !== open.workspacePath ? null : create;
}

/** Delayed for painting only; anything gating on the creation existing reads the store. */
export function usePaintedCreateState(): ProjectCreateState | null {
  const open = useWorkspaceStore((store) => store.workspace);
  const state = ownCreateState(useProjectCreateStore((store) => store.state), open);
  const [painted, setPainted] = useState<ProjectCreateState | null>(null);
  useEffect(() => {
    const painter = new PhasePainter<ProjectCreateState>(PHASE_PAINT_DELAY_MS, setPainted);
    painter.observe(state);
    return () => painter.dispose();
  }, [state]);
  return painted;
}

const PROGRESS_LINE_KEY = {
  planning: 'project.create.planning',
  copying: 'project.create.copying',
  installing: 'project.create.installingPackages',
  starting: 'project.create.starting',
} as const satisfies Record<ProjectCreatePhase, StringKey>;

const FAILED_LINE_KEY = {
  planning: 'project.create.failed.planning',
  copying: 'project.create.failed.copying',
  installing: 'project.create.failed.installing',
  starting: 'project.create.failed.starting',
} as const satisfies Record<ProjectCreatePhase, StringKey>;

const NEXT_ACTION_KEY = {
  planning: 'project.create.next.planning',
  copying: 'project.create.next.copying',
  installing: 'project.create.next.installing',
  starting: 'project.create.next.starting',
} as const satisfies Record<ProjectCreatePhase, StringKey>;

/** What a copy failure tells the person, and the one way out it leaves them: the same work again, or the picker. */
const COPY_FAILURE = {
  ignored_files: { actionKey: 'project.create.copy.ignored_files', wayOut: 'choose-folder' },
  permission_denied: { actionKey: 'project.create.copy.permission_denied', wayOut: 'choose-folder' },
  folder_unavailable: { actionKey: 'project.create.copy.folder_unavailable', wayOut: 'choose-folder' },
  copy_in_progress: { actionKey: 'project.create.copy.copy_in_progress', wayOut: 'choose-folder' },
  disk_full: { actionKey: 'project.create.copy.disk_full', wayOut: 'choose-folder' },
  git_failed: { actionKey: 'project.create.copy.git_failed', wayOut: 'choose-folder' },
  git_timed_out: { actionKey: 'project.create.copy.git_timed_out', wayOut: 'retry' },
  unknown: { actionKey: 'project.create.next.copying', wayOut: 'retry' },
} as const satisfies Record<CopyFailure['cause'], { actionKey: StringKey; wayOut: 'retry' | 'choose-folder' }>;

export type SetupNarration =
  | { kind: 'progress'; phase: ProjectCreatePhase; lineKey: StringKey; repo: string }
  | {
      kind: 'failed';
      phase: ProjectCreatePhase;
      lineKey: StringKey;
      nextActionKey: StringKey;
      repo: string;
      detail?: string;
      /** The row offers Dismiss (ONL-2363) only once a project exists behind it — forgetting a pre-landing failure leaves the editor with no project. */
      canDismiss: boolean;
      /** Retry only where repeating the same work can succeed; a copy the folder itself stopped sends the person back to the picker (ONL-3285). */
      wayOut: 'retry' | 'choose-folder';
    };

export interface SetupNarrationFacts {
  hasLiveServer: boolean;
  /** The agent's setup checklist stands in for the progress line; a failure keeps its row and Retry (ONL-2913). */
  hasSetupCard?: boolean;
  /** The canvas card tells this failure, shown or already asked about, so the chat does not tell it twice (ONL-2961). */
  isFailureCardHeld?: boolean;
  /** The step the setup machine says failed; the create phase calls an install failure inside the agent's turn `starting`. */
  failedStep?: SetupRepairStep;
}

const STEP_FAILED_LINE_KEY = {
  install: 'project.create.failed.installingPackages',
  start: 'project.create.failed.starting',
} as const satisfies Record<SetupRepairStep, StringKey>;

const STEP_NEXT_ACTION_KEY = {
  install: 'project.create.next.installing',
  start: 'project.create.next.starting',
} as const satisfies Record<SetupRepairStep, StringKey>;

function failedStepOf(phase: ProjectCreatePhase, facts: SetupNarrationFacts): SetupRepairStep | undefined {
  if (phase !== 'installing' && phase !== 'starting') return undefined;
  return facts.failedStep ?? (phase === 'installing' ? 'install' : 'start');
}

/** The ended setup row's line once setup failed: the failed step's own line, never "Set up" (ONL-2961). */
export function failedSetupLineKey(state: ProjectCreateState | null, facts: SetupNarrationFacts): StringKey | undefined {
  if (state?.kind !== 'failed') return undefined;
  const step = failedStepOf(state.phase, facts);
  return step === undefined ? undefined : STEP_FAILED_LINE_KEY[step];
}

export function narrationFor(state: ProjectCreateState | null, facts: SetupNarrationFacts): SetupNarration | null {
  if (state === null) return null;
  switch (state.kind) {
    case 'planning':
    case 'copying':
      return { kind: 'progress', phase: state.kind, lineKey: state.duplicateSourceName === undefined ? PROGRESS_LINE_KEY[state.kind] : 'project.create.copying', repo: state.duplicateSourceName ?? state.sourceRepoName };
    case 'installing':
    case 'starting':
      if (facts.hasSetupCard === true) return null;
      return { kind: 'progress', phase: state.kind, lineKey: PROGRESS_LINE_KEY[state.kind], repo: state.workspace.sourceRepoName };
    case 'failed': {
      // A pre-landing failure has no project, so a live entry in this tab's book is the outgoing project's.
      if (facts.hasLiveServer && state.workspace !== undefined) return null;
      if (facts.isFailureCardHeld === true) return null;
      const step = failedStepOf(state.phase, facts);
      const copy = state.copyFailure === undefined ? undefined : COPY_FAILURE[state.copyFailure.cause];
      return {
        kind: 'failed',
        phase: state.phase,
        lineKey: step === undefined ? FAILED_LINE_KEY[state.phase] : STEP_FAILED_LINE_KEY[step],
        nextActionKey: copy?.actionKey ?? (step === undefined ? NEXT_ACTION_KEY[state.phase] : STEP_NEXT_ACTION_KEY[step]),
        wayOut: copy?.wayOut ?? 'retry',
        repo: state.workspace?.sourceRepoName ?? state.sourceRepoName,
        canDismiss: state.workspace !== undefined,
        ...(state.detail === undefined ? {} : { detail: state.detail }),
      };
    }
    default:
      return null;
  }
}

export function runControlPhase(state: ProjectCreateState | null): 'installing' | 'starting' | null {
  if (state === null) return null;
  return state.kind === 'installing' || state.kind === 'starting' ? state.kind : null;
}
