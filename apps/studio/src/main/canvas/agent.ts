import { readFileSync, statSync } from 'node:fs';
import { basename, isAbsolute, resolve as resolvePath } from 'node:path';
import { performance } from 'node:perf_hooks';
import { artifactStore } from '../artifacts/instance.js';
import {
  IMAGE_MAX_BYTES,
  canvasPages,
  isBrowserNode,
  isDividerPage,
  nodesOnPage,
  resolveNodePageId,
  type CanvasDoc,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasOp,
  type CanvasPageId,
  type CanvasTextSize,
  type EvaluateResult,
  type FrameCaptureResult,
  type FrameConsoleLine,
  type FrameHealth,
  type ImageRejectReason,
  type MirroredFrame,
  type PlacementSide,
  type RegisterImageResult,
  type ServerPortMeasurement,
  intersects,
  localPort,
  frameLinkMarkdown,
} from '@studio/events';
import { registerImage, settlePending } from '../images/store.js';
import { serverBookEntries } from '../server/book.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import type { RevealFacts } from './capture-view.js';
import { captureFrame, clipFrame, evaluateInFrame, readFrame, type OffPage } from './gate.js';
import { frameCaptureFailureReason, measureFrameCapture } from './capture-metrics.js';
import type { ClipTarget, FramePicture, FramePictures, PictureMiss, PictureTarget } from './clip.js';
import { FrameRefBook, frameReadText, type FrameReadScope } from './frame-read.js';
import {
  createFramePlacement,
  duplicateFramesPlacements,
  moveFramePlacement,
  moveFramesPlacements,
  resolveCreateFrameOps,
  resolveCreateArtifactOps,
  type CreateArtifactNodeRequest,
  resolveCreateImageOps,
  resolveCreatePageOps,
  resolveCreateTextOps,
  resolveDeletePageOps,
  resolveDuplicateFramesOps,
  resolveFrameUrlOps,
  resolveMoveFrameOps,
  resolveMoveFramesOps,
  resolveMoveNodesToPageOps,
  resolveRemoveFrameOps,
  resolveRemoveFramesOps,
  resolveRenameFrameOps,
  resolveRenamePageOps,
  resolveReorderFrameOps,
  resolveReorderPageOps,
  resolveSetTextOps,
  type CreateFrameRequest,
  type CreatePageRequest,
  type CreateTextRequest,
  type DeletePageRequest,
  type DuplicateFramesRequest,
  type MoveFrameRequest,
  type MoveFramesRequest,
  type MoveNodesToPageRequest,
  type PlacementReport,
  type RemoveFrameRequest,
  type RemoveFramesRequest,
  type RenameFrameRequest,
  type RenamePageRequest,
  type ReorderFrameRequest,
  type ReorderPageRequest,
  type SetTextRequest,
} from './authors.js';
import { readGuestPageError } from './cdp.js';
import { frameMirror } from './mirror.js';
import { readPageErrors, type FramePageError, type GuestReadOutcome } from './page-error.js';
import { electronImageOps } from './thumbnail/compose.js';
import { logger, type CanvasAuthorResult, nodesByPage, type CanvasHistoryResult, host, opNodeId, withLandingPage, frameShownOver, frameQuoteSource } from './host.js';

const BYTES_PER_MB = 1_048_576;

export function undoAgentCanvas(worktreePath: string): Promise<CanvasHistoryResult> {
  return host.undoFor(worktreePath);
}

export function redoAgentCanvas(worktreePath: string): Promise<CanvasHistoryResult> {
  return host.redoFor(worktreePath);
}

export type AgentFrameUrlOutcome = AgentFrameOutcome;

export function applyAgentFrameUrl(
  frameId: CanvasNodeId,
  url: string,
  worktreePath: string,
): Promise<AgentFrameUrlOutcome> {
  return applyAgentFrameOp(worktreePath, (doc) => resolveFrameUrlOps(doc, url, { frameId }));
}

export type AgentFrameOutcome =
  | { ok: true; node: CanvasNode; placement?: PlacementReport }
  | { ok: false; reason: string };

async function applyAgentFrameOp(
  worktreePath: string,
  resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string } | Promise<CanvasOp[] | { reason: string }>,
  placement?: (doc: CanvasDoc, node: CanvasNode) => PlacementReport,
): Promise<AgentFrameOutcome> {
  const result = await host.apply('agent', resolve, worktreePath);
  if (!result.ok) return result;
  const id = opNodeId(result.entries[0]?.op);
  const node = id === undefined ? undefined : result.doc.nodes[id];
  // Unreachable while every resolver leaves its node in the document.
  if (node === undefined) return { ok: false, reason: 'the applied op left no frame behind' };
  return { ok: true, node, ...(placement ? { placement: placement(result.doc, node) } : {}) };
}

export async function applyAgentCreateFrame(
  worktreePath: string,
  request: CreateFrameRequest,
): Promise<AgentFrameOutcome> {
  const landed = await withLandingPage(worktreePath, request);
  const result = await applyAgentFrameOp(
    worktreePath,
    (doc) => resolveCreateFrameOps(doc, landed),
    (doc, node) => createFramePlacement(doc, node, landed, undefined),
  );
  if (result.ok && request.kind === 'section') {
    const workspaceProperties = resolveWorkspaceTelemetryProperties(worktreePath);
    capture('section_created', { ...workspaceProperties, method: 'agent', count: 1 });
  }
  return result;
}

export async function applyAgentCreateArtifact(worktreePath: string, request: CreateArtifactNodeRequest): Promise<AgentFrameOutcome> {
  const landed = await withLandingPage(worktreePath, request);
  const result = await applyAgentFrameOp(worktreePath, async (doc) => {
    const manifest = await artifactStore().readManifest(request.artifactId);
    return resolveCreateArtifactOps(doc, { ...landed, dimensions: manifest?.dimensions });
  });
  if (result.ok) {
    const workspaceProperties = resolveWorkspaceTelemetryProperties(worktreePath);
    capture('artifact_placed', { ...workspaceProperties, method: 'agent', count: 1 });
  }
  return result;
}

export function applyAgentMoveFrame(
  worktreePath: string,
  request: MoveFrameRequest,
): Promise<AgentFrameOutcome> {
  return applyAgentFrameOp(
    worktreePath,
    (doc) => resolveMoveFrameOps(doc, request),
    (doc, node) => moveFramePlacement(doc, node, request, undefined),
  );
}

/** One event per kind, stamped `agent` whichever tool wrote it (ONL-2486). */
function reportAgentCreated(worktreePath: string, nodes: readonly CanvasNode[]): void {
  const held = resolveWorkspaceTelemetryProperties(worktreePath) ?? {};
  const labels = nodes.filter((node) => node.kind === 'text').length;
  const pictures = nodes.filter((node) => node.kind === 'image').length;
  if (labels > 0) capture('text_node_created', { ...held, method: 'agent', count: labels });
  if (pictures > 0) capture('image_node_created', { ...held, method: 'agent', count: pictures });
}

export async function applyAgentCreateText(
  worktreePath: string,
  request: CreateTextRequest,
): Promise<AgentFrameOutcome> {
  const landed = await withLandingPage(worktreePath, request);
  const written = await applyAgentFrameOp(
    worktreePath,
    (doc) => resolveCreateTextOps(doc, landed),
    (doc, node) => createFramePlacement(doc, node, landed, undefined),
  );
  if (written.ok) reportAgentCreated(worktreePath, [written.node]);
  return written;
}

export function applyAgentSetText(
  worktreePath: string,
  request: SetTextRequest,
): Promise<AgentFrameOutcome> {
  return applyAgentFrameOp(worktreePath, (doc) => resolveSetTextOps(doc, request));
}

export interface CreateImageFromPathRequest {
  path: string;
  name?: string;
  alt?: string;
  x?: number;
  y?: number;
  beside?: CanvasNodeId;
  side?: PlacementSide;
  pageId?: CanvasPageId;
}

/** Injected so a unit test needs no Electron: `nativeImage` is the only decoder main has. */
export interface AgentImageIngest {
  fileSize: (path: string) => number;
  readFile: (path: string) => Uint8Array;
  register: (cwd: string, bytes: Uint8Array) => RegisterImageResult;
  settle: (cwd: string, ids: readonly string[]) => void;
  imageSize: (bytes: Uint8Array) => { width: number; height: number } | null;
}

function nativeImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const decoded = electronImageOps().decode(bytes);
  if (decoded === null) return null;
  const { width, height } = decoded.getSize();
  return width > 0 && height > 0 ? { width, height } : null;
}

/** A FIFO or a device reports size 0, clears the cap, and then blocks or never ends inside `readFileSync` (ONL-2486). */
export function regularFileSize(path: string): number {
  const stat = statSync(path);
  if (!stat.isFile()) throw new Error('not a regular file');
  return stat.size;
}

const AGENT_IMAGE_INGEST: AgentImageIngest = {
  fileSize: regularFileSize,
  readFile: (path) => readFileSync(path),
  register: (cwd, bytes) => registerImage(cwd, bytes),
  settle: settlePending,
  imageSize: nativeImageSize,
};

function imageRefusal(path: string, reason: ImageRejectReason): string {
  if (reason === 'too-large') {
    return `"${path}" is larger than the ${String(Math.round(IMAGE_MAX_BYTES / BYTES_PER_MB))}MB Onlook accepts`;
  }
  if (reason === 'unsupported-format') {
    return `"${path}" is not an image Onlook can show — PNG, JPEG, GIF and WebP only`;
  }
  return `"${path}" could not be read as an image — check the path, or give an absolute one`;
}

/** The bytes are copied against the canvas document's own directory, which outlives any one session (ONL-2486). */
export async function applyAgentCreateImage(
  worktreePath: string,
  request: CreateImageFromPathRequest,
  ingest: AgentImageIngest = AGENT_IMAGE_INGEST,
): Promise<AgentFrameOutcome> {
  const path = isAbsolute(request.path) ? request.path : resolvePath(worktreePath, request.path);
  let bytes: Uint8Array;
  try {
    // Before the read, as the picker does: a model-supplied path must not spike main's memory.
    if (ingest.fileSize(path) > IMAGE_MAX_BYTES) {
      return { ok: false, reason: imageRefusal(request.path, 'too-large') };
    }
    bytes = ingest.readFile(path);
  } catch {
    return { ok: false, reason: imageRefusal(request.path, 'unreadable') };
  }
  const size = ingest.imageSize(bytes);
  if (size === null) return { ok: false, reason: imageRefusal(request.path, 'unsupported-format') };
  const registered = ingest.register(worktreePath, bytes);
  if (!registered.ok) return { ok: false, reason: imageRefusal(request.path, registered.reason) };
  const landed = await withLandingPage(worktreePath, request);
  const created = await applyAgentFrameOp(
    worktreePath,
    (doc) =>
      resolveCreateImageOps(doc, {
        imageId: registered.image.id,
        name: landed.name ?? basename(path),
        originalWidth: size.width,
        originalHeight: size.height,
        ...(landed.alt === undefined ? {} : { alt: landed.alt }),
        ...(landed.x === undefined ? {} : { x: landed.x }),
        ...(landed.y === undefined ? {} : { y: landed.y }),
        ...(landed.beside === undefined ? {} : { beside: landed.beside }),
        ...(landed.side === undefined ? {} : { side: landed.side }),
        ...(landed.pageId === undefined ? {} : { pageId: landed.pageId }),
      }),
    (doc, node) => createFramePlacement(doc, node, landed, undefined),
  );
  // The hold hands over to the document; a refused write keeps it until the session releases (ONL-2486).
  if (created.ok) {
    ingest.settle(worktreePath, [registered.image.id]);
    reportAgentCreated(worktreePath, [created.node]);
  }
  return created;
}

export function applyAgentRenameFrame(
  worktreePath: string,
  request: RenameFrameRequest,
): Promise<AgentFrameOutcome> {
  return applyAgentFrameOp(worktreePath, (doc) => resolveRenameFrameOps(doc, request));
}

export function applyAgentReorderFrame(
  worktreePath: string,
  request: ReorderFrameRequest,
): Promise<AgentFrameOutcome> {
  return applyAgentFrameOp(worktreePath, (doc) => resolveReorderFrameOps(doc, request));
}

export async function applyAgentRemoveFrame(
  worktreePath: string,
  request: RemoveFrameRequest,
): Promise<{ ok: true; removed: CanvasNode } | { ok: false; reason: string }> {
  let removed: CanvasNode | undefined;
  const result = await host.apply(
    'agent',
    (doc) => {
      removed = doc.nodes[request.frameId];
      return resolveRemoveFrameOps(doc, request);
    },
    worktreePath,
  );
  if (!result.ok) return result;
  if (removed === undefined) return { ok: false, reason: 'the applied op left no frame behind' };
  return { ok: true, removed };
}

export type AgentFramesOutcome =
  | { ok: true; nodes: CanvasNode[]; placements?: PlacementReport[] }
  | { ok: false; reason: string };

async function applyAgentFrameGroup(
  worktreePath: string,
  resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string },
  placements?: (doc: CanvasDoc, nodes: CanvasNode[]) => PlacementReport[],
): Promise<AgentFramesOutcome> {
  const result = await host.apply('agent', resolve, worktreePath);
  if (!result.ok) return result;
  const nodes: CanvasNode[] = [];
  for (const entry of result.entries) {
    const id = opNodeId(entry.op);
    const node = id === undefined ? undefined : result.doc.nodes[id];
    if (node === undefined) return { ok: false, reason: 'the applied action left no frame behind' };
    nodes.push(node);
  }
  return { ok: true, nodes, ...(placements ? { placements: placements(result.doc, nodes) } : {}) };
}

export function applyAgentMoveFrames(
  worktreePath: string,
  request: MoveFramesRequest,
): Promise<AgentFramesOutcome> {
  return applyAgentFrameGroup(
    worktreePath,
    (doc) => resolveMoveFramesOps(doc, request),
    (doc, nodes) => moveFramesPlacements(doc, nodes, undefined),
  );
}

export async function applyAgentDuplicateFrames(
  worktreePath: string,
  request: DuplicateFramesRequest,
): Promise<AgentFramesOutcome> {
  const copied = await applyAgentFrameGroup(
    worktreePath,
    (doc) => resolveDuplicateFramesOps(doc, request),
    (doc, nodes) => duplicateFramesPlacements(doc, nodes, request, undefined),
  );
  if (copied.ok) reportAgentCreated(worktreePath, copied.nodes);
  return copied;
}

export async function applyAgentRemoveFrames(
  worktreePath: string,
  request: RemoveFramesRequest,
): Promise<{ ok: true; removed: CanvasNode[] } | { ok: false; reason: string }> {
  let removed: CanvasNode[] | undefined;
  const result = await host.apply(
    'agent',
    (doc) => {
      removed = request.frameIds
        .map((id) => doc.nodes[id])
        .filter((node): node is CanvasNode => node !== undefined);
      return resolveRemoveFramesOps(doc, request);
    },
    worktreePath,
  );
  if (!result.ok) return result;
  if (removed === undefined || removed.length !== request.frameIds.length) {
    return { ok: false, reason: 'the applied action did not remove every requested frame' };
  }
  return { ok: true, removed };
}

export interface AgentPageReading {
  id: CanvasPageId;
  name: string;
  /** A rule between groups, not a place objects live. */
  divider: boolean;
  /** The page in front of the user. The agent reaches every page whichever one this is (ONL-2488). */
  current: boolean;
  objects: number;
}

export type AgentPageOutcome =
  | { ok: true; page: AgentPageReading }
  | { ok: false; reason: string };

export type AgentPageRemoval =
  | { ok: true; removed: { id: CanvasPageId; name: string; objects: number }; pages: AgentPageReading[] }
  | { ok: false; reason: string };

export type AgentNodesPagedOutcome =
  | { ok: true; page: { id: CanvasPageId; name: string }; nodes: AgentFrameReading[] }
  | { ok: false; reason: string };

/** The only read that sees an empty page, the page order and which page is current; no node reading carries any of the three (ONL-2488). */
export async function listAgentPages(worktreePath: string): Promise<AgentPageReading[]> {
  const { doc, currentPageId } = await host.paged(worktreePath);
  if (!doc) return [];
  return canvasPages(doc).map((page) => ({
    id: page.id,
    name: page.name,
    divider: isDividerPage(page),
    current: page.id === currentPageId,
    objects: nodesOnPage(doc, page.id).length,
  }));
}

async function applyAgentPageOp(
  worktreePath: string,
  resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string },
  pageIdOf: (result: CanvasAuthorResult & { ok: true }) => CanvasPageId | undefined,
): Promise<AgentPageOutcome> {
  const result = await host.apply('agent', resolve, worktreePath);
  if (!result.ok) return result;
  const pageId = pageIdOf(result);
  const page = (await listAgentPages(worktreePath)).find((held) => held.id === pageId);
  // Unreachable while every page resolver leaves its page in the document.
  if (page === undefined) return { ok: false, reason: 'the applied action left no page behind' };
  return { ok: true, page };
}

function opPageId(op: CanvasOp | undefined): CanvasPageId | undefined {
  if (op === undefined) return undefined;
  if (op.type === 'create-page') return op.page.id;
  return 'pageId' in op ? op.pageId : undefined;
}

export function applyAgentCreatePage(
  worktreePath: string,
  request: CreatePageRequest,
): Promise<AgentPageOutcome> {
  return applyAgentPageOp(
    worktreePath,
    (doc) => resolveCreatePageOps(doc, request),
    (result) => opPageId(result.entries[0]?.op),
  );
}

export function applyAgentRenamePage(
  worktreePath: string,
  request: RenamePageRequest,
): Promise<AgentPageOutcome> {
  return applyAgentPageOp(
    worktreePath,
    (doc) => resolveRenamePageOps(doc, request),
    () => request.pageId,
  );
}

export function applyAgentReorderPage(
  worktreePath: string,
  request: ReorderPageRequest,
): Promise<AgentPageOutcome> {
  return applyAgentPageOp(
    worktreePath,
    (doc) => resolveReorderPageOps(doc, request),
    () => request.pageId,
  );
}

/** One batch: the objects go, then the page, and the reverse walk recreates the page before anything references it (ONL-2488). */
export async function applyAgentDeletePage(
  worktreePath: string,
  request: DeletePageRequest,
): Promise<AgentPageRemoval> {
  let removed: { id: CanvasPageId; name: string; objects: number } | undefined;
  const result = await host.apply(
    'agent',
    (doc) => {
      const ops = resolveDeletePageOps(doc, request);
      const page = doc.pages?.[request.pageId];
      if (Array.isArray(ops) && page !== undefined) {
        removed = { id: page.id, name: page.name, objects: ops.length - 1 };
      }
      return ops;
    },
    worktreePath,
  );
  if (!result.ok) return result;
  if (removed === undefined) return { ok: false, reason: 'the applied action removed no page' };
  return { ok: true, removed, pages: await listAgentPages(worktreePath) };
}

export async function applyAgentMoveNodesToPage(
  worktreePath: string,
  request: MoveNodesToPageRequest,
  repoIdentity?: string,
): Promise<AgentNodesPagedOutcome> {
  let landing: { id: CanvasPageId; name: string } | undefined;
  const result = await host.apply(
    'agent',
    (doc) => {
      const page = doc.pages?.[request.pageId];
      if (page !== undefined) landing = { id: page.id, name: page.name };
      return resolveMoveNodesToPageOps(doc, request);
    },
    worktreePath,
  );
  if (!result.ok) return result;
  if (landing === undefined) return { ok: false, reason: 'the applied action named no page' };
  // A move observes; draining here empties the console of every frame already on the page, and this answer reports only the moved ones (ONL-2297).
  const onPage = await listAgentFrames(worktreePath, repoIdentity, {
    pageId: landing.id,
    drainConsole: false,
  });
  const moved = new Set(request.nodeIds);
  return { ok: true, page: landing, nodes: onPage.filter((node) => moved.has(node.id)) };
}

export interface AgentFrameReading {
  id: CanvasNodeId;
  name: string;
  kind: CanvasNode['kind'];
  /** Every reading carries its page, so the agent can name the one it used without a second read (ONL-2488). */
  pageId: CanvasPageId;
  pageName: string;
  /** Browser nodes only, as are every live fact below it. */
  homeUrl?: string;
  artifactId?: string;
  artifactPagePath?: string;
  /** Text nodes. */
  text?: string;
  size?: CanvasTextSize;
  /** Image nodes. */
  alt?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stack: number;
  copiedFrom?: CanvasNodeId;
  /** Ready-made markdown; a link the model assembles reaches the user broken (ONL-1995). */
  link?: string;
  currentUrl?: string;
  health?: FrameHealth;
  title?: string;
  server?: ServerPortMeasurement;
  console?: FrameConsoleLine[];
  errorCount?: number;
  /** Present only while the page is showing something other than the site (ONL-2297). */
  pageError?: FramePageError;
  overlaps?: CanvasNodeId[];
}

export interface AgentFramesOptions {
  /** Omitted reports every page: the page tools need ids off the page in front of the user (ONL-2488). */
  pageId?: CanvasPageId;
  /** An observer passes `false`: `read` drains the console lines `list_frames` promised the agent (ONL-2297). */
  drainConsole?: boolean;
  /** The seam a test reads a page through; the default addresses the frame's real guest. */
  readPage?: (frame: MirroredFrame) => Promise<GuestReadOutcome>;
}

/** Selection is deliberately absent: it reaches the agent as prompt evidence, and two routes disagree. */
export async function listAgentFrames(
  worktreePath: string,
  repoIdentity?: string,
  options: AgentFramesOptions = {},
): Promise<AgentFrameReading[]> {
  const { doc } = await host.snapshotFor(worktreePath);
  if (!doc) return [];
  const pages = nodesByPage(doc).filter(
    (page) => options.pageId === undefined || page.id === options.pageId,
  );
  const objects = pages.flatMap((page) => page.nodes);
  const pageOf = new Map<CanvasNodeId, { id: CanvasPageId; name: string; stack: number }>();
  const neighbours = new Map<CanvasNodeId, CanvasNode[]>();
  for (const page of pages) {
    page.nodes.forEach((node, stack) => {
      pageOf.set(node.id, { id: page.id, name: page.name, stack });
      neighbours.set(node.id, page.nodes);
    });
  }
  const browserIds = objects.filter(isBrowserNode).map((node) => node.id);
  const mirrored =
    options.drainConsole === false
      ? browserIds.flatMap((id) => {
          const facts = frameMirror().peek(doc.docId, id);
          return facts === undefined ? [] : [{ ...facts, console: [], errorCount: 0 }];
        })
      : frameMirror().read(doc.docId, browserIds);
  const live = new Map(mirrored.map((facts) => [facts.id, facts]));
  const pageErrors = await readPageErrors(
    mirrored,
    options.readPage ??
      ((frame) => readGuestPageError({ frameId: frame.id, webContentsId: frame.webContentsId })),
  );
  const claims = new Map<number, ServerPortMeasurement>();
  for (const entry of serverBookEntries(worktreePath)) {
    for (const claimed of entry.ports) {
      // Live wins over a dead claim on the same port, as the renderer's `matchServerPort` does.
      if (claims.get(claimed.port) === 'live') continue;
      claims.set(claimed.port, claimed.measured);
    }
  }

  return objects.map((node) => {
    const facts = live.get(node.id);
    const pageError = pageErrors.get(node.id);
    const port = isBrowserNode(node) ? localPort(node.content.homeUrl) : null;
    const claim = port === null ? undefined : claims.get(port);
    const rect = { x: node.x, y: node.y, width: node.width, height: node.height };
    const page = pageOf.get(node.id) as { id: CanvasPageId; name: string; stack: number };
    const overlaps = (neighbours.get(node.id) ?? [])
      .filter(
        (other) =>
          other.id !== node.id &&
          intersects(rect, {
            x: other.x,
            y: other.y,
            width: other.width,
            height: other.height,
          }),
      )
      .map((other) => other.id);
    return {
      id: node.id,
      name: node.name,
      kind: node.kind,
      pageId: page.id,
      pageName: page.name,
      ...(node.kind === 'browser' ? { homeUrl: node.content.homeUrl } : {}),
      ...(node.kind === 'artifact' ? { artifactId: node.content.artifactId,
        ...(node.content.pagePath === undefined ? {} : { artifactPagePath: node.content.pagePath }) } : {}),
      ...(node.kind === 'text' ? { text: node.content.text, size: node.content.size } : {}),
      ...(node.kind === 'image' && node.content.alt !== undefined ? { alt: node.content.alt } : {}),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      stack: page.stack,
      ...(node.provenance ? { copiedFrom: node.provenance.from } : {}),
      // A link moves the user's view to a FRAME; nothing carries them to the other kinds yet (ONL-2486).
      ...(repoIdentity === undefined || !isBrowserNode(node)
        ? {}
        : { link: frameLinkMarkdown({ repoIdentity, frameId: node.id }, node.name) }),
      ...(facts
        ? {
            currentUrl: facts.currentUrl,
            health: facts.health,
            title: facts.title,
            ...(facts.console.length > 0
              ? { console: facts.console, errorCount: facts.errorCount }
              : { errorCount: 0 }),
            ...(pageError === undefined ? {} : { pageError }),
          }
        : {}),
      ...(claim ? { server: claim } : {}),
      ...(overlaps.length > 0 ? { overlaps } : {}),
    };
  });
}

/** Only the current page's frames are mounted, so a frame anywhere else is named by its page rather than doubted (ONL-2488). */
function offPageOf(
  doc: CanvasDoc,
  currentPageId: CanvasPageId | undefined,
  frameId: CanvasNodeId,
): OffPage | undefined {
  const node = doc.nodes[frameId];
  if (node === undefined || currentPageId === undefined) return undefined;
  const pageId = resolveNodePageId(doc, node);
  if (pageId === currentPageId) return undefined;
  const page = doc.pages?.[pageId];
  return page === undefined ? undefined : { name: page.name };
}

export async function evaluateInAgentFrame(
  worktreePath: string,
  frameId: CanvasNodeId,
  script: string,
): Promise<EvaluateResult> {
  const { doc, currentPageId } = await host.paged(worktreePath);
  if (!doc) return { ok: false, reason: "this session's project is no longer open" };
  const offPage = offPageOf(doc, currentPageId, frameId);
  const node = doc.nodes[frameId];
  return evaluateInFrame({
    mirror: frameMirror(),
    docId: doc.docId,
    frameId,
    script,
    ...(node?.kind === 'artifact' ? { artifactId: node.content.artifactId } : {}),
    ...(offPage === undefined ? {} : { offPage }),
  });
}

export async function captureAgentFrame(
  worktreePath: string,
  frameId: CanvasNodeId,
  revealed?: RevealFacts,
): Promise<FrameCaptureResult> {
  return measureFrameCapture((facts) => captureAgentFrameResult(worktreePath, frameId, facts), revealed);
}

async function captureAgentFrameResult(
  worktreePath: string,
  frameId: CanvasNodeId,
  revealed: RevealFacts,
): Promise<FrameCaptureResult> {
  const { doc, currentPageId } = await host.paged(worktreePath);
  const offPage = doc === null ? undefined : offPageOf(doc, currentPageId, frameId);
  const result = doc
    ? await captureFrame({
        mirror: frameMirror(),
        docId: doc.docId,
        frameId,
        ...(doc.nodes[frameId]?.kind === 'artifact' ? { artifactId: doc.nodes[frameId].content.artifactId } : {}),
        ...(offPage === undefined ? {} : { offPage }),
        revealed,
      })
    : { ok: false as const, reason: "this session's project is no longer open" };
  // The result reaches the model; this line reaches a human reading the log (ONL-2304). An off-page frame is an expected state, not an issue the error guardrail should mint (ONL-2488).
  if (!result.ok && offPage === undefined) {
    logger.error('capture_frame failed', { frame_id: frameId, reason: result.reason });
  }
  if (result.ok && offPage === undefined) frameQuoteSource?.looked(worktreePath, frameId);
  const shown = offPage === undefined ? frameShownOver(worktreePath, frameId) : undefined;
  return shown === undefined ? result : { ...result, shown };
}

const frameRefs = new FrameRefBook();

const refKey = (docId: string, frameId: string): string => `${docId}\u0000${frameId}`;

export async function readAgentFrame(
  worktreePath: string,
  frameId: CanvasNodeId,
  scope: FrameReadScope,
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const { doc, currentPageId } = await host.paged(worktreePath);
  if (!doc) return { ok: false, reason: "this session's project is no longer open" };
  const offPage = offPageOf(doc, currentPageId, frameId);
  const node = doc.nodes[frameId];
  const result = await readFrame({
    mirror: frameMirror(),
    docId: doc.docId,
    frameId,
    ...(node?.kind === 'artifact' ? { artifactId: node.content.artifactId } : {}),
    ...(offPage === undefined ? {} : { offPage }),
  });
  if (!result.ok) return result;
  frameRefs.remember(refKey(doc.docId, frameId), result.read);
  return { ok: true, text: frameReadText(frameId, result.read, scope) };
}

function clipTargetOf(docId: string, frameId: string, target: PictureTarget): ClipTarget {
  if (target.ref !== undefined) return { ref: target.ref, expect: frameRefs.expectation(refKey(docId, frameId), target.ref) ?? null };
  if (target.selector !== undefined) return { selector: target.selector };
  return {};
}

const pictureWords = (picture: FramePicture): string => (picture.ok ? (picture.missed === undefined ? picture.source : `${picture.source}:${picture.missed}`) : `none:${picture.reason}`);

/** The next-task card's pictures, one capture of the frame for all of them; a frame named always gets a picture when one exists (ONL-2977). */
export async function clipAgentFramePictures(
  worktreePath: string,
  frameId: CanvasNodeId,
  targets: readonly PictureTarget[],
): Promise<FramePictures> {
  const began = performance.now();
  const { doc, currentPageId } = await host.paged(worktreePath);
  const offPage = doc === null ? undefined : offPageOf(doc, currentPageId, frameId);
  const result = doc
    ? await clipFrame({
        mirror: frameMirror(),
        docId: doc.docId,
        frameId,
        targets: targets.map((target) => clipTargetOf(doc.docId, frameId, target)),
        ...(doc.nodes[frameId]?.kind === 'artifact' ? { artifactId: doc.nodes[frameId].content.artifactId } : {}),
        ...(offPage === undefined ? {} : { offPage }),
      })
    : { ok: false as const, reason: "this session's project is no longer open", retried: false };
  const captureFailure = result.ok ? 'none' : frameCaptureFailureReason(result.reason);
  const missed: PictureMiss = captureFailure === 'none' ? 'capture-error' : captureFailure;
  const remembered = !result.ok && result.remembered !== undefined ? registerImage(worktreePath, result.remembered, { hold: false }) : undefined;
  const pictures: FramePicture[] = result.ok
    ? result.targets.map((target) => {
        const stored = registerImage(worktreePath, target.png, { hold: false });
        if (!stored.ok) return { ok: false, reason: 'capture-error' };
        return { ok: true, id: stored.image.id, source: target.source, ...(target.missed === undefined ? {} : { missed: target.missed }) };
      })
    : targets.map(() => (remembered?.ok === true ? { ok: true, id: remembered.image.id, source: 'remembered', missed } : { ok: false, reason: missed }));
  const report = { pictures, captureFailure, retried: result.retried, durationMs: Math.round(performance.now() - began) };
  logger.info('next-task pictures clipped', {
    frame_id: frameId,
    requested: targets.length,
    clipped: pictures.filter((picture) => picture.ok && picture.missed === undefined).length,
    pictures: pictures.map(pictureWords).join(','),
    capture_failure: captureFailure,
    ...(result.ok ? {} : { capture_reason: result.reason }),
    retried: report.retried,
    duration_ms: report.durationMs,
  });
  return report;
}
