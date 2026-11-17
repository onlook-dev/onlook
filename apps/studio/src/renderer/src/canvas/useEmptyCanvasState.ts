import { useShallow } from 'zustand/react/shallow';
import { useAgentStore } from '../agent/store.js';
import { ownCreateState, useProjectCreateStore } from '../create/projectCreate.js';
import { useFlag } from '../flags/store.js';
import { isBlankWorkspace, useWorkspaceStore } from '../workspace/store.js';
import { emptyCanvasState, type EmptyCanvasState } from './emptyCanvasState.js';
import { useCanvasStore } from './store.js';

export function useEmptyCanvasState({ hasLiveServer, hasNodes }: { hasLiveServer: boolean; hasNodes: boolean }): EmptyCanvasState {
  const openWorkspace = useWorkspaceStore((state) => state.workspace);
  const needsAnswer = useAgentStore((state) => state.needsAnswer);
  const hasUserMessage = useAgentStore((state) => state.hasUserMessage);
  const heardCwd = useAgentStore((state) => state.heardCwd);
  const isBlankMomentOn = useFlag('blank-first-moment');
  const isDocumentKnown = useCanvasStore((state) => state.doc !== null);
  return useProjectCreateStore(useShallow((state) => emptyCanvasState(ownCreateState(state.state, openWorkspace), {
    hasLiveServer,
    needsAnswer,
    isBlankProject: isBlankWorkspace(openWorkspace),
    isBlankMomentOn,
    hasNodes,
    hasUserMessage,
    isDocumentKnown,
    isChatKnown: openWorkspace !== null && heardCwd === openWorkspace.workspacePath,
  })));
}
