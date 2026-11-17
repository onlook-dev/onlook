import { handle } from '../ipc/bridge.js';
import { IPC_EMIT, IPC_INVOKE, type PanelsState } from '@studio/events';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { readPanels, writePanels } from './state.js';

export function registerPanelsHandlers(): void {
  handle(IPC_INVOKE.panelsState, (): PanelsState => readPanels());
  handle(IPC_INVOKE.panelsSave, (event, req: Partial<PanelsState>) => {
    writePanels(req);
    // Not back to the sender: its drag may have moved on since this save left (ONL-2593).
    broadcastToRenderers(IPC_EMIT.panelsChanged, readPanels(), event.sender);
  });
}
