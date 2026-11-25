import { useAgentStore } from '../agent/store.js';
import { useImportSetupProgress, useSetupTurnStore } from '../create/setupProgress.js';
import { selectProjectSetupSnapshot, useProjectSetupStore } from '../project-setup/store.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { isSetupFailureCardShown, setupFailureCard, useSetupFailureCardStore, type SetupFailureCard } from './failureCentre.js';
import { useCanvasStore } from './store.js';

/** `card` is whether the failure is the card's to tell, shown or asked about; the chat's own failure line yields to it either way (ONL-2961). */
export function useSetupFailure() {
  const progress = useImportSetupProgress();
  const snapshot = useProjectSetupStore(selectProjectSetupSnapshot);
  const agentFailed = useSetupTurnStore((state) => state.agentFailed);
  const asked = useSetupTurnStore((state) => state.askedFailure);
  const hasNodes = useCanvasStore((state) => state.nodes.length > 0);
  const workspacePath = useWorkspaceStore((state) => state.workspace?.workspacePath);
  const ask = useSetupFailureCardStore((state) => state.ask);
  const isStreaming = useAgentStore((state) => state.isStreaming);
  const facts = { progress, snapshot, agentFailed, hasNodes };
  const card = setupFailureCard(facts, 'chat');
  const isShown = card !== null && isSetupFailureCardShown({ ask, workspacePath, isStreaming, asked, failure: snapshot?.failure ?? null });
  return { card, isShown, canvasCard: setupFailureCard(facts), workspacePath, failure: snapshot?.failure ?? null };
}

export function useSetupFailureCard(): { card: SetupFailureCard | null; isShown: boolean } {
  const { canvasCard: card, isShown } = useSetupFailure();
  return { card, isShown: card !== null && isShown };
}
