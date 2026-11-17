import { randomUUID } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { artifactPageUrl, type ArtifactNode, type ArtifactTextPrepareRequest, type ArtifactTextPrepareResult, type ArtifactTextSaveRequest, type ArtifactTextSaveResult, type ArtifactTextTarget } from '@studio/events';
import type { ArtifactFileBundle, ArtifactStore } from './adapter.js';
import { validArtifactBundle } from './files.js';
import { artifactPrivacyIssues } from './privacy.js';
import { artifactRendererAdmitted } from './preview-admission.js';
import { artifactRenderQueue } from './render-queue.js';
import { mapArtifactText, replaceArtifactText, validArtifactText, type ArtifactTextMapping } from './text-source.js';
import { ARTIFACT_TEXT_WORLD, artifactTextDisposeScript, artifactTextPrepareScript, artifactTextValidateScript } from './text-guest.js';

type Guest = Pick<Electron.WebContents, 'id' | 'isDestroyed' | 'hostWebContents' | 'session' | 'getURL' | 'getType' | 'executeJavaScriptInIsolatedWorld'>;
type Event = {sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null};
export interface ArtifactTextNode { node: ArtifactNode; docId: string; updatedAt: string; pagePath: string }
interface Prepared {
  token: string;
  sender: Electron.WebContents;
  frame: Electron.WebFrameMain;
  scope: string;
  node: ArtifactTextNode;
  guest: Guest;
  url: string;
  revision: number;
  mapping?: ArtifactTextMapping;
  saving: boolean;
}

async function bounded<Result>(operation: Promise<Result>): Promise<Result> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('artifact text deadline')), 1000); })]);
  } finally { clearTimeout(timer); }
}

function requestValid(request: ArtifactTextPrepareRequest): boolean {
  return typeof request === 'object' && request !== null && typeof request.nodeId === 'string' && request.nodeId.length > 0 && request.nodeId.length <= 128 && typeof request.updatedAt === 'string' && request.updatedAt.length <= 100 && Number.isSafeInteger(request.guestId) && request.guestId > 0 && !!request.point && [request.point.x, request.point.y].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 32768);
}

function evidence(raw: unknown): (Omit<ArtifactTextTarget, 'token'> & {domPath: string}) | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const target = raw as Record<string, unknown>;
  if (typeof target.domPath !== 'string' || target.domPath.length > 2048 || !validArtifactText(target.text) || typeof target.rect !== 'object' || target.rect === null || typeof target.style !== 'object' || target.style === null) return undefined;
  const rect = target.rect as ArtifactTextTarget['rect'];
  if (![rect.x, rect.y, rect.width, rect.height].every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 32768) || rect.width <= 0 || rect.height <= 0) return undefined;
  const style = target.style as ArtifactTextTarget['style'];
  if (!(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'color', 'backgroundColor'] as const).every(key => typeof style[key] === 'string' && style[key].length <= 512)) return undefined;
  return {domPath: target.domPath, text: target.text, rect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height}, style: {fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textAlign: style.textAlign, color: style.color, backgroundColor: style.backgroundColor}};
}

export function createArtifactTextHandlers(deps: {
  renderers(): readonly Electron.WebContents[];
  scope(senderId: number): string | undefined;
  node(senderId: number, nodeId: string): Promise<ArtifactTextNode | undefined>;
  guest(id: number): Guest | undefined;
  boundGuest(sender: Electron.WebContents, node: ArtifactTextNode, url: string): {id: number} | undefined;
  session(): Electron.Session;
  revision(artifactId: string): number;
  store: Pick<ArtifactStore, 'read' | 'readFiles' | 'writeFiles'>;
  projectNames(senderId: number): readonly string[];
  changed(artifactId: string): void;
}) {
  const tokens = new Map<string, Prepared>();
  const preparing = new Set<number>();
  const retire = (target: Prepared): void => {
    tokens.delete(target.token);
    try {
      if (!target.guest.isDestroyed()) void bounded(target.guest.executeJavaScriptInIsolatedWorld(ARTIFACT_TEXT_WORLD, [{code: artifactTextDisposeScript(target.token)}])).catch(() => {});
    } catch {}
  };
  const prune = () => { for (const target of tokens.values()) if (target.sender.isDestroyed() || target.guest.isDestroyed()) retire(target); };
  const wanted = (event: Event, target: Prepared): boolean => artifactRendererAdmitted(event, deps.renderers()) && event.sender === target.sender && event.senderFrame === target.frame && deps.scope(event.sender.id) === target.scope && deps.revision(target.node.node.content.artifactId) === target.revision && deps.guest(target.guest.id) === target.guest && !target.guest.isDestroyed() && target.guest.getType() === 'webview' && target.guest.hostWebContents === event.sender && target.guest.session === deps.session() && target.guest.getURL() === target.url && deps.boundGuest(event.sender, target.node, target.url)?.id === target.guest.id;
  const current = async (event: Event, target: Prepared): Promise<boolean> => {
    if (!wanted(event, target)) return false;
    const node = await bounded(deps.node(event.sender.id, target.node.node.id));
    return wanted(event, target) && node !== undefined && node.docId === target.node.docId && node.node.pageId === target.node.node.pageId && node.updatedAt === target.node.updatedAt && node.pagePath === target.node.pagePath && JSON.stringify(node.node.content) === JSON.stringify(target.node.node.content);
  };
  const execute = (event: Event, target: Prepared, code: string) => bounded(artifactRenderQueue.run(() => wanted(event, target), () => bounded(target.guest.executeJavaScriptInIsolatedWorld(ARTIFACT_TEXT_WORLD, [{code}]))));
  const bundleSafe = (event: Event, bundle: ArtifactFileBundle): boolean => validArtifactBundle(bundle) && artifactPrivacyIssues(bundle, deps.projectNames(event.sender.id)).length === 0;
  const refusal = (code: string): 'stale' | 'readOnly' | 'unavailable' => code === 'stale' ? 'stale' : code === 'newerBuild' || code === 'multipleDocuments' ? 'readOnly' : 'unavailable';

  return {
    async prepare(event: Event, request: ArtifactTextPrepareRequest): Promise<ArtifactTextPrepareResult> {
      if (!artifactRendererAdmitted(event, deps.renderers()) || !requestValid(request) || preparing.has(event.sender.id)) return {outcome: 'unavailable'};
      prune();
      if (tokens.size >= 64) return {outcome: 'unavailable'};
      preparing.add(event.sender.id);
      let guestPreparation: Prepared | undefined;
      try {
        const scope = deps.scope(event.sender.id);
        const node = await bounded(deps.node(event.sender.id, request.nodeId));
        if (scope === undefined || deps.scope(event.sender.id) !== scope || !artifactRendererAdmitted(event, deps.renderers()) || !node) return {outcome: 'unavailable'};
        if (node.updatedAt !== request.updatedAt) return {outcome: 'stale'};
        const guest = deps.guest(request.guestId);
        if (!guest || !event.senderFrame) return {outcome: 'unavailable'};
        const token = randomUUID();
        const target: Prepared = {token, sender: event.sender, frame: event.senderFrame, scope, node, guest, url: new URL(artifactPageUrl(node.node.content.artifactId, node.pagePath)).href, revision: deps.revision(node.node.content.artifactId), saving: false};
        if (!await current(event, target) || !wanted(event, target)) return {outcome: 'stale'};
        const read = await bounded(deps.store.read(node.node.content.artifactId));
        if (!await current(event, target) || !wanted(event, target) || read.outcome !== 'resolved' || read.manifest.updatedAt !== node.updatedAt) return {outcome: 'stale'};
        if (read.readOnly) return {outcome: 'readOnly'};
        const bundle = await bounded(deps.store.readFiles(node.node.content.artifactId));
        if (!await current(event, target) || !wanted(event, target)) return {outcome: 'stale'};
        if ('code' in bundle) return {outcome: refusal(bundle.code)};
        if (!bundleSafe(event, bundle)) return {outcome: 'unsupported'};
        const file = bundle.files.find(file => file.path === node.pagePath);
        if (!file) return {outcome: 'unsupported'};
        if (!isUtf8(file.bytes)) return {outcome: 'unsupported'};
        const source = Buffer.from(file.bytes).toString('utf8');
        guestPreparation = target;
        const raw = await execute(event, target, artifactTextPrepareScript(request.point, token, Date.now() + 1000));
        if (!await current(event, target) || !wanted(event, target)) return {outcome: 'stale'};
        const selected = evidence(raw);
        if (!selected) return {outcome: 'unsupported'};
        target.mapping = mapArtifactText(source, selected.domPath, selected.text);
        if (!target.mapping) return {outcome: 'unsupported'};
        for (const oldTarget of tokens.values()) if (oldTarget.sender === event.sender && !oldTarget.saving) retire(oldTarget);
        tokens.set(token, target);
        return {outcome: 'editable', target: {token, text: selected.text, rect: selected.rect, style: selected.style}};
      } catch { return {outcome: 'unavailable'}; }
      finally {
        preparing.delete(event.sender.id);
        if (guestPreparation !== undefined && !tokens.has(guestPreparation.token)) retire(guestPreparation);
      }
    },

    async save(event: Event, request: ArtifactTextSaveRequest): Promise<ArtifactTextSaveResult> {
      if (!artifactRendererAdmitted(event, deps.renderers()) || !request || typeof request.token !== 'string' || request.token.length > 128) return {outcome: 'unavailable'};
      if (!validArtifactText(request.newText)) return {outcome: 'unsupported'};
      prune();
      const target = tokens.get(request.token);
      if (!target || target.sender !== event.sender || target.frame !== event.senderFrame) return {outcome: 'stale'};
      if (target.saving) return {outcome: 'unavailable'};
      target.saving = true;
      const stale = (): ArtifactTextSaveResult => { retire(target); return {outcome: 'stale'}; };
      try {
        if (!await current(event, target) || !wanted(event, target)) return stale();
        const id = target.node.node.content.artifactId;
        const read = await bounded(deps.store.read(id));
        if (!await current(event, target) || !wanted(event, target) || read.outcome !== 'resolved' || read.manifest.updatedAt !== target.node.updatedAt) return stale();
        if (read.readOnly) return {outcome: 'readOnly'};
        const bundle = await bounded(deps.store.readFiles(id));
        if (!await current(event, target) || !wanted(event, target)) return stale();
        if ('code' in bundle) return {outcome: refusal(bundle.code)};
        if (!bundleSafe(event, bundle) || !target.mapping) return {outcome: 'unsupported'};
        const file = bundle.files.find(file => file.path === target.node.pagePath);
        if (!file) return stale();
        if (!isUtf8(file.bytes)) return stale();
        const source = Buffer.from(file.bytes).toString('utf8');
        const mapped = mapArtifactText(source, target.mapping.domPath, target.mapping.text);
        if (!mapped || mapped.start !== target.mapping.start || mapped.end !== target.mapping.end || mapped.literal !== target.mapping.literal) return stale();
        const next = replaceArtifactText(source, mapped, request.newText);
        if (next === undefined) return {outcome: 'unsupported'};
        const updated = {...bundle, files: bundle.files.map(file => file.path === target.node.pagePath ? {...file, bytes: Buffer.from(next)} : file)};
        if (!bundleSafe(event, updated)) return {outcome: 'unsupported'};
        const valid = await execute(event, target, artifactTextValidateScript(target.token, Date.now() + 1000));
        if (!await current(event, target) || !wanted(event, target) || valid !== true) return stale();
        const written = await bounded(deps.store.writeFiles(id, updated, target.node.updatedAt));
        if ('code' in written) {
          if (written.code === 'stale') return stale();
          return {outcome: refusal(written.code)};
        }
        retire(target);
        deps.changed(id);
        return {outcome: 'saved'};
      } catch { return wanted(event, target) ? {outcome: 'unavailable'} : stale(); }
      finally { target.saving = false; }
    },
  };
}
