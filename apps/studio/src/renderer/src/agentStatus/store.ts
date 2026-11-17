import { create } from 'zustand';
import { agentStatusReducer, INITIAL_AGENT_STATUS, type AgentStatusAction, type AgentStatusState, type StatusWaiting } from './lines.js';

interface AgentStatusStore {
  status: AgentStatusState;
  waiting: StatusWaiting | undefined;
}

export const useAgentStatusStore = create<AgentStatusStore>()(() => ({ status: INITIAL_AGENT_STATUS, waiting: undefined }));

export function dispatchAgentStatus(action: AgentStatusAction): void {
  const before = useAgentStatusStore.getState().status;
  const after = agentStatusReducer(before, action);
  if (after !== before) useAgentStatusStore.setState({ status: after });
}

/** An answered question takes the agent's words for it along. */
export function setStatusWaiting(waiting: StatusWaiting | undefined): void {
  const before = useAgentStatusStore.getState().waiting;
  if (before === waiting) return;
  useAgentStatusStore.setState({ waiting });
  if (before === 'question' && waiting !== 'question') dispatchAgentStatus({ type: 'waitingOn', what: undefined });
}
