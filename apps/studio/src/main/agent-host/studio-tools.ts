import {
  createSdkMcpServer,
  tool,
  type McpSdkServerConfigWithInstance,
  type SdkMcpToolDefinition,
} from '@anthropic-ai/claude-agent-sdk';
import { isBrowserNode, MAX_NEXT_TASK_LINE, MAX_NEXT_TASK_TITLE, MAX_NEXT_TASKS, MAX_NEXT_TASK_SKETCH_SHAPES, NEXT_TASK_SKELETONS, NEXT_TASK_SKETCH_BOX, NEXT_TASK_SKETCH_KINDS, nextTaskPicturesLine, nextTaskSketchOf, renamedProjectResult, SERVER_RUNNING_ALREADY_SHOWN, SERVER_RUNNING_PLACED, type BrowserNode, type CanvasNode, type NextTask, type NextTaskPicture } from '@studio/events';
import { z } from 'zod';
import type { FramePicture, PictureMiss, PictureTarget } from '../canvas/clip.js';
import { flagOn } from '../flags/index.js';
import {
  captureFrameTool,
  clearFrameQuoteTool,
  createFrameTool,
  createImageTool,
  createPageTool,
  createSectionTool,
  createTextTool,
  deletePageTool,
  duplicateFramesTool,
  evaluateInFrameTool,
  listFramesTool,
  listPagesTool,
  moveFrameTool,
  moveFramesTool,
  moveNodesToPageTool,
  readFrameTool,
  redoCanvasTool,
  removeFrameTool,
  removeFramesTool,
  renameFrameTool,
  renamePageTool,
  reorderFrameTool,
  reorderPageTool,
  setTextTool,
  undoCanvasTool,
  type CanvasToolSinks,
} from './canvas-tools.js';
import { artifactTools, type ArtifactToolReport } from './artifact-tools.js';
import { projectSetupTools, type ProjectSetupToolSinks } from './project-setup-tools.js';
import type { FrameChangeWords } from './working-frames.js';
import { deleteProjectFileTool, type DeleteProjectFileReport } from './delete-project-file.js';
import {
  ARTIFACT_TOOL_NAMES,
  CAPTURE_FRAME_TOOL_NAME,
  CLEAR_FRAME_QUOTE_TOOL_NAME,
  CREATE_FRAME_TOOL_NAME,
  CREATE_IMAGE_TOOL_NAME,
  CREATE_PAGE_TOOL_NAME,
  CREATE_PROJECT_TAB_TOOL_NAME,
  CREATE_SECTION_TOOL_NAME,
  CREATE_TEXT_TOOL_NAME,
  DELETE_PAGE_TOOL_NAME,
  DELETE_PROJECT_FILE_TOOL_NAME,
  DUPLICATE_FRAMES_TOOL_NAME,
  EVALUATE_IN_FRAME_TOOL_NAME,
  FRAME_WORKING_TOOL_NAME,
  LIST_FRAMES_TOOL_NAME,
  LIST_PAGES_TOOL_NAME,
  MOVE_FRAME_TOOL_NAME,
  MOVE_FRAMES_TOOL_NAME,
  MOVE_NODES_TO_PAGE_TOOL_NAME,
  PROJECT_SETUP_TOOL_NAMES,
  READ_FRAME_TOOL_NAME,
  REDO_CANVAS_TOOL_NAME,
  REMOVE_FRAME_TOOL_NAME,
  REMOVE_FRAMES_TOOL_NAME,
  RENAME_FRAME_TOOL_NAME,
  RENAME_PAGE_TOOL_NAME,
  REORDER_FRAME_TOOL_NAME,
  REORDER_PAGE_TOOL_NAME,
  SAVE_ATTACHMENT_TOOL_NAME,
  SET_TEXT_TOOL_NAME,
  UNDO_CANVAS_TOOL_NAME,
  WAITING_ON_TOOL_NAME,
  RENAME_PROJECT_TOOL_NAME,
  SERVER_RUNNING_TOOL_NAME,
  SET_FRAME_URL_TOOL_NAME,
  STUDIO_MCP_SERVER,
  SUGGEST_NEXT_TASKS_TOOL_NAME,
  type StudioToolName,
} from './tool-names.js';

// Silent when wrong (0.3.220): without `alwaysLoad` tool search defers the schema and the model never sees the tool; `destructiveHint` unset is TRUE; a tool missing from `STUDIO_AUTO_APPROVED_TOOLS` earns an approval card.

export { SERVER_RUNNING_TOOL_NAME, FRAME_WORKING_TOOL_NAME, WAITING_ON_TOOL_NAME, STUDIO_MCP_SERVER };

/** Structurally `FirstFrameAnswer`, redeclared so this file imports only the SDK and the vocabulary. */
type ServerRunningFrame =
  | { kind: 'placed'; node: BrowserNode }
  | { kind: 'already-shown'; node: BrowserNode }
  | { kind: 'not-placed'; reason: string }
  | { kind: 'no-setup' };

interface ServerRunningAck {
  retiringStarterPort?: number;
  frame?: ServerRunningFrame;
}
export type ServerRunningReport = (
  port?: number,
  cwd?: string,
) => ServerRunningAck | void | Promise<ServerRunningAck | void>;

function frameSentence(frame: ServerRunningFrame | undefined): string {
  switch (frame?.kind) {
    case 'placed':
      return ` ${SERVER_RUNNING_PLACED} in a new frame "${frame.node.name}" (id ${frame.node.id}) at ${frame.node.content.homeUrl}.`;
    case 'already-shown':
      return ` ${SERVER_RUNNING_ALREADY_SHOWN}: frame "${frame.node.name}" (id ${frame.node.id}) shows ${frame.node.content.homeUrl}, so Onlook added none.`;
    case 'not-placed':
      return ` Onlook did not put the app on the canvas: ${frame.reason}.`;
    default:
      return ' Onlook did not put the app on the canvas for this report.';
  }
}

/** Structurally `AgentFrameUrlOutcome`, redeclared so this file imports only the SDK and the vocabulary. */
export type FrameUrlOutcome =
  | { ok: true; node: CanvasNode }
  | { ok: false; reason: string };

export type FrameUrlReport = (frameId: string, url: string) => Promise<FrameUrlOutcome>;

// Typed, not `{}`: an empty schema is legal and strips the argument.
const serverRunningSchema = {
  port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .optional()
    .describe(
      'The TCP port the development server is listening on, e.g. 3000. ' +
        'Omit only if it genuinely cannot be determined.',
    ),
  cwd: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The directory the server was started in, if it is not the project root — e.g. ' +
        'apps/web in a monorepo. Relative to the project, or absolute inside it.',
    ),
};

export type ServerRunningTool = SdkMcpToolDefinition<typeof serverRunningSchema>;

/** A factory, not a constant: a module-level tool would keep reporting into a torn-down session. */
export function serverRunningTool(onServerRunning: ServerRunningReport): ServerRunningTool {
  return tool(
    SERVER_RUNNING_TOOL_NAME,
    "Tell Onlook that this project's development server is now running, so the app " +
      'can show it as started. Call this once the server has actually bound its port — not ' +
      'when you have merely launched the command. Always pass the port it is listening on ' +
      'when you know it; Onlook verifies the port itself and will show nothing as running ' +
      'until something answers there. If you started it somewhere other than the project ' +
      'root — an app directory in a monorepo — pass that directory as cwd, so Onlook can ' +
      "tell two servers in one project apart. If Onlook's own starter page is still " +
      'running for this project, reporting a different port retires it. The reply says ' +
      'whether Onlook put the app on the canvas.',
    serverRunningSchema,
    async (args) => {
      const ack = (await onServerRunning(args.port, args.cwd)) ?? {};
      // What Studio will do, never a confirmation: the port is unchecked and the retirement may fail (ONL-2152).
      const checking =
        args.port === undefined
          ? 'is checking the default development port'
          : `is checking port ${String(args.port)}`;
      const retiring =
        ack.retiringStarterPort === undefined
          ? ''
          : `, is retiring its starter page on port ${String(ack.retiringStarterPort)},`;
      return {
        content: [
          {
            type: 'text' as const,
            text: `Onlook noted the report${retiring} and ${checking}.${frameSentence(ack.frame)}`,
          },
        ],
      };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Report that the development server is running',
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
  );
}

const setFrameUrlSchema = {
  frame_id: z
    .string()
    .min(1)
    .describe('The frame to point somewhere else, exactly as list_frames reported its id.'),
  url: z
    .string()
    .min(1)
    .describe(
      'The address to show, e.g. http://localhost:5173. A bare port (5173) or a ' +
        'host:port (localhost:5173) is also accepted.',
    ),
};

export type SetFrameUrlTool = SdkMcpToolDefinition<typeof setFrameUrlSchema>;

export function setFrameUrlTool(onFrameUrl: FrameUrlReport): SetFrameUrlTool {
  return tool(
    SET_FRAME_URL_TOOL_NAME,
    'Point one frame on the Onlook canvas at a URL, so the user sees this page in it. ' +
      'Call this whenever the development server is running somewhere other than where a ' +
      'frame is currently pointed — most often because it bound a different port than the ' +
      'default — or when the user asks to see a particular page in a frame they already ' +
      'have. Call list_frames first if you do not know the frame id; to add a frame rather ' +
      'than move one, use create_frame.',
    setFrameUrlSchema,
    async (args) => {
      const outcome = await onFrameUrl(args.frame_id, args.url);
      const homeUrl = outcome.ok && isBrowserNode(outcome.node) ? outcome.node.content.homeUrl : args.url;
      const text = !outcome.ok
        ? `Onlook declined the request: ${outcome.reason}`
        : `Onlook set the frame's home address to ${homeUrl} and is ` +
          `navigating there — whether the page answers is not yet known. The frame, as the ` +
          `canvas now records it: ${JSON.stringify(outcome.node)}`;
      // `isError` is what ends the row failed on both backends (ONL-2304).
      return { content: [{ type: 'text' as const, text }], ...(outcome.ok ? {} : { isError: true as const }) };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: "Point Onlook's canvas at a URL",
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

export type FrameWorkingReport = (frameId: string, words?: FrameChangeWords) => void;

const frameStatusSchema = {
  frame_id: z
    .string()
    .min(1)
    .describe('The frame you are about to change, exactly as list_frames reported its id.'),
  done: z
    .string()
    .min(1)
    .max(40)
    .describe('The verb for this change once it is made, in the past tense, capitalized, e.g. "Recolored".'),
  what: z
    .string()
    .min(1)
    .max(60)
    .describe(
      'The thing on the page this change acts on, in a few words with no article, named the way a designer ' +
        'looking at the page would name it. It reads mid-sentence, so lowercase unless it is a name, e.g. "signup button". ' +
        'Never a tag, selector, class, component or file name.',
    ),
};

export type FrameStatusTool = SdkMcpToolDefinition<typeof frameStatusSchema>;

export function frameStatusTool(onFrameWorking: FrameWorkingReport): FrameStatusTool {
  return tool(
    FRAME_WORKING_TOOL_NAME,
    'Tell Onlook which frame you are about to change and what you are changing on it. While you work, the user ' +
      'sees that frame marked as in progress on the canvas. Once your turn ends, Onlook lists what you finished, ' +
      'one line per frame read at a glance: "<done> <frame name>’s <what>". Call it right ' +
      'before each change to what a frame shows, not after, and again for each separate change on the same frame. ' +
      'Nothing else depends on the result.',
    frameStatusSchema,
    async (args) => {
      onFrameWorking(args.frame_id, { done: args.done, what: args.what });
      return { content: [{ type: 'text' as const, text: 'Noted.' }] };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Say what you are changing on a frame',
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
  );
}

export type WaitingOnReport = (what: string) => void;

const waitingOnSchema = {
  what: z
    .string()
    .min(1)
    .max(80)
    .describe(
      'What you need from the user, in a few words a designer reads at a glance, lowercase, e.g. "a color for ' +
        'the signup button". Onlook shows it as "Waiting on <what>". Never a tag, selector, class, component or file name.',
    ),
};

export type WaitingOnTool = SdkMcpToolDefinition<typeof waitingOnSchema>;

export function waitingOnTool(onWaitingOn: WaitingOnReport): WaitingOnTool {
  return tool(
    WAITING_ON_TOOL_NAME,
    'Tell Onlook what you need from the user, right before you ask them a question, so the status the user ' +
      'sees says what you are waiting on while your question waits for them. Nothing else depends on the result.',
    waitingOnSchema,
    async (args) => {
      onWaitingOn(args.what);
      return { content: [{ type: 'text' as const, text: 'Noted.' }] };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Say what you are waiting on',
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
  );
}

/** Structurally `RenameProjectOutcome` in `main/workspace/rename.ts`, redeclared for the same reason as `FrameUrlOutcome`. */
type RenameProjectOutcome =
  | { ok: true; name: string; branchName: string }
  | { ok: false; reason: string };

export type RenameProjectReport = (name: string) => Promise<RenameProjectOutcome>;

const renameProjectSchema = {
  name: z
    .string()
    .describe(
      'The name, at most three words, derived from what the user asked for — e.g. ' +
        '"Pricing Page" or "Portfolio Redesign". Longer names are cut to three words.',
    ),
};

export type RenameProjectTool = SdkMcpToolDefinition<typeof renameProjectSchema>;

export function renameProjectTool(onRenameProject: RenameProjectReport): RenameProjectTool {
  return tool(
    RENAME_PROJECT_TOOL_NAME,
    "Name this project in Onlook's project list and tab, and move its git branch to match. " +
      'Call it once, when a project has no name yet and you are told to name it; a project the ' +
      'user has named, or that was named already, keeps its name and the call is skipped. ' +
      'The name is at most three words.',
    renameProjectSchema,
    async (args) => {
      const outcome = await onRenameProject(args.name);
      const text = outcome.ok
        ? renamedProjectResult(outcome.name)
        : `Rename skipped: ${outcome.reason}`;
      return { content: [{ type: 'text' as const, text }] };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Name the project',
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
  );
}

/** Both come from the landing, never the probe plan: the cut re-draws the name (ONL-2212). */
export type CreateProjectTabOutcome =
  | { ok: true; workspaceName: string; link: string }
  | { ok: false; reason: string };

export type CreateProjectTabReport = () => Promise<CreateProjectTabOutcome>;

/** Deliberately empty: the sink resolves the repo from the session's own project, so the agent cannot reach another repo; naming is `rename_project`'s job (ONL-2212). */
const createProjectTabSchema = {};

export type CreateProjectTabTool = SdkMcpToolDefinition<typeof createProjectTabSchema>;

export function createProjectTabTool(onCreateProjectTab: CreateProjectTabReport): CreateProjectTabTool {
  return tool(
    CREATE_PROJECT_TAB_TOOL_NAME,
    'Open a second project in a new Onlook tab: another isolated copy of this repository, in ' +
      'the same workspace as this project, so work can go on in parallel without touching what ' +
      'is on screen. Takes no arguments: the repository is this project\'s own. The tab opens in ' +
      'the background and the conversation ' +
      'stays where it is. The result carries a link to the new tab — refer to it by that link so ' +
      'the user can jump to it. To name the new project, call rename_project from its own session. ' +
      'If the repository cannot be isolated the result says why; there is no other way to open one.',
    createProjectTabSchema,
    async () => {
      const outcome = await onCreateProjectTab();
      // `isError` is what ends the row failed on both backends (ONL-2304).
      if (!outcome.ok) {
        return {
          content: [{ type: 'text' as const, text: `Onlook could not open a new project tab: ${outcome.reason}` }],
          isError: true as const,
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Onlook opened "${outcome.workspaceName}" in a background tab. ` +
              `Refer to it as ${outcome.link}. Its setup may still be running.`,
          },
        ],
      };
    },
    {
      alwaysLoad: true,
      annotations: {
        title: 'Open a project in a new tab',
        readOnlyHint: false,
        // Additive, like `create_frame`; the MCP default is true.
        destructiveHint: false,
      },
    },
  );
}

export type NextTasksReport = (tasks: readonly NextTask[]) => void;

const nextTaskTitle = z
  .string()
  .min(1)
  .max(MAX_NEXT_TASK_TITLE)
  .describe('The task in about four words, as the user would ask for it, e.g. "Tighten the hero spacing".');
const nextTaskLine = z
  .string()
  .min(1)
  .max(MAX_NEXT_TASK_LINE)
  .describe('One short line under the title with the detail it leaves out: what changes, and where.');

const nextTaskPicture = z
  .object({
    frame_id: z
      .string()
      .min(1)
      .optional()
      .describe('The frame, from list_frames, showing the page this task changes or starts from, local or any other site. Onlook clips its picture for the card from it, and shows the whole frame when it cannot clip the element.'),
    ref: z
      .string()
      .regex(/^e[1-9][0-9]*$/)
      .optional()
      .describe(
        `The element this task changes or starts from, by its ref from ${READ_FRAME_TOOL_NAME} on this frame, such as e12; pick one in view. ` +
          "Used only to picture it; the title and line stay in the user's words, never the ref or an element name.",
      ),
    selector: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe(
        `A CSS selector for the element, only when ${READ_FRAME_TOOL_NAME} gave it no ref; give a ref or a selector, not both. ` +
          'Leave both out to picture the whole frame.',
      ),
    skeleton: z
      .enum(NEXT_TASK_SKELETONS)
      .optional()
      .describe(
        'A sketch Onlook draws when there is no frame to clip, or when the clip fails: button for a control, row for ' +
          'a set of items side by side, story for text beside an image.',
      ),
  })
  .strict();

const sketchCoordinate = (edge: string) =>
  z.number().min(0).max(NEXT_TASK_SKETCH_BOX).describe(`${edge}, from 0 to ${String(NEXT_TASK_SKETCH_BOX)}.`);

const nextTaskSketchShape = z
  .object({
    kind: z
      .enum(NEXT_TASK_SKETCH_KINDS)
      .describe(
        'heading or text: a line of words, as long as `w`. block: a filled area such as a button, a bar or a card. ' +
          'image: a photo or an illustration. circle: an avatar, a dot or an icon, `w` across. outline: an empty box ' +
          'such as a phone screen, a panel or an input.',
      ),
    x: sketchCoordinate('The left edge'),
    y: sketchCoordinate('The top edge'),
    w: sketchCoordinate('The width').positive(),
    h: sketchCoordinate('The height, for block, image and outline').positive().optional(),
  })
  .strict();

const nextTaskPictureWithSketch = nextTaskPicture
  .omit({ skeleton: true })
  .extend({
    sketch: z
      .array(nextTaskSketchShape)
      .min(1)
      .max(MAX_NEXT_TASK_SKETCH_SHAPES)
      .optional()
      .describe(
        `A rough blocking of what this task adds, for a task that adds something not on the page yet, only when you are confident it reads as the idea; otherwise give no picture and the task shows as text: up to ${String(MAX_NEXT_TASK_SKETCH_SHAPES)} ` +
          `shapes on a box ${String(NEXT_TASK_SKETCH_BOX)} across and ${String(NEXT_TASK_SKETCH_BOX)} down, drawn on a tile a little wider than it is tall. ` +
          'Block out where the parts of the idea sit, not their details: a new phone screen is an outline holding a heading, ' +
          'two text lines and a block for its button. Onlook draws the shapes in its own style, with no color or words.',
      ),
  })
  .strict();

const tasksDescription = `Two or three tasks, at most ${String(MAX_NEXT_TASKS)}, the one you would do first leading.`;

const tasksWithPicturesSchema = <Picture extends z.ZodType>(picture: Picture) => ({
  tasks: z
    .array(
      z
        .object({
          title: nextTaskTitle,
          line: nextTaskLine,
          picture: picture.optional().describe('What the card pictures beside this task.'),
        })
        .strict(),
    )
    .min(1)
    .max(MAX_NEXT_TASKS)
    .describe(tasksDescription),
});

const suggestNextTasksWithSketchesSchema = tasksWithPicturesSchema(nextTaskPictureWithSketch);

export type SuggestNextTasksWithSketchesTool = SdkMcpToolDefinition<typeof suggestNextTasksWithSketchesSchema>;

export type NextTaskPicturesClip = (frameId: string, targets: readonly PictureTarget[]) => Promise<FramePicture[]>;

type PictureAsk = z.infer<typeof nextTaskPicture> & Pick<z.infer<typeof nextTaskPictureWithSketch>, 'sketch'>;

export const PICTURE_NOTES_LABEL = 'Picture notes: ';

const MISS_WORDS: Record<PictureMiss, string> = {
  'no-match': 'its selector matched nothing',
  'invalid-selector': 'its selector is not valid CSS',
  hidden: 'its element is hidden',
  'not-in-view': 'its element is not in view',
  'stale-ref': `its ref is not from the latest ${READ_FRAME_TOOL_NAME} of this page, or now names a different element`,
  'project-closed': 'the project is no longer open',
  'off-page': 'the frame is on a canvas page that is not showing',
  'missing-page': 'the frame has no live page',
  timeout: 'the frame could not be captured in time',
  'page-changed': 'the frame navigated during the capture',
  'viewport-changed': 'the frame changed size during the capture',
  'incomplete-image': 'the frame had not finished painting',
  'view-busy': 'the frame could not be captured (view busy)',
  'view-late': 'the frame could not be captured (view late)',
  'compositor-error': 'the frame could not be captured (compositor error)',
  'capture-error': 'the frame could not be captured',
  'internal-error': 'the frame could not be captured',
};

function targetOf(ask: PictureAsk): PictureTarget {
  if (ask.ref !== undefined) return { ref: ask.ref };
  return ask.selector === undefined ? {} : { selector: ask.selector };
}

function shownWords(picture: NextTaskPicture | null): string {
  if (picture === null) return 'no picture';
  if ('sketch' in picture) return 'your sketch';
  if ('skeleton' in picture) return 'a stock sketch';
  return 'a picture';
}

/** One clip call per frame named; a frame named always gets a picture when one exists, then the sketch, the skeleton, text (ONL-2977). */
export async function nextTaskPictures(
  asks: readonly (PictureAsk | undefined)[],
  clip: NextTaskPicturesClip,
): Promise<{ pictures: (NextTaskPicture | null)[]; notes: string[] }> {
  const byFrame = new Map<string, { index: number; target: PictureTarget }[]>();
  asks.forEach((ask, index) => {
    if (ask?.frame_id === undefined) return;
    byFrame.set(ask.frame_id, [...(byFrame.get(ask.frame_id) ?? []), { index, target: targetOf(ask) }]);
  });
  const outcomes = new Map<number, FramePicture>();
  await Promise.all(
    [...byFrame].map(async ([frameId, asked]) => {
      const answered = await clip(frameId, asked.map(({ target }) => target)).catch((): FramePicture[] => []);
      asked.forEach(({ index }, position) => {
        outcomes.set(index, answered[position] ?? { ok: false, reason: 'capture-error' });
      });
    }),
  );
  const notes: string[] = [];
  const pictures = asks.map((ask, index): NextTaskPicture | null => {
    const outcome = outcomes.get(index);
    const card = `card ${String(index + 1)}`;
    if (outcome?.ok === true) {
      if (outcome.missed !== undefined) {
        const what = outcome.source === 'remembered' ? 'the frame as it last loaded' : 'the whole frame';
        notes.push(`${card} shows ${what}, because ${MISS_WORDS[outcome.missed]}.`);
      }
      return { clip: outcome.id };
    }
    const sketch = nextTaskSketchOf(ask?.sketch);
    const fallback: NextTaskPicture | null = sketch !== undefined ? { sketch } : ask?.skeleton === undefined ? null : { skeleton: ask.skeleton };
    if (outcome !== undefined) notes.push(`${card} shows ${shownWords(fallback)}, because ${MISS_WORDS[outcome.reason]}.`);
    return fallback;
  });
  return { pictures, notes };
}

const OFFER_SHOWN =
  'Onlook is showing these tasks as cards directly beneath your last reply, so that reply is your lead-in ' +
  'to them. If you have written nothing since your last tool, write it now: one short paragraph handing ' +
  'these options over. Otherwise end your turn; anything more becomes a second paragraph above the cards. ' +
  'A chosen task arrives as the next message.';

const SUGGEST_NEXT_TASKS_DESCRIPTION =
  'Offer the user the changes you recommend for this page, as cards they can choose. Call this as the ' +
  'last thing in every turn that changed the page. Give two or three tasks, each a concrete next change ' +
  'that follows from what you saw while working: a short title worded as their own request, and a line ' +
  'with the detail the title leaves out. A chosen task arrives as their next message, its title as the ' +
  'text and its line beside it. You do not see the screen: Onlook draws the cards directly beneath your ' +
  'last reply, so that reply hands them over. Write it as someone offering these options, not as someone ' +
  'who has finished with nothing left to do.';

const SUGGEST_NEXT_TASKS_ANNOTATIONS = {
  alwaysLoad: true,
  annotations: { title: 'Suggest next tasks', readOnlyHint: true, destructiveHint: false },
} as const;

type PicturedTasks = { tasks: readonly { title: string; line: string; picture?: PictureAsk | undefined }[] };

const offerPictured =
  (onSuggestNextTasks: NextTasksReport, clip: NextTaskPicturesClip) =>
  async (args: PicturedTasks) => {
    const { pictures, notes } = await nextTaskPictures(args.tasks.map((task) => task.picture), clip);
    onSuggestNextTasks(args.tasks.map(({ title, line }) => ({ title, line })));
    const noted = notes.length === 0 ? '' : `\n${PICTURE_NOTES_LABEL}${notes.join(' ')}`;
    return { content: [{ type: 'text' as const, text: `${OFFER_SHOWN}\n${nextTaskPicturesLine(pictures)}${noted}` }] };
  };

const PICTURES_WITH_SKETCHES =
  'A picture lets the user see a task’s idea at a glance before reading it. A task that starts from something ' +
  `on a frame, a part of the page it changes or a part of a reference site it builds from, names that frame and the ref ` +
  `${READ_FRAME_TOOL_NAME} gave that part, and Onlook clips it. A task with nothing on a frame to start from, such as a new screen, ` +
  'section or step, carries a sketch instead: a clip could only show what exists.';

export function suggestNextTasksWithSketchesTool(onSuggestNextTasks: NextTasksReport, clip: NextTaskPicturesClip): SuggestNextTasksWithSketchesTool {
  return tool(
    SUGGEST_NEXT_TASKS_TOOL_NAME,
    `${SUGGEST_NEXT_TASKS_DESCRIPTION} ${PICTURES_WITH_SKETCHES}`,
    suggestNextTasksWithSketchesSchema,
    offerPictured(onSuggestNextTasks, clip),
    SUGGEST_NEXT_TASKS_ANNOTATIONS,
  );
}

export interface StudioToolSinks extends CanvasToolSinks {
  onDeleteProjectFile?: DeleteProjectFileReport;
  projectSetup?: ProjectSetupToolSinks;
  onSaveAttachment?: (id: string, path: string) => { ok: boolean; path?: string; reason?: string };
  onArtifact: ArtifactToolReport;
  onServerRunning: ServerRunningReport;
  onFrameUrl: FrameUrlReport;
  onFrameWorking: FrameWorkingReport;
  onWaitingOn: WaitingOnReport;
  onRenameProject: RenameProjectReport;
  onCreateProjectTab: CreateProjectTabReport;
  onSuggestNextTasks: NextTasksReport;
  onClipNextTaskPictures: NextTaskPicturesClip;
}

type OfferedTool = SdkMcpToolDefinition<never> | undefined;

const toolNamed = (tools: readonly SdkMcpToolDefinition<never>[], name: string): OfferedTool =>
  tools.find((definition) => definition.name === name);

/** Every record bound to its definition, in the order the model reads them; `undefined` is a tool this session is not offered. `as never` per element keeps each factory's return type intact. */
function offeredTools(sinks: StudioToolSinks): Record<StudioToolName, OfferedTool> {
  const covers = flagOn('frame-covers');
  const setup = sinks.projectSetup ? projectSetupTools(sinks.projectSetup) : [];
  const artifacts = artifactTools(sinks.onArtifact, covers, true);
  return {
    [DELETE_PROJECT_FILE_TOOL_NAME]: sinks.onDeleteProjectFile ? (deleteProjectFileTool(sinks.onDeleteProjectFile) as never) : undefined,
    [PROJECT_SETUP_TOOL_NAMES.read]: toolNamed(setup, PROJECT_SETUP_TOOL_NAMES.read),
    [PROJECT_SETUP_TOOL_NAMES.save]: toolNamed(setup, PROJECT_SETUP_TOOL_NAMES.save),
    [PROJECT_SETUP_TOOL_NAMES.run]: toolNamed(setup, PROJECT_SETUP_TOOL_NAMES.run),
    [SERVER_RUNNING_TOOL_NAME]: serverRunningTool(sinks.onServerRunning) as never,
    [FRAME_WORKING_TOOL_NAME]: frameStatusTool(sinks.onFrameWorking) as never,
    [WAITING_ON_TOOL_NAME]: waitingOnTool(sinks.onWaitingOn) as never,
    [SET_FRAME_URL_TOOL_NAME]: setFrameUrlTool(sinks.onFrameUrl) as never,
    [RENAME_PROJECT_TOOL_NAME]: renameProjectTool(sinks.onRenameProject) as never,
    [CREATE_PROJECT_TAB_TOOL_NAME]: createProjectTabTool(sinks.onCreateProjectTab) as never,
    [SUGGEST_NEXT_TASKS_TOOL_NAME]: suggestNextTasksWithSketchesTool(sinks.onSuggestNextTasks, sinks.onClipNextTaskPictures) as never,
    [LIST_FRAMES_TOOL_NAME]: listFramesTool(sinks.onListFrames) as never,
    [LIST_PAGES_TOOL_NAME]: listPagesTool(sinks.onListPages) as never,
    [CREATE_PAGE_TOOL_NAME]: createPageTool(sinks.onCreatePage) as never,
    [RENAME_PAGE_TOOL_NAME]: renamePageTool(sinks.onRenamePage) as never,
    [REORDER_PAGE_TOOL_NAME]: reorderPageTool(sinks.onReorderPage) as never,
    [MOVE_NODES_TO_PAGE_TOOL_NAME]: moveNodesToPageTool(sinks.onMoveNodesToPage) as never,
    [DELETE_PAGE_TOOL_NAME]: deletePageTool(sinks.onDeletePage) as never,
    [CREATE_FRAME_TOOL_NAME]: createFrameTool(sinks.onCreateFrame, covers) as never,
    [CLEAR_FRAME_QUOTE_TOOL_NAME]: covers ? (clearFrameQuoteTool(sinks.onClearFrameQuote) as never) : undefined,
    /* Off the alpha flag the Canvas draws no Section, so the agent is not offered one to make (ONL-2661). */
    [CREATE_SECTION_TOOL_NAME]: flagOn('sections') ? (createSectionTool(sinks.onCreateFrame) as never) : undefined,
    [MOVE_FRAME_TOOL_NAME]: moveFrameTool(sinks.onMoveFrame, covers) as never,
    [MOVE_FRAMES_TOOL_NAME]: moveFramesTool(sinks.onMoveFrames) as never,
    [DUPLICATE_FRAMES_TOOL_NAME]: duplicateFramesTool(sinks.onDuplicateFrames) as never,
    [RENAME_FRAME_TOOL_NAME]: renameFrameTool(sinks.onRenameFrame) as never,
    [REORDER_FRAME_TOOL_NAME]: reorderFrameTool(sinks.onReorderFrame) as never,
    [CREATE_TEXT_TOOL_NAME]: createTextTool(sinks.onCreateText) as never,
    [SET_TEXT_TOOL_NAME]: setTextTool(sinks.onSetText) as never,
    [CREATE_IMAGE_TOOL_NAME]: createImageTool(sinks.onCreateImage) as never,
    [REMOVE_FRAME_TOOL_NAME]: removeFrameTool(sinks.onRemoveFrame) as never,
    [REMOVE_FRAMES_TOOL_NAME]: removeFramesTool(sinks.onRemoveFrames) as never,
    [EVALUATE_IN_FRAME_TOOL_NAME]: evaluateInFrameTool(sinks.onEvaluateInFrame) as never,
    [READ_FRAME_TOOL_NAME]: readFrameTool(sinks.onReadFrame) as never,
    [CAPTURE_FRAME_TOOL_NAME]: captureFrameTool(sinks.onCaptureFrame, sinks.onEvaluateInFrame, covers) as never,
    [UNDO_CANVAS_TOOL_NAME]: undoCanvasTool(sinks.onUndoCanvas) as never,
    [REDO_CANVAS_TOOL_NAME]: redoCanvasTool(sinks.onRedoCanvas) as never,
    [ARTIFACT_TOOL_NAMES.create]: toolNamed(artifacts, ARTIFACT_TOOL_NAMES.create),
    [ARTIFACT_TOOL_NAMES.read]: toolNamed(artifacts, ARTIFACT_TOOL_NAMES.read),
    [ARTIFACT_TOOL_NAMES.fork]: toolNamed(artifacts, ARTIFACT_TOOL_NAMES.fork),
    [ARTIFACT_TOOL_NAMES.set]: toolNamed(artifacts, ARTIFACT_TOOL_NAMES.set),
    [ARTIFACT_TOOL_NAMES.import]: toolNamed(artifacts, ARTIFACT_TOOL_NAMES.import),
    [ARTIFACT_TOOL_NAMES.place]: toolNamed(artifacts, ARTIFACT_TOOL_NAMES.place),
    [SAVE_ATTACHMENT_TOOL_NAME]: sinks.onSaveAttachment ? (tool(SAVE_ATTACHMENT_TOOL_NAME, 'Save a byte-identical copy of an attached file into a new project file, only when the user asks to use or save it in the project. Never copy merely because a file was attached. The original stays in Onlook.', { attachmentId: z.string().min(1), path: z.string().min(1).max(4096) }, async (input) => {
      const result = sinks.onSaveAttachment!(input.attachmentId, input.path);
      return { ...(!result.ok ? { isError: true } : {}), content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }, { alwaysLoad: true, annotations: { title: 'Save an attached file in the project', destructiveHint: true } }) as never) : undefined,
  };
}

/** The one list: `appserver/tools.ts` projects it into codex's `dynamicTools` (ONL-2054). */
export function studioToolDefinitions(sinks: StudioToolSinks): SdkMcpToolDefinition<never>[] {
  return Object.values(offeredTools(sinks)).filter((offered) => offered !== undefined);
}

export function studioToolServer(sinks: StudioToolSinks): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({
    name: STUDIO_MCP_SERVER,
    version: '1.0.0',
    // `as never` on the elements, not the array, keeps `args.port` typed inside the handlers.
    tools: studioToolDefinitions(sinks) as never[],
  });
}
