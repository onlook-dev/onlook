import { createHash } from 'node:crypto';
import { artifactPageUrl, parseElementEvidence, type ArtifactPickRequest, type ArtifactPickResult, type CanvasNode } from '@studio/events';
import { artifactRendererAdmitted } from './preview-admission.js';
import { artifactRenderQueue } from './render-queue.js';

type Guest = Pick<Electron.WebContents, 'id' | 'isDestroyed' | 'hostWebContents' | 'session' | 'getURL' | 'getType' | 'executeJavaScriptInIsolatedWorld'>;
type Event = { sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null };

export function artifactPointScript(point: { x: number; y: number }): string {
  return `(() => {
    const point = ${JSON.stringify(point)};
    if (point.x < 0 || point.y < 0 || point.x >= innerWidth || point.y >= innerHeight) return null;
    const element = document.elementFromPoint(point.x, point.y);
    if (!element || ['html','body','script','style'].includes(element.tagName.toLowerCase())) return null;
    const segments = [];
    let visited = 0;
    for (let current = element; current; current = current.parentElement) {
      if (segments.length >= 64) return null;
      const tag = current.tagName.toLowerCase();
      let position = 1;
      for (let sibling = current.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
        if (++visited > 10000) return null;
        if (sibling.tagName === current.tagName) position += 1;
      }
      segments.unshift(tag + ':nth-of-type(' + position + ')');
    }
    const bounds = element.getBoundingClientRect();
    const tag = element.tagName.toLowerCase();
    return { tag, domPath: segments.join('>'), classes: Array.from(element.classList).slice(0,32).map(value => value.slice(0,128)), textContent: ['input','textarea','select'].includes(tag) ? '[redacted]' : (element.textContent || '').slice(0,512), rect: {x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height} };
  })()`;
}

export function createArtifactPickHandler(deps: {
  renderers(): readonly Electron.WebContents[];
  node(senderId: number, nodeId: string): Promise<(CanvasNode & { artifactUpdatedAt: string }) | undefined>;
  guest(id: number): Guest | undefined;
  session(): Electron.Session;
  revision(artifactId: string): number;
}) {
  return async (event: Event, request: ArtifactPickRequest): Promise<ArtifactPickResult> => {
    const admitted = () => artifactRendererAdmitted(event, deps.renderers());
    if (!admitted() || typeof request !== 'object' || request === null || typeof request.nodeId !== 'string' || request.nodeId.length > 128 || typeof request.updatedAt !== 'string' || request.updatedAt.length > 100 || !Number.isSafeInteger(request.guestId) || request.guestId < 1 || !request.point || ![request.point.x, request.point.y].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 32768)) return { outcome: 'unavailable' };
    const node = await deps.node(event.sender.id, request.nodeId);
    if (!node || node.kind !== 'artifact' || typeof node.content.pagePath !== 'string' || request.updatedAt !== node.artifactUpdatedAt) return { outcome: 'unavailable' };
    const url = new URL(artifactPageUrl(node.content.artifactId, node.content.pagePath)).href;
    const guest = deps.guest(request.guestId);
    const revision = deps.revision(node.content.artifactId);
    const wanted = () => admitted() && deps.revision(node.content.artifactId) === revision && guest !== undefined && !guest.isDestroyed() && guest.getType() === 'webview' && guest.hostWebContents === event.sender && guest.session === deps.session() && guest.getURL() === url;
    if (!wanted() || !guest) return { outcome: 'unavailable' };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await artifactRenderQueue.run(wanted, () => Promise.race([
        guest.executeJavaScriptInIsolatedWorld(999, [{ code: artifactPointScript(request.point) }]),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('artifact pick deadline')), 1000); }),
      ]));
      if (!wanted()) return { outcome: 'unavailable' };
      const still = await deps.node(event.sender.id, request.nodeId);
      if (!wanted() || !still || still.kind !== 'artifact' || still.artifactUpdatedAt !== node.artifactUpdatedAt || still.content.artifactId !== node.content.artifactId || still.content.pagePath !== node.content.pagePath) return { outcome: 'unavailable' };
      if (raw === null) return { outcome: 'none' };
      if (typeof raw !== 'object' || !raw || typeof raw.domPath !== 'string' || raw.domPath.length > 2048 || typeof raw.tag !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(raw.tag) || typeof raw.rect !== 'object' || !raw.rect) return { outcome: 'unavailable' };
      const { x, y, width, height } = raw.rect;
      if (![x,y,width,height].every((value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 32768) || width <= 0 || height <= 0) return { outcome: 'unavailable' };
      const evidence = parseElementEvidence({ kind: 'element', id: `artifact:${guest.id}:${createHash('sha256').update(raw.domPath).digest('hex').slice(0,24)}`, tag: raw.tag, domPath: raw.domPath, classes: raw.classes, textContent: raw.textContent, outerHtmlSnippet: `<${raw.tag}>`, frameUrl: url });
      return evidence ? { outcome: 'selected', evidence, rect: {x,y,width,height} } : { outcome: 'unavailable' };
    } catch { return { outcome: 'unavailable' }; }
    finally { clearTimeout(timer); }
  };
}
