import type { CanvasNode, CanvasSnapshot } from '@studio/events';

export function createFrameAttachHandler<Event extends { sender: Electron.WebContents }>(deps: {
  admitted(event: Event): boolean;
  workspace(senderId: number): string | undefined;
  snapshot(cwd: string): Promise<CanvasSnapshot>;
  artifactUrl(node: Extract<CanvasNode, { kind: 'artifact' }>): Promise<string | undefined>;
  browserUrl?(sender: Electron.WebContents, docId: string, node: CanvasNode): string | undefined;
  issue(sender: Electron.WebContents, docId: string, node: CanvasNode, url: string): string | undefined;
}) {
  return async (event: Event, request: { nodeId: string }): Promise<{ url: string } | null> => {
    if (!deps.admitted(event) || !request || typeof request.nodeId !== 'string' || request.nodeId.length > 128) return null;
    const cwd = deps.workspace(event.sender.id);
    if (cwd === undefined) return null;
    const snapshot = await deps.snapshot(cwd);
    const node = snapshot.doc?.nodes[request.nodeId];
    if (!snapshot.doc || !node || (node.kind !== 'browser' && node.kind !== 'artifact')) return null;
    const url = node.kind === 'artifact' ? await deps.artifactUrl(node) : deps.browserUrl?.(event.sender, snapshot.doc.docId, node) ?? node.content.homeUrl;
    if (!url || !deps.admitted(event) || deps.workspace(event.sender.id) !== cwd) return null;
    const latest = await deps.snapshot(cwd);
    if (latest.doc?.docId !== snapshot.doc.docId || JSON.stringify(latest.doc.nodes[node.id]) !== JSON.stringify(node) || !deps.admitted(event) || deps.workspace(event.sender.id) !== cwd) return null;
    const attachUrl = deps.issue(event.sender, snapshot.doc.docId, node, url);
    return attachUrl === undefined ? null : { url: attachUrl };
  };
}
