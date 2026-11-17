/** Minted at create/duplicate only; retarget, rename, and port moves keep it. */
export type CanvasNodeId = string;

export type CanvasDocId = string;

/** Minted at create-page only; a rename, a reorder and a move of its nodes all keep it (ONL-2488). */
export type CanvasPageId = string;

export interface CanvasPage {
  id: CanvasPageId;
  /** Free text, duplicates allowed: identity is the id. A name that trims to `---` renders as a divider. */
  name: string;
  /** A field, never an array index: any finite value, so inserting between two neighbours renumbers nothing. */
  order: number;
}

export interface CanvasNodeProvenance {
  from: CanvasNodeId;
  /** ISO 8601. */
  at: string;
}

export interface CanvasNodeBase {
  id: CanvasNodeId;
  /** Required of every writer; a reader resolves a missing or dangling one through `resolveNodePageId` (ONL-2488). */
  pageId: CanvasPageId;
  name: string;
  x: number;
  y: number;
  /** The viewport; chrome excluded (ONL-1862). */
  width: number;
  height: number;
  order: number;
  provenance?: CanvasNodeProvenance;
}

export interface BrowserContent {
  /** Where the frame mounts and relaunches; in-page navigation does not move it (ONL-1941). */
  homeUrl: string;
  pendingHomeUrl?: string;
}

export interface BrowserNode extends CanvasNodeBase {
  kind: 'browser';
  content: BrowserContent;
}

export const CANVAS_TEXT_SIZES = ['small', 'medium', 'large'] as const;

export type CanvasTextSize = (typeof CANVAS_TEXT_SIZES)[number];

export const isCanvasTextSize = (value: unknown): value is CanvasTextSize =>
  (CANVAS_TEXT_SIZES as readonly unknown[]).includes(value);

export const CANVAS_TEXT_WRAP_WIDTH = 480;

export const CANVAS_TEXT_FONT_SIZES: Readonly<Record<CanvasTextSize, number>> = {
  small: 16,
  medium: 28,
  large: 48,
};

export const CANVAS_TEXT_LINE_HEIGHT = 1.35;

/** The box a fresh text node stores until the renderer measures its content back (ONL-2486). */
export function defaultTextBox(size: CanvasTextSize): { width: number; height: number } {
  return {
    width: CANVAS_TEXT_WRAP_WIDTH,
    height: Math.round(CANVAS_TEXT_FONT_SIZES[size] * CANVAS_TEXT_LINE_HEIGHT),
  };
}

export interface TextContent {
  text: string;
  size: CanvasTextSize;
  wrapWidth?: number;
}

export interface TextNode extends CanvasNodeBase {
  kind: 'text';
  content: TextContent;
}

/** The longest side a picture arrives at, wherever it arrives from: the renderer's ingestion and the agent's tool both size against this one number (ONL-2486). */
export const CANVAS_IMAGE_ARRIVAL_MAX_SIDE = 640;

/** Scales to the arrival cap; an image already inside it is never enlarged. */
export function arrivalImageBox(
  originalWidth: number,
  originalHeight: number,
): { width: number; height: number } {
  const longest = Math.max(originalWidth, originalHeight);
  if (longest <= CANVAS_IMAGE_ARRIVAL_MAX_SIDE) {
    return { width: Math.max(1, Math.round(originalWidth)), height: Math.max(1, Math.round(originalHeight)) };
  }
  const scale = CANVAS_IMAGE_ARRIVAL_MAX_SIDE / longest;
  return {
    width: Math.max(1, Math.round(originalWidth * scale)),
    height: Math.max(1, Math.round(originalHeight * scale)),
  };
}

export interface ImageContent {
  /** The blob store's id: bytes never enter the document (ONL-1881). */
  imageId: string;
  name: string;
  /** The source pixels, kept so restoring the aspect ratio has an original to return to. */
  originalWidth: number;
  originalHeight: number;
  /** Absent and empty are one state: `set-image-alt` with an empty string drops the key. */
  alt?: string;
}

export interface ImageNode extends CanvasNodeBase {
  kind: 'image';
  content: ImageContent;
}

/** The canvas toolbar's armed modes. Here rather than in the renderer because the diagnostics state carries it across the seam (ONL-2568). */
export type CanvasTool = 'select' | 'pan' | 'frame' | 'text' | 'artifact' | 'section';

/** The box a drawn artifact falls back to, and the floor a drag is clamped up to (ONL-2568). */
export const CANVAS_ARTIFACT_DEFAULT_BOX = { width: 480, height: 640 } as const;
export const CANVAS_SECTION_DEFAULT_BOX = { width: 960, height: 720 } as const;

export interface ArtifactContent {
  /** The artifact store's id: bytes never enter the document, and nor does a path (ONL-2568). */
  artifactId: string;
  /** A display copy of the manifest's title, which stays authoritative. */
  title: string;
  pagePath?: string;
}

export interface ArtifactNode extends CanvasNodeBase {
  kind: 'artifact';
  content: ArtifactContent;
}

export interface SectionNode extends CanvasNodeBase {
  kind: 'section';
  content: Record<string, never>;
}

export type CanvasNode = BrowserNode | TextNode | ImageNode | ArtifactNode | SectionNode;

export const isBrowserNode = (node: CanvasNode): node is BrowserNode => node.kind === 'browser';

export const isArtifactNode = (node: CanvasNode): node is ArtifactNode => node.kind === 'artifact';

/** Durable facts only; momentary state (current URL, health, selection, camera) lives outside the document (ONL-1993). */
export interface CanvasDoc {
  schemaVersion: number;
  docId: CanvasDocId;
  /** +1 per accepted op; a gap means a missed update. */
  revision: number;
  pages: Record<CanvasPageId, CanvasPage>;
  nodes: Record<CanvasNodeId, CanvasNode>;
}

export type CanvasOpAuthor = 'user' | 'agent' | 'system';

/** `create`/`duplicate` carry the minted node: the ops channel has no reply. */
export type CanvasOp =
  | { type: 'create'; node: CanvasNode & { provenance?: never } }
  | { type: 'duplicate'; node: CanvasNode & { provenance: CanvasNodeProvenance } }
  | { type: 'move'; id: CanvasNodeId; x: number; y: number }
  | { type: 'resize'; id: CanvasNodeId; x: number; y: number; width: number; height: number; wrapWidth?: number | null }
  | { type: 'rename'; id: CanvasNodeId; name: string }
  /** The node's place in the stack: a higher `order` paints above. Any finite value, so a move between two neighbours needs no renumbering. */
  | { type: 'reorder'; id: CanvasNodeId; order: number }
  | { type: 'set-home-url'; id: CanvasNodeId; homeUrl: string; pendingHomeUrl?: string | null }
  | { type: 'set-text'; id: CanvasNodeId; text: string; width: number; height: number }
  | { type: 'set-text-size'; id: CanvasNodeId; size: CanvasTextSize; width: number; height: number }
  /** An empty string clears the alt. */
  | { type: 'set-image-alt'; id: CanvasNodeId; alt: string }
  | { type: 'remove'; id: CanvasNodeId }
  /** Carries the minted page, like `create`: the ops channel has no reply. */
  | { type: 'create-page'; page: CanvasPage }
  | { type: 'rename-page'; pageId: CanvasPageId; name: string }
  | { type: 'reorder-page'; pageId: CanvasPageId; order: number }
  /** Refused while the page still holds nodes, so a forward batch applies in any order. */
  | { type: 'remove-page'; pageId: CanvasPageId }
  | { type: 'set-node-page'; id: CanvasNodeId; pageId: CanvasPageId };

/** A page id never rides the node arms: sharing `fields.id` would let `invertOp` answer a node op for a page op (ONL-2488). */
export type CanvasOpPrior =
  | { kind: 'none' }
  | { kind: 'node'; node: CanvasNode }
  | {
      kind: 'fields';
      id: CanvasNodeId;
      fields: Partial<Omit<CanvasNodeBase, 'id'>> & {
        homeUrl?: string;
        pendingHomeUrl?: string | null;
        text?: string;
        size?: CanvasTextSize;
        wrapWidth?: number | null;
        alt?: string;
      };
    }
  | { kind: 'page'; page: CanvasPage }
  | { kind: 'page-fields'; pageId: CanvasPageId; fields: Partial<Omit<CanvasPage, 'id'>> };

export interface CanvasOpEntry {
  revision: number;
  author: CanvasOpAuthor;
  /** ISO 8601. */
  at: string;
  batchId?: string;
  op: CanvasOp;
  prior: CanvasOpPrior;
}

/** No author field: main stamps `user` at the boundary. */
interface CanvasOpRequestBase {
  docId: CanvasDocId;
  /** A box the renderer measured back: it applies like any op, but authors no undo entry and clears no redo (ONL-2486). */
  correction?: true;
}

export const MAX_CANVAS_OPS_PER_REQUEST = 1000;

export type CanvasOpRequest = CanvasOpRequestBase &
  (
    | { op: CanvasOp; ops?: never }
    | {
        op?: never;
        ops: CanvasOp[];
      }
  );

/** Only the doc id: the stacks live in main (ONL-2042). */
export interface CanvasUndoRequest {
  docId: CanvasDocId;
}

export interface CanvasSnapshot {
  /** `null`, never a minted empty document: its id would be one the registry never issued. */
  doc: CanvasDoc | null;
  /** Only a view's own snapshot carries it (ONL-2960). */
  quotes?: FrameQuotes;
}

/** Memory only in main: a reopened project or a relaunch shows none (ONL-2960). */
export interface FrameQuotes {
  byFrame: Record<CanvasNodeId, string>;
  /** The quote outranks a frame's covers only while a turn runs (ONL-2960). */
  turnRunning: boolean;
}

export interface CanvasFrameQuotes extends FrameQuotes {
  docId: CanvasDocId;
}

export const NO_FRAME_QUOTES: FrameQuotes = { byFrame: {}, turnRunning: false };

/** The agent writes the quote; a refusal names this limit (ONL-2960). */
export const FRAME_QUOTE_MAX_LENGTH = 160;

export interface CanvasUpdate {
  docId: CanvasDocId;
  entry: CanvasOpEntry;
}

/** The refusals a user has to be told about. The renderer words each one; `reason` beside it is the diagnostic on the log and the agent's result, never the headline (ONL-2488). */
export type CanvasRejectionCode =
  | 'last-page'
  | 'last-non-divider-page'
  | 'page-not-empty'
  | 'no-such-page'
  | 'divider-page';

export interface CanvasRejection {
  docId: CanvasDocId;
  /** Absent where the renderer has no words: the store resyncs and shows nothing, as it did before (ONL-2488). */
  code?: CanvasRejectionCode;
  reason: string;
}

export interface CanvasCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasCameraSave {
  docId: CanvasDocId;
  pageId: CanvasPageId;
  camera: CanvasCamera;
}

/** Its own channel: the camera settles on a gesture, the page changes on a click (ONL-2488). */
export interface CanvasCurrentPageSave {
  docId: CanvasDocId;
  pageId: CanvasPageId;
}

export interface CanvasPageCamerasRequest {
  docId: CanvasDocId;
}

/** A page absent from `byPage` has no remembered camera and opens at the origin, never the outgoing page's pan (ONL-2488). */
export interface CanvasPageCameras {
  byPage: Record<CanvasPageId, CanvasCamera>;
}
