import { randomUUID } from 'node:crypto';
import {
  DEFAULT_FRAME_SIZE,
  PLACEMENT_GAP,
  CANVAS_ARTIFACT_DEFAULT_BOX,
  CANVAS_SECTION_DEFAULT_BOX,
  isArtifactId,
  MAX_CANVAS_OPS_PER_REQUEST,
  arrivalImageBox,
  canvasPages,
  canvasStack,
  defaultTextBox,
  displayUrl,
  firstRestingPageId,
  intersects,
  isBrowserNode,
  isDividerPage,
  isLastNonDividerPage,
  localPort,
  nextPageOrder,
  nextPosition,
  nodesOnPage,
  normalizeDevUrl,
  overlapsOf,
  placeBeside,
  resolveNodePageId,
  resolveStackOps,
  sectionMembersOnPage,
  withSectionContentsOnPage,
  type CanvasDoc,
  type CanvasDocId,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasOp,
  type CanvasOpAuthor,
  type CanvasPage,
  type CanvasPageId,
  type CanvasTextSize,
  type PlacementSide,
  type Rect,
  type ServerState,
  type StackPosition,
  type ViewRect,
} from '@studio/events';
import { log } from '../log/index.js';
import { drainCanvasOps, duplicateFrameRebindOps } from './duplicate.js';

const logger = log('canvas');

export type ApplyCanvasOps = (
  author: CanvasOpAuthor,
  resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string },
  /** Omitted, the write goes to the ACTIVE document (ONL-1998). */
  worktreePath?: string,
) => Promise<unknown>;

function followHomeUrl(homeUrl: string, fromPort: number, toPort: number): string | null {
  if (localPort(homeUrl) !== fromPort) return null;
  const url = new URL(homeUrl);
  url.port = String(toPort);
  return url.toString();
}

export function portFollowOps(doc: CanvasDoc, fromPort: number, toPort: number): CanvasOp[] {
  if (fromPort === toPort) return [];
  const ops: CanvasOp[] = [];
  for (const node of Object.values(doc.nodes)) {
    if (!isBrowserNode(node) || node.content.pendingHomeUrl !== undefined) continue;
    const homeUrl = followHomeUrl(node.content.homeUrl, fromPort, toPort);
    if (homeUrl !== null) ops.push({ type: 'set-home-url', id: node.id, homeUrl });
    if (ops.length === MAX_CANVAS_OPS_PER_REQUEST) break;
  }
  return ops;
}

/** A refusal RESOLVES, so without reading it a frame left on a dead port reports nothing at all. */
function refusedReason(result: unknown): string | undefined {
  if (typeof result !== 'object' || result === null) return undefined;
  const answer = result as { ok?: unknown; reason?: unknown };
  if (answer.ok !== false) return undefined;
  return typeof answer.reason === 'string' ? answer.reason : 'refused';
}

export interface ServerPortFollow {
  observed(state: ServerState): void;
}

/** `refused` means no frame moved, so whatever still points at the old port is still pointing there. */
export type PortMoveOutcome = 'moved' | 'refused';

export function createServerPortFollow(apply: ApplyCanvasOps, worktreePath?: string): ServerPortFollow {
  let sequence = 0;
  let latest: { sequence: number; port: number } | undefined;
  const documents = new Map<CanvasDocId, { sequence: number; port: number; fromPorts: Set<number> }>();
  return {
    observed(state) {
      if (state.status !== 'running' || state.port === undefined) return;
      const port = state.port;
      const observation = { sequence: ++sequence, port };
      latest = observation;
      void drainCanvasOps(
        (resolve) => apply('system', resolve, worktreePath),
        (doc) => {
          const wanted = latest ?? observation;
          let followed = documents.get(doc.docId);
          if (followed === undefined) {
            followed = { ...wanted, fromPorts: new Set<number>() };
            documents.set(doc.docId, followed);
          }
          if (wanted.sequence > followed.sequence) {
            followed.fromPorts.add(followed.port);
            followed.port = wanted.port;
            followed.sequence = wanted.sequence;
          }
          const ops = duplicateFrameRebindOps(doc, followed.port);
          if (ops.length === MAX_CANVAS_OPS_PER_REQUEST) return ops;
          for (const fromPort of followed.fromPorts) {
            for (const op of portFollowOps(doc, fromPort, followed.port)) {
              ops.push(op);
              if (ops.length === MAX_CANVAS_OPS_PER_REQUEST) return ops;
            }
          }
          if (ops.length === 0) followed.fromPorts.clear();
          return ops;
        },
      )
        .then((result) => {
          const reason = refusedReason(result);
          if (reason !== undefined) logger.warn('port-follow was refused', { reason, port });
        })
        .catch((err: unknown) => {
          logger.error('port-follow could not author', { error: err });
        });
    },
  };
}

/** Never rejects. The host awaits it before broadcasting the moved book, or a guest mounts at the dead origin (ONL-1994). */
export function createReverifyMoveAuthor(
  apply: ApplyCanvasOps,
): (fromPort: number, toPort: number, worktreePath?: string) => Promise<PortMoveOutcome> {
  return async (fromPort, toPort, worktreePath) => {
    if (fromPort === toPort) return 'moved';
    return drainCanvasOps(
      (resolve) => apply('system', resolve, worktreePath),
      (doc) => portFollowOps(doc, fromPort, toPort),
    )
      .then((result): PortMoveOutcome => {
        const reason = refusedReason(result);
        if (reason === undefined) return 'moved';
        logger.warn('reverify-move was refused', { reason, from_port: fromPort, to_port: toPort });
        return 'refused';
      })
      .catch((err: unknown): PortMoveOutcome => {
        logger.error('reverify-move could not author', { error: err });
        return 'refused';
      });
  };
}

export function resolveFrameUrlOps(
  doc: CanvasDoc,
  url: string,
  options: { frameId: CanvasNodeId },
): CanvasOp[] | { reason: string } {
  const homeUrl = normalizeDevUrl(url);
  if (homeUrl === null) return notNavigable(url);
  if (doc.nodes[options.frameId] === undefined) return noSuchFrame(options.frameId);
  return [{ type: 'set-home-url', id: options.frameId, homeUrl }];
}

/** Not `Parameters<typeof resolveCreateFrameOps>[1]`: that would let a tool sink choose a node's id. */
export interface CreateFrameRequest {
  kind?: 'section';
  width?: number;
  height?: number;
  url?: string;
  name?: string;
  fromFrameId?: CanvasNodeId;
  x?: number;
  y?: number;
  /** Mutually exclusive with x/y (ONL-2199). */
  beside?: CanvasNodeId;
  side?: PlacementSide;
  /** Absent, the caller's own default lands it — never a silent redirect from a page that named nothing (ONL-2488). */
  pageId?: CanvasPageId;
  /** Parked on its url until a setup reports the app's port (ONL-2960). */
  pending?: boolean;
}

export interface MoveFrameRequest {
  frameId: CanvasNodeId;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Mutually exclusive with x/y (ONL-2199). */
  beside?: CanvasNodeId;
  side?: PlacementSide;
}

export interface RenameFrameRequest {
  frameId: CanvasNodeId;
  name: string;
}

export type { StackPosition };

export interface ReorderFrameRequest {
  frameId: CanvasNodeId;
  position: StackPosition;
}

export interface RemoveFrameRequest {
  frameId: CanvasNodeId;
}

export interface MoveFramesRequest {
  frameIds: CanvasNodeId[];
  deltaX: number;
  deltaY: number;
}

export interface DuplicateFramesRequest {
  frameIds: CanvasNodeId[];
  /** Both absent places each copy beside its source (ONL-2199). */
  offsetX?: number;
  offsetY?: number;
}

export interface RemoveFramesRequest {
  frameIds: CanvasNodeId[];
}

/** One wording for every verb: the model reads it and acts. */
function noSuchFrame(frameId: CanvasNodeId): { reason: string } {
  return {
    reason: `no frame "${frameId}" on this canvas — it may have been removed. Call list_frames.`,
  };
}

function noSuchPage(pageId: CanvasPageId): { reason: string } {
  return {
    reason: `no page "${pageId}" in this project — it may have been deleted. Call list_pages.`,
  };
}

function dividerPage(page: CanvasPage): { reason: string } {
  return {
    reason: `page "${page.id}" is a divider, not a place objects live — call list_pages for the pages that hold them`,
  };
}

function anchorOffPage(anchor: CanvasNode): { reason: string } {
  return {
    reason: `"${anchor.name}" is on another page — beside places an object next to one on the same page`,
  };
}

/** The canvas holds labels and pictures too, so a lookup that accepts any kind must not say "frame" (ONL-2486). */
function noSuchObject(id: CanvasNodeId): { reason: string } {
  return {
    reason: `no object "${id}" on this canvas — it may have been removed. Call list_frames.`,
  };
}

function notAFrame(frameId: CanvasNodeId): { reason: string } {
  return { reason: `"${frameId}" is not a frame — create_frame copies frames only` };
}

function besideConflict(): { reason: string } {
  return { reason: 'give beside or x/y, not both — beside already resolves a position' };
}

function rectOf(node: { x: number; y: number; width: number; height: number }): Rect {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

function groupFrames(
  doc: CanvasDoc,
  frameIds: CanvasNodeId[],
): CanvasNode[] | { reason: string } {
  if (frameIds.length === 0) return { reason: 'choose at least one frame' };
  if (frameIds.length > MAX_CANVAS_OPS_PER_REQUEST) {
    return { reason: `an action may contain at most ${MAX_CANVAS_OPS_PER_REQUEST} frames` };
  }
  const unique = new Set(frameIds);
  if (unique.size !== frameIds.length) {
    return { reason: 'frame_ids must not contain duplicates' };
  }
  const nodes: CanvasNode[] = [];
  for (const frameId of frameIds) {
    const node = doc.nodes[frameId];
    if (node === undefined) return noSuchFrame(frameId);
    nodes.push(node);
  }
  return nodes;
}

export function resolveCreateFrameOps(
  doc: CanvasDoc,
  request: CreateFrameRequest & {
    mintId?: () => CanvasNodeId;
    at?: string;
  },
): CanvasOp[] | { reason: string } {
  const { url, name, fromFrameId, mintId = randomUUID, at = new Date().toISOString() } = request;
  const placement: PlacementRequest = {
    ...(request.x === undefined ? {} : { x: request.x }),
    ...(request.y === undefined ? {} : { y: request.y }),
    ...(request.beside === undefined ? {} : { beside: request.beside }),
    ...(request.side === undefined ? {} : { side: request.side }),
    ...(request.pageId === undefined ? {} : { pageId: request.pageId }),
  };

  if (request.pending === true && (request.kind === 'section' || fromFrameId !== undefined)) {
    return { reason: 'pending applies only to a new frame from a url' };
  }
  if (request.kind === 'section') {
    if (url !== undefined || fromFrameId !== undefined) return { reason: 'a section cannot load a URL or copy a browser' };
    const size = { width: request.width ?? CANVAS_SECTION_DEFAULT_BOX.width, height: request.height ?? CANVAS_SECTION_DEFAULT_BOX.height };
    if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) return { reason: 'a section needs a finite, positive size' };
    const landed = resolveLanding(doc, size, placement, { noSuchAnchor: noSuchFrame });
    if ('reason' in landed) return landed;
    return [{ type: 'create', node: { id: mintId(), kind: 'section', name: name ?? '', ...size, ...landed, content: {} } }];
  }

  if (fromFrameId !== undefined) {
    const source = doc.nodes[fromFrameId];
    if (source === undefined) return noSuchFrame(fromFrameId);
    if (!isBrowserNode(source)) return notAFrame(fromFrameId);
    const homeUrl = url === undefined ? source.content.homeUrl : normalizeDevUrl(url);
    if (homeUrl === null) return notNavigable(url ?? '');
    const size = { width: source.width, height: source.height };
    const landed = resolveLanding(doc, size, placement, {
      anchorFallback: source,
      noSuchAnchor: noSuchFrame,
    });
    if ('reason' in landed) return landed;
    return [
      {
        type: 'duplicate',
        node: {
          ...source,
          id: mintId(),
          pageId: landed.pageId,
          name: name ?? `${source.name} copy`,
          x: landed.x,
          y: landed.y,
          order: landed.order,
          provenance: { from: source.id, at },
          content: { homeUrl },
        },
      },
    ];
  }

  if (url === undefined) {
    return { reason: 'create_frame needs either a url or a frame to copy from' };
  }
  const homeUrl = normalizeDevUrl(url);
  if (homeUrl === null) return notNavigable(url);
  const landed = resolveLanding(doc, DEFAULT_FRAME_SIZE, placement, { noSuchAnchor: noSuchFrame });
  if ('reason' in landed) return landed;
  return [
    {
      type: 'create',
      node: {
        id: mintId(),
        pageId: landed.pageId,
        kind: 'browser',
        name: name ?? displayUrl(homeUrl),
        x: landed.x,
        y: landed.y,
        width: DEFAULT_FRAME_SIZE.width,
        height: DEFAULT_FRAME_SIZE.height,
        order: landed.order,
        content: request.pending === true ? { homeUrl: 'about:blank', pendingHomeUrl: homeUrl } : { homeUrl },
      },
    },
  ];
}

function notNavigable(url: string): { reason: string } {
  return { reason: `"${url}" is not a navigable dev address — frames load http(s) only` };
}

export function resolveMoveFrameOps(
  doc: CanvasDoc,
  request: MoveFrameRequest,
): CanvasOp[] | { reason: string } {
  const node = doc.nodes[request.frameId];
  if (node === undefined) return noSuchFrame(request.frameId);
  const givenXY = request.x !== undefined || request.y !== undefined;
  if (request.beside !== undefined && givenXY) return besideConflict();
  let x = request.x ?? node.x;
  let y = request.y ?? node.y;
  if (request.beside !== undefined) {
    const anchor = doc.nodes[request.beside];
    if (anchor === undefined) return noSuchFrame(request.beside);
    const pageId = resolveNodePageId(doc, node);
    if (resolveNodePageId(doc, anchor) !== pageId) return anchorOffPage(anchor);
    const width = request.width ?? node.width;
    const height = request.height ?? node.height;
    const occupied = occupiedOnPage(doc, pageId, node.id);
    const position = placeBeside(rectOf(anchor), { width, height }, occupied, request.side ?? 'right');
    x = position.x;
    y = position.y;
  }
  const hasSize = request.width !== undefined || request.height !== undefined;
  if (!hasSize) {
    if (x === node.x && y === node.y) {
      return { reason: `frame "${node.name}" is already at ${String(x)}, ${String(y)}` };
    }
    return [
      { type: 'move', id: node.id, x, y },
      ...sectionMembersOnPage(Object.values(doc.nodes), node).map((member): CanvasOp => ({
        type: 'move', id: member.id, x: member.x + x - node.x, y: member.y + y - node.y,
      })),
    ];
  }
  const width = request.width ?? node.width;
  const height = request.height ?? node.height;
  if (width <= 0 || height <= 0) {
    return { reason: 'a frame needs a positive width and height' };
  }
  if (x === node.x && y === node.y && width === node.width && height === node.height) {
    return { reason: `frame "${node.name}" already has that position and size` };
  }
  return [{ type: 'resize', id: node.id, x, y, width, height }];
}

export function resolveRenameFrameOps(
  doc: CanvasDoc,
  request: RenameFrameRequest,
): CanvasOp[] | { reason: string } {
  const node = doc.nodes[request.frameId];
  if (node === undefined) return noSuchFrame(request.frameId);
  const name = request.name.trim();
  if (name === '') return { reason: 'a frame name cannot be empty' };
  if (name === node.name) return { reason: `frame "${node.name}" already has that name` };
  return [{ type: 'rename', id: node.id, name }];
}

export interface CreateTextRequest {
  text: string;
  size?: CanvasTextSize;
  width?: number;
  x?: number;
  y?: number;
  /** Mutually exclusive with x/y (ONL-2199). */
  beside?: CanvasNodeId;
  side?: PlacementSide;
  pageId?: CanvasPageId;
}

export interface SetTextRequest {
  textId: CanvasNodeId;
  text: string;
}

export interface CreateImageRequest {
  imageId: string;
  name: string;
  originalWidth: number;
  originalHeight: number;
  alt?: string;
  x?: number;
  y?: number;
  /** Mutually exclusive with x/y (ONL-2199). */
  beside?: CanvasNodeId;
  side?: PlacementSide;
  pageId?: CanvasPageId;
}

function notATextNode(id: CanvasNodeId, kind: CanvasNode['kind']): { reason: string } {
  return {
    reason: `"${id}" is a ${kind} object, not text — list_frames reports every object's kind`,
  };
}

function nextOrderOnPage(doc: CanvasDoc, pageId: CanvasPageId): number {
  return nodesOnPage(doc, pageId).reduce((max, node) => Math.max(max, node.order), -1) + 1;
}

function occupiedOnPage(doc: CanvasDoc, pageId: CanvasPageId, exclude?: CanvasNodeId): Rect[] {
  return nodesOnPage(doc, pageId)
    .filter((node) => node.id !== exclude)
    .map(rectOf);
}

interface PlacementRequest {
  x?: number;
  y?: number;
  beside?: CanvasNodeId;
  side?: PlacementSide;
  pageId?: CanvasPageId;
}

export interface CreateArtifactNodeRequest extends PlacementRequest {
  artifactId: string;
  title: string;
  pagePath: string;
  dimensions?: { width: number; height: number };
}

export function resolveCreateArtifactOps(doc: CanvasDoc, request: CreateArtifactNodeRequest): CanvasOp[] | { reason: string } {
  if (!isArtifactId(request.artifactId)) return { reason: 'use a valid artifact id' };
  const box = request.dimensions ?? CANVAS_ARTIFACT_DEFAULT_BOX;
  const landed = resolveLanding(doc, box, request);
  if ('reason' in landed) return landed;
  return [{ type: 'create', node: {
    id: randomUUID(), kind: 'artifact', name: request.title, ...landed, ...box,
    content: { artifactId: request.artifactId, title: request.title, pagePath: request.pagePath },
  } }];
}

/** Where a new object lands and what it dodges, both read from one page: unfiltered, an agent-placed object avoids nodes the user cannot see (ONL-2488). */
function resolveLanding(
  doc: CanvasDoc,
  size: { width: number; height: number },
  request: PlacementRequest,
  options: {
    anchorFallback?: CanvasNode;
    noSuchAnchor?: (id: CanvasNodeId) => { reason: string };
  } = {},
): { pageId: CanvasPageId; x: number; y: number; order: number } | { reason: string } {
  const given =
    request.x !== undefined && request.y !== undefined ? { x: request.x, y: request.y } : undefined;
  if (request.beside !== undefined && given !== undefined) return besideConflict();
  let anchor = options.anchorFallback;
  if (request.beside !== undefined) {
    anchor = doc.nodes[request.beside];
    if (anchor === undefined) return (options.noSuchAnchor ?? noSuchObject)(request.beside);
  }
  const anchorPageId = anchor === undefined ? undefined : resolveNodePageId(doc, anchor);
  const named = request.pageId;
  if (named !== undefined) {
    const page = doc.pages?.[named];
    if (page === undefined) return noSuchPage(named);
    if (isDividerPage(page)) return dividerPage(page);
    if (anchor !== undefined && anchorPageId !== named) return anchorOffPage(anchor);
  }
  const pageId = named ?? anchorPageId ?? firstRestingPageId(doc);
  const order = nextOrderOnPage(doc, pageId);
  if (given !== undefined) return { pageId, ...given, order };
  if (anchor !== undefined) {
    const side = request.side ?? 'right';
    return { pageId, ...placeBeside(rectOf(anchor), size, occupiedOnPage(doc, pageId), side), order };
  }
  const onPage = nodesOnPage(doc, pageId);
  return {
    pageId,
    ...nextPosition(onPage.map((node) => ({ position: { x: node.x, y: node.y }, width: node.width }))),
    order,
  };
}

/** The default box, not a measurement: an agent cannot measure glyphs, and the renderer corrects it on first layout (ONL-2486). */
export function resolveCreateTextOps(
  doc: CanvasDoc,
  request: CreateTextRequest & { mintId?: () => CanvasNodeId },
): CanvasOp[] | { reason: string } {
  const text = request.text.trim();
  if (text === '') return { reason: 'create_text needs something to write' };
  if (request.width !== undefined && (!Number.isFinite(request.width) || request.width <= 0)) {
    return { reason: 'text width must be a finite positive number' };
  }
  const size = request.size ?? 'medium';
  const box = { ...defaultTextBox(size), ...(request.width === undefined ? {} : { width: request.width }) };
  const landed = resolveLanding(doc, box, request);
  if ('reason' in landed) return landed;
  return [
    {
      type: 'create',
      node: {
        id: (request.mintId ?? randomUUID)(),
        pageId: landed.pageId,
        kind: 'text',
        name: '',
        x: landed.x,
        y: landed.y,
        ...box,
        order: landed.order,
        content: { text, size, ...(request.width === undefined ? {} : { wrapWidth: request.width }) },
      },
    },
  ];
}

export function resolveSetTextOps(
  doc: CanvasDoc,
  request: SetTextRequest,
): CanvasOp[] | { reason: string } {
  const node = doc.nodes[request.textId];
  if (node === undefined) return noSuchObject(request.textId);
  if (node.kind !== 'text') return notATextNode(request.textId, node.kind);
  const text = request.text.trim();
  if (text === '') return { reason: 'set_text needs something to write' };
  if (text === node.content.text) return { reason: `that text already reads "${text}"` };
  const box = defaultTextBox(node.content.size);
  return [{ type: 'set-text', id: node.id, text, ...box, width: node.content.wrapWidth ?? box.width }];
}

export function resolveCreateImageOps(
  doc: CanvasDoc,
  request: CreateImageRequest & { mintId?: () => CanvasNodeId },
): CanvasOp[] | { reason: string } {
  const box = arrivalImageBox(request.originalWidth, request.originalHeight);
  const landed = resolveLanding(doc, box, request);
  if ('reason' in landed) return landed;
  return [
    {
      type: 'create',
      node: {
        id: (request.mintId ?? randomUUID)(),
        pageId: landed.pageId,
        kind: 'image',
        name: request.name,
        x: landed.x,
        y: landed.y,
        ...box,
        order: landed.order,
        content: {
          imageId: request.imageId,
          name: request.name,
          originalWidth: request.originalWidth,
          originalHeight: request.originalHeight,
          ...(request.alt === undefined ? {} : { alt: request.alt }),
        },
      },
    },
  ];
}

export function resolveReorderFrameOps(
  doc: CanvasDoc,
  request: ReorderFrameRequest,
): CanvasOp[] | { reason: string } {
  return resolveStackOps(doc, request.frameId, request.position) ?? noSuchFrame(request.frameId);
}

export function resolveRemoveFrameOps(
  doc: CanvasDoc,
  request: RemoveFrameRequest,
): CanvasOp[] | { reason: string } {
  if (doc.nodes[request.frameId] === undefined) return noSuchFrame(request.frameId);
  return [{ type: 'remove', id: request.frameId }];
}

export function resolveMoveFramesOps(
  doc: CanvasDoc,
  request: MoveFramesRequest,
): CanvasOp[] | { reason: string } {
  const nodes = groupFrames(doc, request.frameIds);
  if (!Array.isArray(nodes)) return nodes;
  if (request.deltaX === 0 && request.deltaY === 0) {
    return { reason: 'move_frames needs a non-zero delta_x or delta_y' };
  }
  const moving = withSectionContentsOnPage(Object.values(doc.nodes), nodes.map((node) => node.id));
  return moving.map((id) => doc.nodes[id]!).map((node) => ({
    type: 'move' as const,
    id: node.id,
    x: node.x + request.deltaX,
    y: node.y + request.deltaY,
  }));
}

/** Blank stays blank: a stored name wins permanently, so a copied label would read " copy" instead of its own words (ONL-2486). */
function copyName(name: string): string {
  return name.trim() === '' ? name : `${name} copy`;
}

export function resolveDuplicateFramesOps(
  doc: CanvasDoc,
  request: DuplicateFramesRequest & {
    mintId?: () => CanvasNodeId;
    at?: string;
  },
): CanvasOp[] | { reason: string } {
  const chosen = groupFrames(doc, request.frameIds);
  if (!Array.isArray(chosen)) return chosen;
  const nodes = withSectionContentsOnPage(Object.values(doc.nodes), chosen.map((node) => node.id)).map((id) => doc.nodes[id]!);
  const mintId = request.mintId ?? randomUUID;
  const at = request.at ?? new Date().toISOString();
  // Each copy lands on its source's page, so both the stack and the dodging stay inside it (ONL-2488).
  const orders = new Map<CanvasPageId, number>();
  const nextOrderFor = (pageId: CanvasPageId): number => {
    const order = orders.get(pageId) ?? nextOrderOnPage(doc, pageId);
    orders.set(pageId, order + 1);
    return order;
  };

  const { offsetX, offsetY } = request;
  const givenOffset = offsetX !== undefined || offsetY !== undefined;
  if (givenOffset && (offsetX === undefined || offsetY === undefined)) {
    return { reason: 'duplicate_frames needs both offset_x and offset_y, or neither' };
  }
  if (!givenOffset && nodes.some((node) => node.kind === 'section')) {
    const left = Math.min(...nodes.map((node) => node.x));
    const right = Math.max(...nodes.map((node) => node.x + node.width));
    return resolveDuplicateFramesOps(doc, { ...request, offsetX: right - left + PLACEMENT_GAP, offsetY: 0 });
  }
  if (givenOffset) {
    return nodes.map((source) => ({
      type: 'duplicate' as const,
      node: {
        ...source,
        id: mintId(),
        name: copyName(source.name),
        x: source.x + (offsetX as number),
        y: source.y + (offsetY as number),
        order: nextOrderFor(resolveNodePageId(doc, source)),
        provenance: { from: source.id, at },
      },
    }));
  }

  // The occupied set grows across the batch so copies never stack (ONL-2043).
  const occupied = new Map<CanvasPageId, Rect[]>();
  return nodes.map((source) => {
    const pageId = resolveNodePageId(doc, source);
    const taken = occupied.get(pageId) ?? occupiedOnPage(doc, pageId);
    occupied.set(pageId, taken);
    const size = { width: source.width, height: source.height };
    const position = placeBeside(rectOf(source), size, taken, 'right');
    taken.push({ ...position, ...size });
    return {
      type: 'duplicate' as const,
      node: {
        ...source,
        id: mintId(),
        name: copyName(source.name),
        x: position.x,
        y: position.y,
        order: nextOrderFor(pageId),
        provenance: { from: source.id, at },
      },
    };
  });
}

export interface CreatePageRequest {
  name: string;
}

export interface RenamePageRequest {
  pageId: CanvasPageId;
  name: string;
}

type PagePosition = 'first' | 'last' | 'earlier' | 'later';

export interface ReorderPageRequest {
  pageId: CanvasPageId;
  position: PagePosition;
}

export interface DeletePageRequest {
  pageId: CanvasPageId;
}

export interface MoveNodesToPageRequest {
  nodeIds: CanvasNodeId[];
  pageId: CanvasPageId;
}

function livePage(doc: CanvasDoc, pageId: CanvasPageId): CanvasPage | { reason: string } {
  const page = doc.pages?.[pageId];
  return page === undefined ? noSuchPage(pageId) : page;
}

export function resolveCreatePageOps(
  doc: CanvasDoc,
  request: CreatePageRequest & { mintId?: () => CanvasPageId },
): CanvasOp[] | { reason: string } {
  const name = request.name.trim();
  if (name === '') return { reason: 'a page name cannot be empty' };
  const order = nextPageOrder(doc);
  return [{ type: 'create-page', page: { id: (request.mintId ?? randomUUID)(), name, order } }];
}

export function resolveRenamePageOps(
  doc: CanvasDoc,
  request: RenamePageRequest,
): CanvasOp[] | { reason: string } {
  const page = livePage(doc, request.pageId);
  if ('reason' in page) return page;
  const name = request.name.trim();
  if (name === '') return { reason: 'a page name cannot be empty' };
  if (name === page.name) return { reason: `page "${page.name}" already has that name` };
  return [{ type: 'rename-page', pageId: page.id, name }];
}

/** The page arithmetic beside `resolveStackOps`: `order` is a field, so a step between two neighbours renumbers nothing (ONL-2488). */
export function resolveReorderPageOps(
  doc: CanvasDoc,
  request: ReorderPageRequest,
): CanvasOp[] | { reason: string } {
  const held = livePage(doc, request.pageId);
  if ('reason' in held) return held;
  const pages = canvasPages(doc);
  const index = pages.findIndex((page) => page.id === request.pageId);
  const down = request.position === 'last' || request.position === 'later';
  if (down ? index === pages.length - 1 : index === 0) {
    return { reason: `page "${held.name}" is already ${down ? 'last' : 'first'}` };
  }
  const first = pages[0] as CanvasPage;
  const last = pages[pages.length - 1] as CanvasPage;
  const step = down ? 1 : -1;
  const neighbour = pages[index + step] as CanvasPage;
  const beyond = pages[index + 2 * step];
  const order =
    request.position === 'last'
      ? last.order + 1
      : request.position === 'first'
        ? first.order - 1
        : beyond === undefined
          ? neighbour.order + step
          : (neighbour.order + beyond.order) / 2;
  return [{ type: 'reorder-page', pageId: held.id, order }];
}

/** The same cascade the panel's delete authors: one `remove` per object, then the page, so one undo brings all of it back (ONL-2488). */
export function resolveDeletePageOps(
  doc: CanvasDoc,
  request: DeletePageRequest,
): CanvasOp[] | { reason: string } {
  const page = livePage(doc, request.pageId);
  if ('reason' in page) return page;
  if (canvasPages(doc).length === 1) {
    return { reason: `page "${page.name}" is the last page — a project keeps one` };
  }
  if (isLastNonDividerPage(doc, page)) {
    return {
      reason: `page "${page.name}" is the last page that is not a divider — a project keeps one`,
    };
  }
  const held = canvasStack(doc, page.id);
  return [
    ...held.map((node) => ({ type: 'remove' as const, id: node.id })),
    { type: 'remove-page' as const, pageId: page.id },
  ];
}

export function resolveMoveNodesToPageOps(
  doc: CanvasDoc,
  request: MoveNodesToPageRequest,
): CanvasOp[] | { reason: string } {
  const page = livePage(doc, request.pageId);
  if ('reason' in page) return page;
  if (isDividerPage(page)) return dividerPage(page);
  const { nodeIds } = request;
  if (nodeIds.length === 0) return { reason: 'choose at least one object' };
  if (nodeIds.length > MAX_CANVAS_OPS_PER_REQUEST) {
    return { reason: `an action may contain at most ${String(MAX_CANVAS_OPS_PER_REQUEST)} objects` };
  }
  if (new Set(nodeIds).size !== nodeIds.length) {
    return { reason: 'object_ids must not contain duplicates' };
  }
  const ops: CanvasOp[] = [];
  for (const id of nodeIds) {
    if (doc.nodes[id] === undefined) return noSuchObject(id);
    ops.push({ type: 'set-node-page', id, pageId: page.id });
  }
  return ops;
}

export function resolveRemoveFramesOps(
  doc: CanvasDoc,
  request: RemoveFramesRequest,
): CanvasOp[] | { reason: string } {
  const nodes = groupFrames(doc, request.frameIds);
  if (!Array.isArray(nodes)) return nodes;
  return nodes.map((node) => ({ type: 'remove' as const, id: node.id }));
}

type PlacementMode = 'beside' | 'coordinates' | 'default';

export interface PlacementReport {
  mode: PlacementMode;
  anchor?: { id: CanvasNodeId; name: string; side: PlacementSide };
  overlaps: { id: CanvasNodeId; name: string }[];
  visible: true | false | 'unknown';
}

/** Read from the node's own page: an overlap with something on another page is not one the user can see (ONL-2488). */
function overlapAndVisibility(
  doc: CanvasDoc,
  id: CanvasNodeId,
  view: ViewRect | undefined,
  excludeIds: ReadonlySet<CanvasNodeId>,
): Pick<PlacementReport, 'overlaps' | 'visible'> {
  const node = doc.nodes[id];
  if (node === undefined) return { overlaps: [], visible: 'unknown' };
  const rect = rectOf(node);
  const others = nodesOnPage(doc, resolveNodePageId(doc, node))
    .filter((other) => other.id !== id && !excludeIds.has(other.id))
    .map((other) => ({ id: other.id, name: other.name, ...rectOf(other) }));
  const overlaps = overlapsOf(rect, others).map((other) => ({ id: other.id, name: other.name }));
  const visible = view === undefined ? 'unknown' : intersects(rect, view);
  return { overlaps, visible };
}

export function createFramePlacement(
  doc: CanvasDoc,
  node: CanvasNode,
  request: CreateFrameRequest,
  view: ViewRect | undefined,
): PlacementReport {
  const given = request.x !== undefined && request.y !== undefined;
  // Copying with no beside and no x/y: the source was the anchor (see `resolveCreateFrameOps`).
  const besideId = request.beside ?? (given ? undefined : request.fromFrameId);
  const anchorNode = besideId === undefined ? undefined : doc.nodes[besideId];
  const mode: PlacementMode = besideId !== undefined ? 'beside' : given ? 'coordinates' : 'default';
  return {
    mode,
    ...(anchorNode
      ? { anchor: { id: anchorNode.id, name: anchorNode.name, side: request.side ?? 'right' } }
      : {}),
    ...overlapAndVisibility(doc, node.id, view, new Set()),
  };
}

export function moveFramePlacement(
  doc: CanvasDoc,
  node: CanvasNode,
  request: MoveFrameRequest,
  view: ViewRect | undefined,
): PlacementReport {
  const anchorNode = request.beside === undefined ? undefined : doc.nodes[request.beside];
  return {
    mode: request.beside !== undefined ? 'beside' : 'coordinates',
    ...(anchorNode
      ? { anchor: { id: anchorNode.id, name: anchorNode.name, side: request.side ?? 'right' } }
      : {}),
    ...overlapAndVisibility(doc, node.id, view, new Set()),
  };
}

export function moveFramesPlacements(
  doc: CanvasDoc,
  nodes: CanvasNode[],
  view: ViewRect | undefined,
): PlacementReport[] {
  const groupIds = new Set(nodes.map((node) => node.id));
  return nodes.map((node) => ({
    mode: 'coordinates' as const,
    ...overlapAndVisibility(doc, node.id, view, groupIds),
  }));
}

export function duplicateFramesPlacements(
  doc: CanvasDoc,
  nodes: CanvasNode[],
  request: DuplicateFramesRequest,
  view: ViewRect | undefined,
): PlacementReport[] {
  const usedDefault = request.offsetX === undefined && request.offsetY === undefined;
  return nodes.map((node) => {
    const sourceId = node.provenance?.from;
    const source = sourceId === undefined ? undefined : doc.nodes[sourceId];
    return {
      mode: usedDefault ? ('beside' as const) : ('coordinates' as const),
      ...(usedDefault && source
        ? { anchor: { id: source.id, name: source.name, side: 'right' as const } }
        : {}),
      ...overlapAndVisibility(doc, node.id, view, new Set()),
    };
  });
}
