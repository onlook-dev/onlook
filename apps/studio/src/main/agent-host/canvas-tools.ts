import { tool, type SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { quoteBriefWords, quoteLiftWords } from '../../instructions/frame-quote.js';
import { frameShownWords } from '../../instructions/frame-shown.js';
import {
  CANVAS_TEXT_SIZES,
  FRAME_QUOTE_MAX_LENGTH,
  MAX_CANVAS_OPS_PER_REQUEST,
  type CanvasTextSize,
  type EvaluateResult,
  type FrameCaptureResult,
} from '@studio/events';
import {
  CLEAR_FRAME_QUOTE_TOOL_NAME,
  CREATE_FRAME_TOOL_NAME,
  CREATE_IMAGE_TOOL_NAME,
  CREATE_PAGE_TOOL_NAME,
  CREATE_TEXT_TOOL_NAME,
  CREATE_SECTION_TOOL_NAME,
  DELETE_PAGE_TOOL_NAME,
  SET_TEXT_TOOL_NAME,
  CAPTURE_FRAME_TOOL_NAME,
  EVALUATE_IN_FRAME_TOOL_NAME,
  LIST_FRAMES_TOOL_NAME,
  READ_FRAME_TOOL_NAME,
  LIST_PAGES_TOOL_NAME,
  MOVE_FRAME_TOOL_NAME,
  MOVE_FRAMES_TOOL_NAME,
  MOVE_NODES_TO_PAGE_TOOL_NAME,
  DUPLICATE_FRAMES_TOOL_NAME,
  REMOVE_FRAME_TOOL_NAME,
  REMOVE_FRAMES_TOOL_NAME,
  RENAME_FRAME_TOOL_NAME,
  RENAME_PAGE_TOOL_NAME,
  REORDER_FRAME_TOOL_NAME,
  REORDER_PAGE_TOOL_NAME,
  REDO_CANVAS_TOOL_NAME,
  UNDO_CANVAS_TOOL_NAME,
} from './tool-names.js';

export type FrameOutcome =
  | { ok: true; node: unknown; placement?: unknown }
  | { ok: false; reason: string };

/** `quoted` answers a `quote` only: false when the object moved is not one that shows a quote. */
type MovedFrameOutcome =
  | { ok: true; node: unknown; placement?: unknown; quoted?: boolean }
  | { ok: false; reason: string };

type RemoveOutcome =
  | { ok: true; removed: { name: string }; frames: unknown[] }
  | { ok: false; reason: string };

export type FramesOutcome =
  | { ok: true; nodes: unknown[]; placements?: unknown[] }
  | { ok: false; reason: string };

type RemoveFramesOutcome =
  | { ok: true; removed: { name: string }[]; frames: unknown[] }
  | { ok: false; reason: string };

type CanvasHistoryOutcome =
  | { ok: true; applied: boolean; frames: unknown[] }
  | { ok: false; reason: string };

export type PageOutcome = { ok: true; page: unknown } | { ok: false; reason: string };

type PageRemovalOutcome =
  | { ok: true; removed: { name: string; objects: number }; pages: unknown[] }
  | { ok: false; reason: string };

type NodesPagedOutcome =
  | { ok: true; page: { id: string; name: string }; nodes: unknown[] }
  | { ok: false; reason: string };

type PlacementSideArg = 'right' | 'below' | 'left' | 'above';

type PagePositionArg = 'first' | 'last' | 'earlier' | 'later';

export interface CanvasToolSinks {
  onListFrames: (request: { pageId?: string }) => Promise<unknown[]>;
  onListPages: () => Promise<unknown[]>;
  onCreatePage: (request: { name: string }) => Promise<PageOutcome>;
  onRenamePage: (request: { pageId: string; name: string }) => Promise<PageOutcome>;
  onReorderPage: (request: { pageId: string; position: PagePositionArg }) => Promise<PageOutcome>;
  onDeletePage: (request: { pageId: string }) => Promise<PageRemovalOutcome>;
  onMoveNodesToPage: (request: {
    nodeIds: string[];
    pageId: string;
  }) => Promise<NodesPagedOutcome>;
  onCreateFrame: (request: {
    kind?: 'section';
    words?: AddingWords;
    width?: number;
    height?: number;
    url?: string;
    name?: string;
    fromFrameId?: string;
    x?: number;
    y?: number;
    beside?: string;
    side?: PlacementSideArg;
    pageId?: string;
    quote?: string;
    pending?: boolean;
  }) => Promise<FrameOutcome>;
  onClearFrameQuote: (request: { frameId: string }) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onMoveFrame: (request: {
    frameId: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    beside?: string;
    side?: PlacementSideArg;
    quote?: string;
  }) => Promise<MovedFrameOutcome>;
  onMoveFrames: (request: { frameIds: string[]; deltaX: number; deltaY: number }) => Promise<FramesOutcome>;
  onDuplicateFrames: (request: {
    frameIds: string[];
    words?: AddingWords;
    offsetX?: number;
    offsetY?: number;
  }) => Promise<FramesOutcome>;
  onRenameFrame: (request: { frameId: string; name: string }) => Promise<FrameOutcome>;
  onReorderFrame: (request: {
    frameId: string;
    position: 'front' | 'back' | 'forward' | 'backward';
  }) => Promise<FrameOutcome>;
  onCreateText: (request: {
    text: string;
    size?: CanvasTextSize;
    width?: number;
    x?: number;
    y?: number;
    beside?: string;
    side?: PlacementSideArg;
    pageId?: string;
  }) => Promise<FrameOutcome>;
  onSetText: (request: { textId: string; text: string }) => Promise<FrameOutcome>;
  onCreateImage: (request: {
    path: string;
    name?: string;
    alt?: string;
    x?: number;
    y?: number;
    beside?: string;
    side?: PlacementSideArg;
    pageId?: string;
  }) => Promise<FrameOutcome>;
  onRemoveFrame: (request: { frameId: string }) => Promise<RemoveOutcome>;
  onRemoveFrames: (request: { frameIds: string[] }) => Promise<RemoveFramesOutcome>;
  onEvaluateInFrame: (request: { frameId: string; script: string }) => Promise<EvaluateResult>;
  onCaptureFrame: (request: { frameId: string }) => Promise<FrameCaptureResult>;
  onReadFrame: (request: { frameId: string; scope: 'view' | 'page' }) => Promise<{ ok: true; text: string } | { ok: false; reason: string }>;
  onUndoCanvas: () => Promise<CanvasHistoryOutcome>;
  onRedoCanvas: () => Promise<CanvasHistoryOutcome>;
}

export const noCanvas = (): Promise<{ ok: false; reason: string }> =>
  Promise.resolve({ ok: false, reason: 'no canvas is attached to this session' });

/** What each sink answers in a session with no canvas: the tool learns its work had nowhere to land, never a success nothing performed. */
export const DETACHED_CANVAS_SINKS: CanvasToolSinks = {
  onListFrames: () => Promise.resolve([]),
  onListPages: () => Promise.resolve([]),
  onCreatePage: noCanvas,
  onRenamePage: noCanvas,
  onReorderPage: noCanvas,
  onDeletePage: noCanvas,
  onMoveNodesToPage: noCanvas,
  onCreateFrame: noCanvas,
  onClearFrameQuote: noCanvas,
  onMoveFrame: noCanvas,
  onMoveFrames: noCanvas,
  onDuplicateFrames: noCanvas,
  onRenameFrame: noCanvas,
  onReorderFrame: noCanvas,
  onCreateText: noCanvas,
  onSetText: noCanvas,
  onCreateImage: noCanvas,
  onRemoveFrame: noCanvas,
  onRemoveFrames: noCanvas,
  onEvaluateInFrame: noCanvas,
  onCaptureFrame: noCanvas,
  onReadFrame: noCanvas,
  onUndoCanvas: noCanvas,
  onRedoCanvas: noCanvas,
};

type CanvasSinkName = keyof CanvasToolSinks;

/** Every canvas sink from one rule; the cast holds only while each sink takes at most one request and answers a promise. */
export function canvasSinksFrom(sink: (name: CanvasSinkName) => (request: never) => Promise<unknown>): CanvasToolSinks {
  const names = Object.keys(DETACHED_CANVAS_SINKS) as CanvasSinkName[];
  return Object.fromEntries(names.map((name) => [name, sink(name)])) as unknown as CanvasToolSinks;
}

type ToolText = { content: { type: 'text'; text: string }[]; isError?: true };
const text = (body: string): ToolText => ({ content: [{ type: 'text' as const, text: body }] });
/** `isError` is what ends the row `failed` on both backends (ONL-2304). */
const failure = (body: string): ToolText => ({ content: [{ type: 'text' as const, text: body }], isError: true });

function overlapNames(placement: unknown): string[] {
  if (typeof placement !== 'object' || placement === null) return [];
  const overlaps = (placement as { overlaps?: unknown }).overlaps;
  if (!Array.isArray(overlaps)) return [];
  return overlaps
    .map((entry) => (typeof entry === 'object' && entry !== null ? (entry as { name?: unknown }).name : undefined))
    .filter((name): name is string => typeof name === 'string');
}

/** Surfaced, not auto-corrected (ONL-2199 §3). */
function overlapWarning(names: string[]): string {
  if (names.length === 0) return '';
  return ` ⚠ It overlaps "${names.join('", "')}". If that was not the point, move it with beside.`;
}

/** The fresh node rides in every mutation result, so the agent needs no read-your-writes; a page answering is never claimed. */
const reported = (outcome: FrameOutcome, did: string, what = 'frame'): ReturnType<typeof text> =>
  outcome.ok
    ? text(
        `${did}. The ${what}, as the canvas now records it: ${JSON.stringify(outcome.node)}` +
          (outcome.placement === undefined
            ? ''
            : ` Placement: ${JSON.stringify(outcome.placement)}.${overlapWarning(overlapNames(outcome.placement))}`),
      )
    : failure(`Onlook declined the request: ${outcome.reason}`);

const frameIdArg = z
  .string()
  .min(1)
  .describe('The frame id, exactly as list_frames reported it.');

const frameIdsArg = z
  .array(frameIdArg)
  .min(1)
  .max(MAX_CANVAS_OPS_PER_REQUEST)
  .refine((ids) => new Set(ids).size === ids.length, 'frame_ids must not contain duplicates')
  .describe(`One to ${MAX_CANVAS_OPS_PER_REQUEST} unique frame ids, in operation order.`);

const besideArg = z
  .string()
  .min(1)
  .optional()
  .describe(
    'The id of a frame to land next to, exactly as list_frames reported it. Not combined with x/y.',
  );

const sideArg = z
  .enum(['right', 'below', 'left', 'above'])
  .optional()
  .describe('Which side of `beside` to land on. Defaults to right.');

const pageIdArg = z
  .string()
  .min(1)
  .describe('The page id, exactly as list_pages reported it.');

const landingPageArg = z
  .string()
  .min(1)
  .optional()
  .describe(
    'The page to put it on, exactly as list_pages reported its id. Omit it and the object lands ' +
      'on the page the user is currently looking at, or — with beside or copy_of — on the page ' +
      'that object lives on. An id naming no page, a divider, or a page other than the anchor’s ' +
      'is refused rather than placed somewhere else.',
  );

const reportedGroup = (outcome: FramesOutcome, did: string): ReturnType<typeof text> =>
  outcome.ok
    ? text(
        `${did}. The frames, as the canvas now records them: ${JSON.stringify(outcome.nodes)}` +
          (outcome.placements === undefined
            ? ''
            : ` Placement: ${JSON.stringify(outcome.placements)}.${overlapWarning(outcome.placements.flatMap(overlapNames))}`),
      )
    : failure(`Onlook declined the request: ${outcome.reason}`);

const remaining = (frames: unknown[]): string =>
  frames.length === 0
    ? 'No frames remain on the canvas.'
    : `The frames that remain, as the canvas now records them: ${JSON.stringify(frames)}`;

/** The tool's own answer for a listing; the diagnostics read answers with this same text (ONL-2297). */
export function agentFramesText(frames: readonly unknown[], pageId?: string): string {
  if (frames.length > 0) return JSON.stringify(frames);
  return pageId === undefined
    ? 'The canvas has no objects on any page. Use create_frame to add one.'
    : `No object is on page "${pageId}". Call list_pages for the pages this project has.`;
}

const listFramesSchema = {
  page_id: z
    .string()
    .min(1)
    .optional()
    .describe('Report only this page’s objects. Omit to report every page.'),
};

export type ListFramesTool = SdkMcpToolDefinition<typeof listFramesSchema>;

export function listFramesTool(onListFrames: CanvasToolSinks['onListFrames']): ListFramesTool {
  return tool(
    LIST_FRAMES_TOOL_NAME,
    'List every object on the Onlook canvas: its `kind` — "browser" for a frame, "text" for ' +
      'words written on the canvas, "image" for a picture beside them — with id, name, position ' +
      'and size, the canvas page it is on, and its stack rank within that canvas page (0 is the ' +
      'back-most object on it; higher paints on top). A frame also reports the address it is ' +
      'homed at, where it has actually navigated to, whether it loaded, its title, any console ' +
      'output since you last looked, and a `pageError` whenever it is showing something ' +
      "other than the site. A `pageError` carries the dev server's error screen — its message, " +
      'and the file when the screen names one — or says the frame rendered nothing at all, or ' +
      'that it could not be read. It is read from the frame’s page itself each time this tool is ' +
      'called, not accumulated, so it disappears on its own once the frame renders again. A ' +
      'frame that loaded reports no `pageError` at all when the site is fine. A text object ' +
      'reports its words, a picture its description. Every canvas page is reported, including ' +
      'the ones the user is not looking at; pass page_id to narrow it to one. A canvas page ' +
      'holding nothing appears here not at all — list_pages is what reports the pages ' +
      'themselves. Call this ' +
      'before any other canvas tool, and again after changing the code — it is how you SEE what ' +
      'the user sees, rather than assuming an edit worked.',
    listFramesSchema,
    async (args) => {
      const frames = await onListFrames(
        args.page_id === undefined ? {} : { pageId: args.page_id },
      );
      return text(agentFramesText(frames, args.page_id));
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'List what is on the canvas',
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
  );
}

const listPagesSchema = {};

export type ListPagesTool = SdkMcpToolDefinition<typeof listPagesSchema>;

/** The only read that sees an empty page, the page order and which page is current (ONL-2488). */
export function listPagesTool(onListPages: CanvasToolSinks['onListPages']): ListPagesTool {
  return tool(
    LIST_PAGES_TOOL_NAME,
    'List this project’s canvas pages, in the order the user sees them: each page’s id, name, ' +
      'how many objects it holds, whether it is a divider (a rule between groups, not a place ' +
      'objects live), and which one the user is currently looking at. You can read and write ' +
      'objects on every page, whichever one that is. Call this before move_nodes_to_page or ' +
      'delete_page, and whenever you need a page a list_frames reading cannot show you — an ' +
      'empty one, or one added since this conversation started.',
    listPagesSchema,
    async () => {
      const pages = await onListPages();
      if (pages.length === 0) {
        return text('Onlook has no canvas open for this project.');
      }
      return text(JSON.stringify(pages));
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'List the canvas pages',
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
  );
}

const reportedPage = (outcome: PageOutcome, did: string): ReturnType<typeof text> =>
  outcome.ok
    ? text(`${did}. The page, as the canvas now records it: ${JSON.stringify(outcome.page)}`)
    : failure(`Onlook declined the request: ${outcome.reason}`);

const createPageSchema = {
  name: z
    .string()
    .min(1)
    .describe(
      'What the page is for, in the user’s words — e.g. "Checkout". Two pages may share a ' +
        'name; the id is what identifies one. The exact text "---" makes a divider instead of ' +
        'a page: a rule the user sees between groups, which holds no objects.',
    ),
};

export type CreatePageTool = SdkMcpToolDefinition<typeof createPageSchema>;

export function createPageTool(onCreatePage: CanvasToolSinks['onCreatePage']): CreatePageTool {
  return tool(
    CREATE_PAGE_TOOL_NAME,
    'Add a page to this project’s canvas, so a separate piece of work gets its own named place ' +
      'rather than crowding what is already on screen. The new page goes last and the user ' +
      'stays where they are — Onlook never moves their view for you, so name the page you used ' +
      'when you report back. The result carries its id; pass that id to the create verbs to put ' +
      'objects on it.',
    createPageSchema,
    async (args) => reportedPage(await onCreatePage({ name: args.name }), 'Onlook added a page'),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Add a page to the canvas',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const renamePageSchema = {
  page_id: pageIdArg,
  name: z
    .string()
    .min(1)
    .describe(
      'What the page should read instead, e.g. "Checkout — mobile". The exact text "---" turns ' +
        'it into a divider; a project keeps at least one page that is not one.',
    ),
};

export type RenamePageTool = SdkMcpToolDefinition<typeof renamePageSchema>;

export function renamePageTool(onRenamePage: CanvasToolSinks['onRenamePage']): RenamePageTool {
  return tool(
    RENAME_PAGE_TOOL_NAME,
    'Rename a canvas page. The name is what the user reads in the page list, so name a page ' +
      'after the work it holds. Renaming it to "---" makes it a divider — the same grouping ' +
      'the user has.',
    renamePageSchema,
    async (args) =>
      reportedPage(
        await onRenamePage({ pageId: args.page_id, name: args.name }),
        'Onlook renamed the page',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Rename a canvas page',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const reorderPageSchema = {
  page_id: pageIdArg,
  position: z
    .enum(['first', 'last', 'earlier', 'later'])
    .describe(
      'first: above every page. last: below every page. earlier/later: past the one page ' +
        'directly above or below it.',
    ),
};

export type ReorderPageTool = SdkMcpToolDefinition<typeof reorderPageSchema>;

export function reorderPageTool(onReorderPage: CanvasToolSinks['onReorderPage']): ReorderPageTool {
  return tool(
    REORDER_PAGE_TOOL_NAME,
    'Change where a page sits in the Onlook page list. It moves nothing on the canvas and the ' +
      'user can undo it. A page you just added goes last; move it where it belongs rather than ' +
      'leaving that to the user.',
    reorderPageSchema,
    async (args) =>
      reportedPage(
        await onReorderPage({ pageId: args.page_id, position: args.position }),
        'Onlook moved the page',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Reorder a canvas page',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const moveNodesToPageSchema = {
  object_ids: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_CANVAS_OPS_PER_REQUEST)
    .refine((ids) => new Set(ids).size === ids.length, 'object_ids must not contain duplicates')
    .describe(`One to ${MAX_CANVAS_OPS_PER_REQUEST} unique object ids, exactly as list_frames reported them.`),
  page_id: pageIdArg,
};

export type MoveNodesToPageTool = SdkMcpToolDefinition<typeof moveNodesToPageSchema>;

export function moveNodesToPageTool(
  onMoveNodesToPage: CanvasToolSinks['onMoveNodesToPage'],
): MoveNodesToPageTool {
  return tool(
    MOVE_NODES_TO_PAGE_TOOL_NAME,
    'Move canvas objects — frames, text, pictures — onto another page, as one action the user ' +
      'undoes in one step. Each object keeps its position and size; only the page it belongs to ' +
      'changes. One id that names no object moves nothing. A divider holds no objects and is ' +
      'refused.',
    moveNodesToPageSchema,
    async (args) => {
      const outcome = await onMoveNodesToPage({ nodeIds: args.object_ids, pageId: args.page_id });
      return outcome.ok
        ? text(
            `Onlook moved those objects to the page "${outcome.page.name}" (id ${outcome.page.id}). ` +
              `They are now, as the canvas records them: ${JSON.stringify(outcome.nodes)}`,
          )
        : failure(`Onlook declined the request: ${outcome.reason}`);
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Move objects to another page',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const deletePageSchema = { page_id: pageIdArg };

export type DeletePageTool = SdkMcpToolDefinition<typeof deletePageSchema>;

/** Gated on both backends: the card is the user's one look at what a delete would take (ONL-2488). */
export function deletePageTool(onDeletePage: CanvasToolSinks['onDeletePage']): DeletePageTool {
  return tool(
    DELETE_PAGE_TOOL_NAME,
    'Delete a canvas page and every object on it. This closes those views — it never deletes ' +
      'any of the user’s code or files, and the user can undo it in one step. To keep the ' +
      'objects, move them with move_nodes_to_page first. A project keeps at least one page.',
    deletePageSchema,
    async (args) => {
      const outcome = await onDeletePage({ pageId: args.page_id });
      return outcome.ok
        ? text(
            `Onlook deleted the page "${outcome.removed.name}" and the ${String(outcome.removed.objects)} ` +
              `object${outcome.removed.objects === 1 ? '' : 's'} on it. The pages that remain: ` +
              `${JSON.stringify(outcome.pages)}`,
          )
        : failure(`Onlook declined the request: ${outcome.reason}`);
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Delete a canvas page',
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
  );
}

interface AddingWords {
  done: string;
}

const shortFrameNameArg = z
  .string()
  .min(1)
  .describe(
    'The page or view the frame shows, in a word or two, as a designer would name it, e.g. "Checkout", ' +
      'or "Checkout mobile" for a variant. No site name, address or id.',
  );

const addingWordsArgs = {
  done: z
    .string()
    .min(1)
    .max(40)
    .describe('The verb for adding the frame, in the past tense, capitalized, e.g. "Added" or "Sketched".'),
};

const ADDED_FRAME_STATUS =
  ' Once your turn ends, Onlook lists each frame you added as one line of finished work, ' +
  '"<done> <frame name>", so give the verb here rather than marking the frame you copied from.';

const createFrameSchema = {
  url: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The address the new frame shows, e.g. http://localhost:5173/pricing. A bare port ' +
        '(5173) or host:port is also accepted. Required unless copy_of is given; passed ' +
        'alongside copy_of it overrides the copied address.',
    ),
  copy_of: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The id of a frame to copy. The copy inherits its size and address, and the canvas ' +
        'records where it came from.',
    ),
  name: z
    .string()
    .min(1)
    .optional()
    .describe('A short human label, e.g. "Pricing". Defaults to the address.'),
  x: z
    .number()
    .optional()
    .describe(
      'Canvas x. Not combined with beside. Omit x, y and beside to let Onlook place the frame ' +
        '— beside its source when copying, otherwise to the right of the rightmost frame.',
    ),
  y: z.number().optional().describe('Canvas y. Only used when x is given too.'),
  beside: besideArg,
  side: sideArg,
  page_id: landingPageArg,
};

const quoteArg = (liftsAtTurnEnd: boolean) => z
  .string()
  .trim()
  .min(1)
  .max(FRAME_QUOTE_MAX_LENGTH)
  .optional()
  .describe(
    `${quoteBriefWords('page', FRAME_QUOTE_MAX_LENGTH)} The new frame shows it ` +
      'while you build the page, so the user sees their idea taken up before anything is built, ' +
      `and Onlook takes it down ${quoteLiftWords(liftsAtTurnEnd)}. ` +
      'Give it when you start building a page whose brief is settled, not before your questions are answered.',
  );

const createSectionSchema = {
  name: z.string().min(1).describe('The section name, for example Venue tile explorations.'),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive().optional(),
  height: z.number().finite().positive().optional(),
  page_id: landingPageArg,
};

export function createSectionTool(onCreateFrame: CanvasToolSinks['onCreateFrame']): SdkMcpToolDefinition<typeof createSectionSchema> {
  return tool(CREATE_SECTION_TOOL_NAME,
    'Add a named section behind objects on the canvas. Enclose frames and artifacts to group them. Moving a section with move_frame or move_frames also moves its enclosed objects. Resizing or removing a section leaves its objects unchanged.',
    createSectionSchema,
    async (args) => reported(await onCreateFrame({ kind: 'section', name: args.name, x: args.x, y: args.y, width: args.width, height: args.height, pageId: args.page_id }), 'Onlook added a section', 'section'),
    { alwaysLoad: true, annotations: { title: 'Add a section', readOnlyHint: false, destructiveHint: false } },
  );
}

const pendingArg = z
  .boolean()
  .optional()
  .describe(
    'True when the app is not running yet, as while you set the project up. The frame waits under its ' +
      'quote, and Onlook points it at the app on whatever port the setup reports, keeping the url’s path. ' +
      'With pending, the quote names the app that will appear here.',
  );

const createFrameStatusSchema = { ...createFrameSchema, name: shortFrameNameArg, ...addingWordsArgs };
const fullCreateFrameSchema = { ...createFrameStatusSchema, quote: quoteArg(true), pending: pendingArg };

export type CreateFrameTool = SdkMcpToolDefinition<typeof fullCreateFrameSchema>;

const CREATE_FRAME_DESCRIPTION =
  'Add a frame to the Onlook canvas, so the user can see another page beside the ' +
  'ones already there. Give a url, or copy_of to duplicate an existing frame. Prefer ' +
  'beside to place it next to a specific frame; give x/y only when the arrangement ' +
  'itself is the point. The result reports whether the new frame overlaps another on the ' +
  'same page and, ' +
  'when Onlook can tell, whether it is currently visible — refer to it by its link ' +
  'afterwards so the user can jump to it either way.';

/** Without `covers`, the agent is offered neither a quote nor a pending frame, as on main (ONL-2960). */
export function createFrameTool(onCreateFrame: CanvasToolSinks['onCreateFrame'], covers = true): CreateFrameTool {
  const schema = {
    ...createFrameStatusSchema,
    ...(covers ? { quote: quoteArg(true), pending: pendingArg } : {}),
  } as typeof fullCreateFrameSchema;
  return tool(
    CREATE_FRAME_TOOL_NAME,
    CREATE_FRAME_DESCRIPTION + ADDED_FRAME_STATUS,
    schema,
    async (args) => {
      const words: AddingWords = { done: args.done };
      const outcome = await onCreateFrame({
        url: args.url,
        name: args.name,
        fromFrameId: args.copy_of,
        x: args.x,
        y: args.y,
        beside: args.beside,
        side: args.side,
        pageId: args.page_id,
        words,
        ...(args.quote === undefined ? {} : { quote: args.quote }),
        ...(args.pending === true ? { pending: true } : {}),
      });
      const reply = reported(outcome, args.copy_of === undefined ? 'Onlook added a frame' : 'Onlook copied the frame');
      if (!outcome.ok) return reply;
      if (args.pending === true) {
        return text(
          `${reply.content[0]?.text ?? ''} It waits for the app, and Onlook points it at the app when run_project_setup succeeds, so add no other frame for it.`,
        );
      }
      if (args.quote === undefined) return reply;
      return text(
        `${reply.content[0]?.text ?? ''} It shows your quote, and Onlook takes it down ${quoteLiftWords(true)}. Build that page in this frame.`,
      );
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Add a frame to the canvas',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const clearFrameQuoteSchema = { frame_id: frameIdArg };

export type ClearFrameQuoteTool = SdkMcpToolDefinition<typeof clearFrameQuoteSchema>;

export function clearFrameQuoteTool(onClearFrameQuote: CanvasToolSinks['onClearFrameQuote']): ClearFrameQuoteTool {
  return tool(
    CLEAR_FRAME_QUOTE_TOOL_NAME,
    'Take down the quote a frame or an artifact shows, when what it describes will not be built ' +
      `there after all. Onlook takes a quote down by itself ${quoteLiftWords(true, 'either')}. ` +
      'frame_id is the canvas id of either, as list_frames reports it: for an artifact, the `id` of ' +
      'its placement, not its `artifactId`.',
    clearFrameQuoteSchema,
    async (args) => {
      const outcome = await onClearFrameQuote({ frameId: args.frame_id });
      return outcome.ok ? text('Onlook took the quote down.') : failure(`Onlook declined the request: ${outcome.reason}`);
    },
    {
      alwaysLoad: true,
      annotations: { title: 'Take down a frame’s or an artifact’s quote', readOnlyHint: false, destructiveHint: false },
    },
  );
}

const moveFrameSchema = {
  frame_id: frameIdArg,
  x: z.number().optional().describe('New canvas x. Not combined with beside. Omit to keep the current one.'),
  y: z.number().optional().describe('New canvas y. Not combined with beside. Omit to keep the current one.'),
  width: z
    .number()
    .positive()
    .optional()
    .describe(
      'New viewport width in px — the site’s area, excluding the frame chrome. Passing a size ' +
        'resizes and moves in one step.',
    ),
  height: z.number().positive().optional().describe('New viewport height in px.'),
  beside: besideArg,
  side: sideArg,
};

const existingFrameQuoteArg = (liftsAtTurnEnd: boolean) => z
  .string()
  .trim()
  .min(1)
  .max(FRAME_QUOTE_MAX_LENGTH)
  .optional()
  .describe(
    `${quoteBriefWords('page', FRAME_QUOTE_MAX_LENGTH)} Give it when you are about to build a page into this ` +
      'frame or artifact: the user then sees the brief over it, not the page half-built, ' +
      `and Onlook takes it down ${quoteLiftWords(liftsAtTurnEnd)}. ` +
      'Give the size the page needs in the same call. Pointing the frame at another address with ' +
      'set_frame_url takes the quote down, so do that first.',
  );

const quotedMoveFrameSchema = { ...moveFrameSchema, quote: existingFrameQuoteArg(true) };

export type MoveFrameTool = SdkMcpToolDefinition<typeof quotedMoveFrameSchema>;

/** Without `quotes`, the agent is not offered a quote on a frame already on the canvas (ONL-2960). */
export function moveFrameTool(onMoveFrame: CanvasToolSinks['onMoveFrame'], quotes = false): MoveFrameTool {
  const schema = (quotes ? { ...moveFrameSchema, quote: existingFrameQuoteArg(true) } : moveFrameSchema) as typeof quotedMoveFrameSchema;
  return tool(
    MOVE_FRAME_TOOL_NAME,
    'Move or resize a frame on the Onlook canvas. Use it to arrange frames the user ' +
      'asked to compare, or to give one a phone-sized viewport. Prefer beside to land next ' +
      'to a specific frame; give x/y only when the arrangement itself is the point — x grows ' +
      'to the right and y grows downward. The result reports whether the frame now overlaps ' +
      'another on the same page.' +
      (quotes ? ' With quote, it also puts the brief of a page you are about to build over the frame.' : ''),
    schema,
    async (args) => {
      const outcome = await onMoveFrame({
        frameId: args.frame_id,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        beside: args.beside,
        side: args.side,
        ...(args.quote === undefined ? {} : { quote: args.quote }),
      });
      const reply = reported(outcome, 'Onlook moved the frame');
      if (!outcome.ok || args.quote === undefined) return reply;
      const said = reply.content[0]?.text ?? '';
      return text(
        outcome.quoted === true
          ? `${said} It shows your quote, and Onlook takes it down ${quoteLiftWords(true)}. Build that page in this frame.`
          : `${said} Onlook put no quote on it: only a frame or an artifact shows one.`,
      );
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Move or resize a frame',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const moveFramesSchema = {
  frame_ids: frameIdsArg,
  delta_x: z.number().describe('Canvas x delta applied to every frame.'),
  delta_y: z.number().describe('Canvas y delta applied to every frame.'),
};

export type MoveFramesTool = SdkMcpToolDefinition<typeof moveFramesSchema>;

export function moveFramesTool(onMoveFrames: CanvasToolSinks['onMoveFrames']): MoveFramesTool {
  return tool(
    MOVE_FRAMES_TOOL_NAME,
    'Move several canvas frames as one atomic action while preserving their relative geometry.',
    moveFramesSchema,
    async (args) =>
      reportedGroup(
        await onMoveFrames({
          frameIds: args.frame_ids,
          deltaX: args.delta_x,
          deltaY: args.delta_y,
        }),
        'Onlook moved the frames',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Move frames as a group',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}


const duplicateFramesSchema = {
  frame_ids: frameIdsArg,
  offset_x: z
    .number()
    .optional()
    .describe('Canvas x offset applied to every copy. Omit both offsets to let Onlook place each copy beside its source.'),
  offset_y: z
    .number()
    .optional()
    .describe('Canvas y offset applied to every copy. Omit both offsets to let Onlook place each copy beside its source.'),
};

const duplicateFramesStatusSchema = { ...duplicateFramesSchema, ...addingWordsArgs };

export type DuplicateFramesTool = SdkMcpToolDefinition<typeof duplicateFramesStatusSchema>;

const DUPLICATE_FRAMES_DESCRIPTION =
  'Duplicate several canvas frames as one atomic action, preserving their relative geometry. ' +
  'Omit offset_x and offset_y to let Onlook place each copy beside its own source; give ' +
  'both only when the arrangement itself is the point.';

const DUPLICATE_FRAMES_ANNOTATIONS = {
  alwaysLoad: true,
  annotations: {
    title: 'Duplicate frames as a group',
    readOnlyHint: false,
    destructiveHint: false,
  },
};

type DuplicateFramesArgs = z.infer<z.ZodObject<typeof duplicateFramesSchema>>;

const duplicateFrames = async (
  onDuplicateFrames: CanvasToolSinks['onDuplicateFrames'],
  args: DuplicateFramesArgs,
  words?: AddingWords,
): Promise<ReturnType<typeof text>> =>
  reportedGroup(
    await onDuplicateFrames({
      frameIds: args.frame_ids,
      offsetX: args.offset_x,
      offsetY: args.offset_y,
      ...(words === undefined ? {} : { words }),
    }),
    'Onlook duplicated the frames',
  );

export function duplicateFramesTool(
  onDuplicateFrames: CanvasToolSinks['onDuplicateFrames'],
): DuplicateFramesTool {
  return tool(
    DUPLICATE_FRAMES_TOOL_NAME,
    DUPLICATE_FRAMES_DESCRIPTION + ADDED_FRAME_STATUS + ' Rename a copy once you know what it will show; its line reads the name.',
    duplicateFramesStatusSchema,
    (args) => duplicateFrames(onDuplicateFrames, args, { done: args.done }),
    DUPLICATE_FRAMES_ANNOTATIONS,
  );
}

const shortFrameNameSchema = {
  frame_id: frameIdArg,
  name: shortFrameNameArg,
};

export type RenameFrameTool = SdkMcpToolDefinition<typeof shortFrameNameSchema>;

export function renameFrameTool(onRenameFrame: CanvasToolSinks['onRenameFrame']): RenameFrameTool {
  return tool(
    RENAME_FRAME_TOOL_NAME,
    'Rename a frame on the Onlook canvas. The name is what the user sees in the frame ' +
      'list, so name frames after what they SHOW rather than after their address. ' +
      'Onlook also reads it inside short status lines, so keep it short.',
    shortFrameNameSchema,
    async (args) =>
      reported(
        await onRenameFrame({ frameId: args.frame_id, name: args.name }),
        'Onlook renamed the frame',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Rename a frame',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const reorderFrameSchema = {
  frame_id: frameIdArg,
  position: z
    .enum(['front', 'back', 'forward', 'backward'])
    .describe(
      'front: above every frame on its own page. back: below every frame on its own page. ' +
        'forward/backward: past the one frame directly above or below it.',
    ),
};

export type ReorderFrameTool = SdkMcpToolDefinition<typeof reorderFrameSchema>;

export function reorderFrameTool(onReorderFrame: CanvasToolSinks['onReorderFrame']): ReorderFrameTool {
  return tool(
    REORDER_FRAME_TOOL_NAME,
    'Change which frame paints on top where frames overlap on the same page of the Onlook canvas ' +
      '(its stacking order). It never moves or resizes the frame, and the user can undo it.',
    reorderFrameSchema,
    async (args) =>
      reported(
        await onReorderFrame({ frameId: args.frame_id, position: args.position }),
        'Onlook restacked the frame',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Restack a frame',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const createTextSchema = {
  text: z
    .string()
    .min(1)
    .describe('The words to place on the canvas, e.g. "Checkout — v2".'),
  size: z
    .enum(CANVAS_TEXT_SIZES)
    .optional()
    .describe('How large the words are. Omit it: medium suits headings and notes alike. Use large only when the user asks for bigger text.'),
  width: z
    .number()
    .finite()
    .positive()
    .optional()
    .describe('Text box width in canvas pixels. Text wraps to fit. Match the frame or available space to avoid overlapping nearby frames. Omit for automatic width up to 480 pixels.'),
  x: z
    .number()
    .optional()
    .describe('Canvas x. Not combined with beside. Omit x, y and beside to let Onlook place it.'),
  y: z.number().optional().describe('Canvas y. Only used when x is given too.'),
  beside: besideArg,
  side: sideArg,
  page_id: landingPageArg,
};

export type CreateTextTool = SdkMcpToolDefinition<typeof createTextSchema>;

/** The text arrives committed: a node in edit mode would take the user's caret mid-turn (ONL-2486). */
export function createTextTool(onCreateText: CanvasToolSinks['onCreateText']): CreateTextTool {
  return tool(
    CREATE_TEXT_TOOL_NAME,
    'Write words directly on the Onlook canvas, so the user can read what a frame or a set of ' +
      'frames IS — a heading over three variants, a note beside the one you changed. It is a ' +
      'label on the canvas, not text in the page: nothing in the user’s code changes. Prefer ' +
      'beside to put it next to the frame it describes; give x/y only when the arrangement ' +
      'itself is the point. The user can edit and undo it.',
    createTextSchema,
    async (args) =>
      reported(
        await onCreateText({
          text: args.text,
          size: args.size,
          width: args.width,
          x: args.x,
          y: args.y,
          beside: args.beside,
          side: args.side,
          pageId: args.page_id,
        }),
        'Onlook wrote that on the canvas',
        'text',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Write words on the canvas',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const setTextSchema = {
  text_id: z
    .string()
    .min(1)
    .describe('The id of a text object, exactly as list_frames reported it — its kind is "text".'),
  text: z.string().min(1).describe('The words it should read instead.'),
};

export type SetTextTool = SdkMcpToolDefinition<typeof setTextSchema>;

export function setTextTool(onSetText: CanvasToolSinks['onSetText']): SetTextTool {
  return tool(
    SET_TEXT_TOOL_NAME,
    'Rewrite the words of a text object on the Onlook canvas. It only works on a text object — ' +
      'to rename a frame use rename_frame, and list_frames reports every object’s kind. The ' +
      'user can undo it.',
    setTextSchema,
    async (args) =>
      reported(
        await onSetText({ textId: args.text_id, text: args.text }),
        'Onlook rewrote that text',
        'text',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Rewrite a text object',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const createImageSchema = {
  path: z
    .string()
    .min(1)
    .describe(
      'A path to an image file on this machine — absolute, or relative to the project ' +
        'directory. PNG, JPEG, GIF or WebP.',
    ),
  name: z
    .string()
    .min(1)
    .optional()
    .describe('A short label for it. Defaults to the file’s own name.'),
  alt: z
    .string()
    .min(1)
    .optional()
    .describe('What the picture shows, for anyone who cannot see it.'),
  x: z
    .number()
    .optional()
    .describe('Canvas x. Not combined with beside. Omit x, y and beside to let Onlook place it.'),
  y: z.number().optional().describe('Canvas y. Only used when x is given too.'),
  beside: besideArg,
  side: sideArg,
  page_id: landingPageArg,
};

export type CreateImageTool = SdkMcpToolDefinition<typeof createImageSchema>;

export function createImageTool(onCreateImage: CanvasToolSinks['onCreateImage']): CreateImageTool {
  return tool(
    CREATE_IMAGE_TOOL_NAME,
    'Put a picture on the Onlook canvas from a file on this machine, so it sits beside the ' +
      'frames as reference — a mockup, an exported design, a screenshot you were pointed at. ' +
      'Onlook copies the bytes into its own store; the file is left where it is and the user’s ' +
      'code is untouched. Prefer beside to put it next to the frame it refers to. A file that ' +
      'cannot be read, or that is not an image Onlook accepts, is refused and adds nothing.',
    createImageSchema,
    async (args) =>
      reported(
        await onCreateImage({
          path: args.path,
          name: args.name,
          alt: args.alt,
          x: args.x,
          y: args.y,
          beside: args.beside,
          side: args.side,
          pageId: args.page_id,
        }),
        'Onlook put the picture on the canvas',
        'picture',
      ),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Put a picture on the canvas',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const removeFrameSchema = { frame_id: frameIdArg };

export type RemoveFrameTool = SdkMcpToolDefinition<typeof removeFrameSchema>;

export function removeFrameTool(onRemoveFrame: CanvasToolSinks['onRemoveFrame']): RemoveFrameTool {
  return tool(
    REMOVE_FRAME_TOOL_NAME,
    'Remove a frame from the Onlook canvas. This only takes it off the canvas — it never deletes any of ' +
      'the user’s code or files, and the user can undo it.',
    removeFrameSchema,
    async (args) => {
      const outcome = await onRemoveFrame({ frameId: args.frame_id });
      return outcome.ok
        ? text(
            `Onlook removed the frame "${outcome.removed.name}" from the canvas. ${remaining(outcome.frames)}`,
          )
        : failure(`Onlook declined the request: ${outcome.reason}`);
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Remove a frame from the canvas',
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
  );
}


const removeFramesSchema = { frame_ids: frameIdsArg };
export type RemoveFramesTool = SdkMcpToolDefinition<typeof removeFramesSchema>;

export function removeFramesTool(onRemoveFrames: CanvasToolSinks['onRemoveFrames']): RemoveFramesTool {
  return tool(
    REMOVE_FRAMES_TOOL_NAME,
    'Remove several frames from the canvas as one atomic action. The user can undo it.',
    removeFramesSchema,
    async (args) => {
      const outcome = await onRemoveFrames({ frameIds: args.frame_ids });
      return outcome.ok
        ? text(
            `Onlook removed these frames from the canvas: ${outcome.removed
              .map((node) => `"${node.name}"`)
              .join(', ')}. ${remaining(outcome.frames)}`,
          )
        : failure(`Onlook declined the request: ${outcome.reason}`);
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Remove frames as a group',
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
  );
}


const canvasHistorySchema = {};
export type CanvasHistoryTool = SdkMcpToolDefinition<typeof canvasHistorySchema>;

function historyResult(
  outcome: CanvasHistoryOutcome,
  verb: 'undo' | 'redo',
): ReturnType<typeof text> {
  if (!outcome.ok) return failure(`Onlook declined the request: ${outcome.reason}`);
  if (!outcome.applied) {
    return text(
      `There is nothing to ${verb} on this canvas. The frames, as the canvas now records them: ${JSON.stringify(outcome.frames)}`,
    );
  }
  const did = verb === 'undo' ? 'undid the last canvas action' : 'redid the last canvas action';
  return text(
    `Onlook ${did}. The frames, as the canvas now records them: ${JSON.stringify(outcome.frames)}`,
  );
}

export function undoCanvasTool(onUndoCanvas: CanvasToolSinks['onUndoCanvas']): CanvasHistoryTool {
  return tool(
    UNDO_CANVAS_TOOL_NAME,
    'Undo the most recent canvas action on the shared session timeline, whether the user or agent made it.',
    canvasHistorySchema,
    async () => historyResult(await onUndoCanvas(), 'undo'),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Undo the last canvas action',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

export function redoCanvasTool(onRedoCanvas: CanvasToolSinks['onRedoCanvas']): CanvasHistoryTool {
  return tool(
    REDO_CANVAS_TOOL_NAME,
    'Redo the most recently undone canvas action on the shared session timeline.',
    canvasHistorySchema,
    async () => historyResult(await onRedoCanvas(), 'redo'),
    {
      alwaysLoad: true,
      annotations: {
        title: 'Redo the last undone canvas action',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const SCRIPT_SCOPE =
  'Scripts share one scope per frame across calls, so a top-level const/let collides with an ' +
  'earlier call — wrap your script in an IIFE: (() => { const el = …; return el.textContent; })()';

const evaluateInFrameSchema = {
  frame_id: frameIdArg,
  script: z
    .string()
    .min(1)
    .describe(
      'JavaScript to evaluate in the page. The value of the last expression is returned as ' +
        'JSON, so end with the thing you want to see — e.g. ' +
        `getComputedStyle(document.querySelector('h1')).color. ${SCRIPT_SCOPE}`,
    ),
};

export type EvaluateInFrameTool = SdkMcpToolDefinition<typeof evaluateInFrameSchema>;

function navigatedWords(url: string): string {
  return `The page navigated while the script ran (a reload or a live reload), so the script's value was lost. ` +
    `It has loaded again at ${url}. Read it with another ${EVALUATE_IN_FRAME_TOOL_NAME} call.`;
}

/** The description names where scripts run: a refusal the model did not see coming reads as a broken tool (ONL-2000). */
export function evaluateInFrameTool(
  onEvaluateInFrame: CanvasToolSinks['onEvaluateInFrame'],
): EvaluateInFrameTool {
  return tool(
    EVALUATE_IN_FRAME_TOOL_NAME,
    'Run JavaScript inside a frame’s page and get the result back, so you can CHECK what ' +
      'actually rendered instead of assuming an edit worked — computed styles, element text, ' +
      'how many rows a list has. Runs in any web page a frame shows, your dev server or another ' +
      'site, and in Artifacts on the Canvas. list_frames shows you where each frame ' +
      'currently is. To put the page in a state and then see it — a moment mid-animation, an ' +
      'open menu, a scrolled position — use capture_frame with setup_script instead, so it is ' +
      'one call. A reload goes in its own call, returning straight away — ' +
      "(() => { location.reload(); return 'reloading'; })() — with the read in the next call.",
    evaluateInFrameSchema,
    async (args) => {
      const outcome = await onEvaluateInFrame({ frameId: args.frame_id, script: args.script });
      if (!outcome.ok) return failure(`Onlook could not run that: ${outcome.reason}`);
      return text('navigatedTo' in outcome ? navigatedWords(outcome.navigatedTo) : outcome.value);
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Run JavaScript in a frame',
        // A script can also change the page, so this cannot claim read-only.
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

const readFrameSchema = {
  frame_id: frameIdArg,
  scope: z
    .enum(['view', 'page'])
    .optional()
    .describe('view, the default, lists what is in view and counts the rest; page lists the whole page, marking what is out of view.'),
};

export type ReadFrameTool = SdkMcpToolDefinition<typeof readFrameSchema>;

export function readFrameTool(onReadFrame: CanvasToolSinks['onReadFrame']): ReadFrameTool {
  return tool(
    READ_FRAME_TOOL_NAME,
    'List what a frame’s page shows as one line per element: its role, its name, and a ref such as ' +
      '[ref=e12]. Lists links, buttons, form fields, headings, named images, cards and the landmarks ' +
      'that hold them, on any page a frame shows. A ref names that element for as long as the page ' +
      'stays loaded, so pass it to suggest_next_tasks to picture the element on a card. An element ' +
      'marked [below], [above], [offscreen] or [partly] is not in view, and a card cannot picture it.',
    readFrameSchema,
    async (args) => {
      const outcome = await onReadFrame({ frameId: args.frame_id, scope: args.scope ?? 'view' });
      if (!outcome.ok) return failure(`Onlook could not read that frame: ${outcome.reason}`);
      return text(outcome.text);
    },
    {
      alwaysLoad: true,
      annotations: { title: 'Read a frame', readOnlyHint: true, destructiveHint: false },
    },
  );
}

const captureFrameSchema = {
  frame_id: frameIdArg,
  setup_script: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional JavaScript Onlook runs in the page first, then captures, so setting up a state ' +
        'and seeing it is one call: pause an animation at a moment, open a menu, scroll to a ' +
        'section. Return a promise to have the capture wait for it. Runs wherever ' +
        `evaluate_in_frame runs. ${SCRIPT_SCOPE}`,
    ),
};

export type CaptureFrameTool = SdkMcpToolDefinition<typeof captureFrameSchema>;

export function captureFrameTool(
  onCaptureFrame: CanvasToolSinks['onCaptureFrame'],
  onEvaluateInFrame: CanvasToolSinks['onEvaluateInFrame'],
  covers = true,
): CaptureFrameTool {
  return tool(
    CAPTURE_FRAME_TOOL_NAME,
    'Take a screenshot of what a frame is currently rendering, so you can SEE the result of ' +
      'a change rather than inferring it from the code. Use it for layout, spacing, overflow ' +
      'and visual regressions — things the DOM will not tell you. Captures whatever page the ' +
      'frame shows: your dev server, a LAN or tailnet address, or an external site. When the ' +
      'page needs to be in a state first, pass setup_script rather than calling ' +
      'evaluate_in_frame before this: the user sees one step instead of two.',
    captureFrameSchema,
    async (args) => {
      const setup =
        args.setup_script === undefined
          ? undefined
          : await onEvaluateInFrame({ frameId: args.frame_id, script: args.setup_script });
      if (setup !== undefined && !setup.ok) {
        return failure(`Onlook did not capture: the setup script could not run: ${setup.reason}`);
      }
      const outcome = await onCaptureFrame({ frameId: args.frame_id });
      const shown = frameShownWords(outcome.shown, CLEAR_FRAME_QUOTE_TOOL_NAME, covers);
      const withShown = (text: string): string => (shown === undefined ? text : `${text} ${shown}`);
      const setupWords = setup === undefined
        ? ''
        : 'navigatedTo' in setup
          ? ` The setup script navigated the page, and it loaded again at ${setup.navigatedTo} before this capture.`
          : ` The setup script ran first and returned ${setup.value}.`;
      if (!outcome.ok) return failure(withShown(`Onlook could not capture that: ${outcome.reason}${setupWords}`));
      return {
        content: [
          { type: 'image' as const, data: outcome.pngBase64, mimeType: 'image/png' },
          {
            type: 'text' as const,
            text: withShown(`Screenshot of frame ${args.frame_id} (PNG, ${String(outcome.pngBase64.length)} base64 chars).${setupWords}`),
          },
        ],
      };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Screenshot a frame',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}
