import { artifactPageUrl, type CanvasNode, type CanvasSnapshot, type ImageExportFormat } from '@studio/events';
import type { ImageExportTarget } from './image-export.js';

type Event = { sender: Electron.WebContents };
type Guest = Pick<Electron.WebContents, 'id' | 'isDestroyed' | 'getType' | 'hostWebContents' | 'session' | 'getURL'>;

export function createImageTargetResolver<ExportEvent extends Event>(deps: {
  admitted(event: ExportEvent): boolean;
  workspace(senderId: number): string | undefined;
  snapshot(cwd: string): Promise<CanvasSnapshot>;
  boundGuest(sender: Electron.WebContents, docId: string, node: CanvasNode, artifactUrl?: string): Guest | undefined;
  session(kind: 'artifact' | 'browser'): Electron.Session;
  artifact(id: string, pagePath?: string): Promise<{ title: string; revision: number; pagePath: string } | undefined>;
  revision(id: string): number;
  navigation(guest: Guest, changed: () => void): () => void;
  capture(guest: Guest, width: number, height: number, format: ImageExportFormat): Promise<Uint8Array>;
}) {
  return async (event: ExportEvent, nodeId: string): Promise<ImageExportTarget | undefined> => {
    if (!deps.admitted(event)) return undefined;
    const cwd = deps.workspace(event.sender.id);
    if (cwd === undefined) return undefined;
    const snapshot = await deps.snapshot(cwd);
    const node = snapshot.doc?.nodes[nodeId];
    if (!node || (node.kind !== 'browser' && node.kind !== 'artifact') || !snapshot.doc) return undefined;
    const docId = snapshot.doc.docId;
    const artifact = node.kind === 'artifact' ? await deps.artifact(node.content.artifactId, node.content.pagePath) : undefined;
    const pageUrl = node.kind === 'artifact' && artifact ? artifactPageUrl(node.content.artifactId, artifact.pagePath) : undefined;
    if (node.kind === 'artifact' && pageUrl === undefined) return undefined;
    const guest = deps.boundGuest(event.sender, docId, node, pageUrl);
    if (!guest || guest.isDestroyed()) return undefined;
    const url = guest.getURL();
    if (node.kind === 'artifact' && url !== pageUrl) return undefined;
    const identity = JSON.stringify(node);
    let navigated = false;
    const dispose = deps.navigation(guest, () => { navigated = true; });
    const valid = (): boolean => !navigated && deps.admitted(event) && deps.workspace(event.sender.id) === cwd && !guest.isDestroyed() && guest.getType() === 'webview' && guest.hostWebContents === event.sender && guest.session === deps.session(node.kind) && guest.getURL() === url && (node.kind !== 'artifact' || deps.revision(node.content.artifactId) === artifact?.revision);
    return {
      title: artifact?.title ?? node.name,
      width: node.width,
      height: node.height,
      current: async () => {
        if (!valid()) return false;
        const latestArtifact = node.kind === 'artifact' ? await deps.artifact(node.content.artifactId, node.content.pagePath) : undefined;
        const latest = await deps.snapshot(cwd);
        return valid() && latest.doc?.docId === docId && JSON.stringify(latest.doc.nodes[nodeId]) === identity && deps.boundGuest(event.sender, docId, node, pageUrl) === guest && (node.kind !== 'artifact' || latestArtifact?.pagePath === artifact?.pagePath);
      },
      capture: format => deps.capture(guest, node.width, node.height, format),
      dispose,
    };
  };
}
