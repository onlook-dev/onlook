import type { Node } from '@xyflow/react';
import { localPort, originForPort, type CanvasTextSize, type FrameHealth } from '@studio/events';
import type { FrameServerCover, FrameShownFacts } from '@studio/events';
import type { FrameLoadFailure } from './frame/loadFailure.js';

export type { FrameHealth } from '@studio/events';

export interface FrameNodeData extends Record<string, unknown> {
  /** The webview's initial `src`, set once and never the current address: where a frame points is `framePointedUrl`, where the guest is `currentUrl` (ONL-1941). */
  homeUrl: string;
  /** The document node's durable label; `title` is the guest's momentary claim. */
  name: string;
  currentUrl: string;
  health: FrameHealth;
  /** A requested navigation, not where the guest is; `seq` keys the consuming effect, so a repeat request for the same URL still fires (ONL-1884). */
  target?: { url: string; seq: number };
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  /** Present exactly when a book entry for the frame's address is not measured live, and then no `<webview>` mounts; `frameServerCover` is its one derivation. */
  serverCover?: FrameServerCover;
  /** The book measures this frame's port live — a load failure is then the page's, never the server's (ONL-2336). */
  serverLive?: boolean;
  /** The book reads this frame's server as starting (ONL-2960). */
  serverStarting?: boolean;
  loadFailure?: FrameLoadFailure;
  /** Bumped exactly when a server cover lifts, so the new element's effects re-bind; `mountNonce` (ONL-1922) stays put at a revival. */
  guestEpoch?: number;
  /** Ephemeral and main-owned, cleared at the turn's end; absent means `false` (ONL-2194). */
  working?: boolean;
  /** Main's, until it lifts (ONL-2960). */
  quote?: string;
  /** Whether the turn that placed or kept the quote is still running (ONL-2960). */
  quoteTurnRunning?: boolean;
}

export const FRAME_NODE_TYPE = 'frame';

export type FrameNode = Node<FrameNodeData, typeof FRAME_NODE_TYPE>;

export interface TextNodeData extends Record<string, unknown> {
  text: string;
  size: CanvasTextSize;
  /** The document node's durable label, as on a frame. */
  name: string;
}

export const TEXT_NODE_TYPE = 'text';

export type TextFlowNode = Node<TextNodeData, typeof TEXT_NODE_TYPE>;

export interface ImageNodeData extends Record<string, unknown> {
  imageId: string;
  name: string;
  alt?: string;
  originalWidth: number;
  originalHeight: number;
}

export const IMAGE_NODE_TYPE = 'image';

export type ImageFlowNode = Node<ImageNodeData, typeof IMAGE_NODE_TYPE>;

export interface ArtifactNodeData extends Record<string, unknown> {
  artifactId: string;
  pagePath?: string;
  /** A display copy; the manifest's title is authoritative (ONL-2568). */
  title: string;
  name: string;
  /** Main's, until it lifts (ONL-2960). */
  quote?: string;
  quoteTurnRunning?: boolean;
}

export const ARTIFACT_NODE_TYPE = 'artifact';

export type ArtifactFlowNode = Node<ArtifactNodeData, typeof ARTIFACT_NODE_TYPE>;

export const SECTION_NODE_TYPE = 'section';

interface SectionNodeData extends Record<string, unknown> {
  name: string;
}

export type SectionFlowNode = Node<SectionNodeData, typeof SECTION_NODE_TYPE>;

export type CanvasFlowNode = FrameNode | TextFlowNode | ImageFlowNode | ArtifactFlowNode | SectionFlowNode;

export const isFrameFlowNode = (node: CanvasFlowNode): node is FrameNode =>
  node.type === FRAME_NODE_TYPE;

export const isArtifactFlowNode = (node: CanvasFlowNode): node is ArtifactFlowNode =>
  node.type === ARTIFACT_NODE_TYPE;

/** The canvas holds other kinds (ONL-2486). */
export const frameFlowNodes = (nodes: readonly CanvasFlowNode[]): FrameNode[] =>
  nodes.filter(isFrameFlowNode);

export function liveFramePorts(nodes: readonly CanvasFlowNode[]): number[] {
  const ports = new Set<number>();
  for (const frame of frameFlowNodes(nodes)) {
    if (frame.data.health !== 'live' || frame.data.serverCover !== undefined) continue;
    const port = localPort(frame.data.currentUrl);
    if (port !== null) ports.add(port);
  }
  return [...ports].sort((a, b) => a - b);
}

/** A viewport size: the browser bar hangs outside the node's layout box (ONL-1862). */
export const MIN_FRAME_SIZE = { width: 320, height: 240 } as const;

/** Bounds the resize controls only; the reducer accepts agent-authored sizes unchanged. Shared with the image node, whose ceiling is the canvas's own. */
export const MAX_FRAME_SIZE = { width: 8192, height: 8192 } as const;

/** A picture has no content to collapse, so its floor is only what keeps a grab target reachable (ONL-2486). */
export const MIN_IMAGE_SIZE = { width: 8, height: 8 } as const;

/** Yields to an undersized frame: the library's resize min-clamp subtracts the deficit and collapses the other axis, and ops and the agent's create tool are not schema-clamped. */
export function resizeFloor(floor: number, current: number | undefined): number {
  return Math.min(floor, current ?? floor);
}

/** `resizeFloor`'s mirror: an oversized frame can only shrink. */
export function resizeCeiling(ceiling: number, current: number | undefined): number {
  return Math.max(ceiling, current ?? ceiling);
}

/** Screen px: the store holds no live zoom, so a flow-distance test misclassifies at low zoom. */
export const FRAME_DRAW_CLICK_THRESHOLD = 4;

export interface FrameDrawGesture {
  anchor: { x: number; y: number };
  cursor: { x: number; y: number };
  screenAnchor: { x: number; y: number };
  screenCursor: { x: number; y: number };
}

function clampAxis(value: number, floor: number, ceiling: number): number {
  return Math.min(Math.max(value, floor), ceiling);
}

/** Clamped here, not at release, so the preview and the readout never show a size the created frame won't get. */
export function frameDrawBox(
  draw: FrameDrawGesture,
): { x: number; y: number; width: number; height: number } | null {
  const screenDistance = Math.hypot(
    draw.screenCursor.x - draw.screenAnchor.x,
    draw.screenCursor.y - draw.screenAnchor.y,
  );
  if (screenDistance <= FRAME_DRAW_CLICK_THRESHOLD) return null;
  return {
    x: Math.min(draw.anchor.x, draw.cursor.x),
    y: Math.min(draw.anchor.y, draw.cursor.y),
    width: clampAxis(
      Math.abs(draw.cursor.x - draw.anchor.x),
      MIN_FRAME_SIZE.width,
      MAX_FRAME_SIZE.width,
    ),
    height: clampAxis(
      Math.abs(draw.cursor.y - draw.anchor.y),
      MIN_FRAME_SIZE.height,
      MAX_FRAME_SIZE.height,
    ),
  };
}

/** Origin only: a drawn frame opens at the project's front door. */
export function newFrameUrl(firstHomeUrl: string | undefined, livePort: number | null): string {
  if (firstHomeUrl !== undefined) {
    try {
      const url = new URL(firstHomeUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
      if (url.href === 'about:blank') return url.href;
    } catch {
      // An unparseable home falls through to the port chain.
    }
  }
  if (livePort !== null) return originForPort(livePort);
  return 'about:blank';
}

/** Covering a frame that shows a remote site because a local dev server died is the lie this stops. */
export function isAtLocalPort(currentUrl: string, port: number): boolean {
  return localPort(currentUrl) === port;
}

export function frameShownFacts(data: FrameNodeData): FrameShownFacts {
  return {
    health: data.health,
    cover: data.serverCover,
    serverLive: data.serverLive === true,
    serverStarting: data.serverStarting === true,
    loadFailed: data.loadFailure !== undefined,
    quote: data.quote,
    turnRunning: data.quoteTurnRunning === true,
  };
}

/** The pending target wins: a retarget in flight has not reached the guest, so `currentUrl` alone is stale. */
export function framePointedUrl(data: { target?: { url: string }; currentUrl: string }): string {
  return data.target?.url ?? data.currentUrl;
}

/** What recovery acts on: a navigation in flight, else the local page `did-fail-load` named — a third party a redirect died on is not Restart's to fix — else where the guest sits (ONL-2897). */
export function frameRecoveryUrl(data: {
  target?: { url: string };
  loadFailure?: { url: string };
  currentUrl: string;
}): string {
  const failed = data.loadFailure?.url;
  return data.target?.url ?? (failed !== undefined && localPort(failed) !== null ? failed : data.currentUrl);
}

export function framePointedUrls(nodes: readonly CanvasFlowNode[]): string[] {
  return frameFlowNodes(nodes).map((node) => framePointedUrl(node.data));
}

/** Also `zoomAboutCanvasPoint`'s clamp: a hand-copied range stops the relayed pinch at the old ceiling. */
export const ZOOM_BOUNDS = { min: 0.05, max: 4 } as const;

/** Shares `localPort` with frame following, so the chat's link routing and the canvas agree on local. */
export function isLocalUrl(url: string): boolean {
  return localPort(url) !== null;
}
