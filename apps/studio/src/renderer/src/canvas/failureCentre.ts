import { create } from 'zustand';
import { isSameSetupFailure, projectSetupAskKind, setupRepairStep, type ImportSetupProgress, type ProjectSetupAskResult, type ProjectSetupFailure, type ProjectSetupSnapshot, type StudioBridge } from '@studio/events';
import { studio } from '../bridge.js';

export type SetupFailureCard = { step: 'install' | 'start'; cause: 'install' | 'start' | 'ready' };

export type CanvasCentre = { kind: 'card'; card: SetupFailureCard } | { kind: 'clear' } | { kind: 'illustration' };

export interface CanvasCentreFacts {
  progress: ImportSetupProgress | null;
  snapshot: ProjectSetupSnapshot | null;
  /** The Project Chat's last turn ended in the agent's own error: its notices, not the card, say what to do. */
  agentFailed: boolean;
  hasNodes: boolean;
  isCreateFailed: boolean;
  /** `rail-foot`: off, nothing else says where a rerun stands, so the centre keeps its illustration. */
  isFootOn: boolean;
}

/** Only a failure the setup machine names, since the card's ask is the machine's repair ask (ONL-2961). */
export function setupFailureCard({ progress, snapshot, agentFailed, hasNodes }: Omit<CanvasCentreFacts, 'isCreateFailed' | 'isFootOn'>, location: 'canvas' | 'chat' = 'canvas'): SetupFailureCard | null {
  if ((hasNodes && location === 'canvas') || agentFailed || progress?.state !== 'failed') return null;
  const stage = progress.failure.stage;
  if (stage === undefined || snapshot === null || projectSetupAskKind(snapshot) !== 'repair') return null;
  const step = setupRepairStep({ stage });
  return { step, cause: stage === 'ready' ? 'ready' : step };
}

/** A failed import being repaired leaves the centre empty: the Left Rail's foot says where setup is. */
export function canvasCentre(facts: CanvasCentreFacts): CanvasCentre {
  const card = setupFailureCard(facts);
  if (card !== null) return { kind: 'card', card };
  if (facts.isFootOn && !facts.hasNodes && facts.isCreateFailed && facts.progress?.state === 'running') return { kind: 'clear' };
  return { kind: 'illustration' };
}

type CardAsk = { state: 'idle' } | { state: 'sending' | 'sent'; workspacePath: string; failure: ProjectSetupFailure | null };

export const useSetupFailureCardStore = create<{ ask: CardAsk }>()(() => ({ ask: { state: 'idle' } }));

export interface CardAwayFacts {
  ask: CardAsk;
  workspacePath: string | undefined;
  isStreaming: boolean;
  /** The failure the transcript's latest repair ask carries; the tap's own record covers the moment before that row lands. */
  asked: ProjectSetupFailure | null;
  failure: ProjectSetupFailure | null;
}

/** Once asked, the card stays away until the failure itself changes, such as a rerun failing again (ONL-2961). */
export function isSetupFailureCardShown({ ask, workspacePath, isStreaming, asked, failure }: CardAwayFacts): boolean {
  if (isStreaming) return false;
  if (asked !== null && isSameSetupFailure(asked, failure)) return false;
  if (ask.state === 'idle' || ask.workspacePath !== workspacePath) return true;
  return ask.state === 'sent' && !isSameSetupFailure(ask.failure, failure);
}

export async function askFromSetupFailureCard(
  workspacePath: string,
  failure: ProjectSetupFailure | null,
  bridge: Pick<StudioBridge, 'projectSetupAsk'> = studio(),
): Promise<ProjectSetupAskResult> {
  const store = useSetupFailureCardStore;
  if (store.getState().ask.state === 'sending') return { ok: false, reason: 'busy' };
  store.setState({ ask: { state: 'sending', workspacePath, failure } });
  let result: ProjectSetupAskResult;
  try {
    result = await bridge.projectSetupAsk();
  } catch {
    result = { ok: false, reason: 'unavailable' };
  }
  const now = store.getState().ask;
  if (now.state !== 'sending' || now.workspacePath !== workspacePath) return result;
  store.setState({ ask: result.ok ? { state: 'sent', workspacePath, failure } : { state: 'idle' } });
  return result;
}
