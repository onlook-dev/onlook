import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { importSetupSteps, type ImportSetupFacts, type ImportSetupProgress, type ProjectCreateState, type ProjectSetupFailure, type SetupCanvas, type SetupStepsView, type WorkspaceCreated } from '@studio/events';

import { liveFramePorts } from '../canvas/model.js';
import { useCanvasStore } from '../canvas/store.js';

import { selectProjectSetupSnapshot, useProjectSetupStore } from '../project-setup/store.js';
import { isBlankWorkspace, useWorkspaceStore } from '../workspace/store.js';
import { ownCreateState, useProjectCreateStore, usePaintedCreateState, type CreateLanding } from './projectCreate.js';

/** Written by the chat, which alone holds the session's log (`agent/store.ts`). */
export const useSetupTurnStore = create<{ turn: SetupStepsView | undefined; agentFailed: boolean; askedFailure: ProjectSetupFailure | null }>()(() => ({ turn: undefined, agentFailed: false, askedFailure: null }));

export function publishSetupTurn(turn: SetupStepsView | undefined, agentFailed = false, askedFailure: ProjectSetupFailure | null = null): void {
  useSetupTurnStore.setState({ turn, agentFailed, askedFailure });
}

export function landingFacts(landing: CreateLanding | undefined, create: ProjectCreateState | null): Pick<ImportSetupFacts, 'landing'> {
  return create !== null && landing?.record === create ? { landing: { failure: landing.failure } } : {};
}

/** The chat's canvas: none once the import landed, and the latest card waits with an import still waiting on its Frame. */
export function useSetupCanvas(): SetupCanvas | undefined {
  const ports = useCanvasStore(useShallow((state) => liveFramePorts(state.nodes)));
  const open = useWorkspaceStore((state) => state.workspace);
  const create = ownCreateState(useProjectCreateStore((state) => state.state), open);
  const landed = useProjectCreateStore((state) => create !== null && state.landing?.record === create);
  const waits = create?.kind === 'starting' || create?.kind === 'live' || create?.kind === 'failed';
  return useMemo(() => {
    if (landed) return undefined;
    return waits ? { liveFramePorts: ports, latestWaits: true } : { liveFramePorts: ports };
  }, [ports, landed, waits]);
}

/** Remembers the moment this tab's import first reads up, so a later reload of its Frame does not take it back (ONL-2961). */
export function connectSetupLanding(): () => void {
  const check = (): void => {
    const { state: create, landing, noteLanding } = useProjectCreateStore.getState();
    if (create === null || (create.kind !== 'live' && create.kind !== 'failed') || landing?.record === create) return;
    const open = useWorkspaceStore.getState().workspace;
    const snapshot = selectProjectSetupSnapshot(useProjectSetupStore.getState());
    const canvas = { liveFramePorts: liveFramePorts(useCanvasStore.getState().nodes) };
    if (projectSetupProgress(open, { create, snapshot, canvas })?.state === 'up') noteLanding(create, snapshot?.failure ?? null);
  };
  const stops = [useProjectCreateStore, useCanvasStore, useProjectSetupStore, useWorkspaceStore].map((store) => store.subscribe(check));
  check();
  return () => {
    for (const stop of stops) stop();
  };
}

/** A blank draft's server is Studio's own and never shows as setup (ONL-2960). */
export function projectSetupProgress(open: WorkspaceCreated | null, facts: ImportSetupFacts): ImportSetupProgress | null {
  if (isBlankWorkspace(open)) return null;
  return importSetupSteps({ ...facts, create: ownCreateState(facts.create, open) });
}

export function useImportSetupProgress(): ImportSetupProgress | null {
  const open = useWorkspaceStore((state) => state.workspace);
  const create = usePaintedCreateState();
  const turn = useSetupTurnStore((state) => state.turn);
  const snapshot = useProjectSetupStore(selectProjectSetupSnapshot);
  const ports = useCanvasStore(useShallow((state) => liveFramePorts(state.nodes)));
  const canvas = useMemo(() => ({ liveFramePorts: ports }), [ports]);
  const landing = useProjectCreateStore((state) => state.landing);
  return projectSetupProgress(open, { create, snapshot, canvas, ...landingFacts(landing, create), ...(turn === undefined ? {} : { turn }) });
}
