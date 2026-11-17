import type { BrowserNode, CanvasSnapshot, FrameDestinationReadiness } from '@studio/events';

export function createFrameReadyHandler<Event extends { sender: Electron.WebContents }>(deps: {
  admitted(event: Event): boolean;
  workspace(senderId: number): string | undefined;
  snapshot(cwd: string): Promise<CanvasSnapshot>;
  readiness(sender: Electron.WebContents, docId: string, node: BrowserNode, webContentsId: number): FrameDestinationReadiness;
}) {
  return async (event: Event, request: { nodeId: string; webContentsId: number }): Promise<FrameDestinationReadiness> => {
    if (!deps.admitted(event) || !request || typeof request.nodeId !== 'string' || request.nodeId.length > 128 || !Number.isSafeInteger(request.webContentsId) || request.webContentsId <= 0) return 'pending';
    const cwd = deps.workspace(event.sender.id);
    if (cwd === undefined) return 'pending';
    const snapshot = await deps.snapshot(cwd);
    const node = snapshot.doc?.nodes[request.nodeId];
    if (!snapshot.doc || node?.kind !== 'browser' || !deps.admitted(event) || deps.workspace(event.sender.id) !== cwd) return 'pending';
    return deps.readiness(event.sender, snapshot.doc.docId, node, request.webContentsId);
  };
}
