import { createContext, use } from 'react';
import type { CreationEntryPoint } from '@studio/events';

export interface ConnectFlow {
  /** @parked ONL-2112 */
  start: (planned: { entryPoint: CreationEntryPoint }) => void;
  /** @parked ONL-2179 */
  openSwitcher: () => void;
}

export const ConnectFlowContext = createContext<ConnectFlow | null>(null);

/** @parked ONL-2112 */
export function useConnectFlow(): ConnectFlow {
  const flow = use(ConnectFlowContext);
  if (!flow) throw new Error('useConnectFlow used outside <ConnectFlowProvider>');
  return flow;
}
