// Own file: imported by both `studio-tools.ts` and `canvas-tools.ts`, and a cycle between them surfaces as `Cannot access 'X' before initialization`.

import {
  PROJECT_SETUP_TOOL_NAMES,
  RENAME_PROJECT_TOOL_NAME,
  SERVER_RUNNING_TOOL_NAME,
  STUDIO_TOOL_SERVER,
  SUGGEST_NEXT_TASKS_TOOL_NAME,
} from '@studio/events';
import type { TurnToolKind } from './turn-tool-kinds.js';

export const STUDIO_MCP_SERVER = STUDIO_TOOL_SERVER;

const named = (tool: string): string => `mcp__${STUDIO_MCP_SERVER}__${tool}`;

export const DELETE_PROJECT_FILE_TOOL_NAME = 'delete_project_file';
export const DELETE_PROJECT_FILE_TOOL = named(DELETE_PROJECT_FILE_TOOL_NAME);

export const ARTIFACT_TOOL_NAMES = {
  create: 'create_artifact', read: 'read_artifact', set: 'set_artifact',
  import: 'import_artifact', place: 'place_artifact', fork: 'fork_artifact',
} as const;

/** Defined in `@studio/events`: the chat's row classifier reads it by name (ONL-2181). */
export { PROJECT_SETUP_TOOL_NAMES, RENAME_PROJECT_TOOL_NAME, SERVER_RUNNING_TOOL_NAME, SUGGEST_NEXT_TASKS_TOOL_NAME };

export const CREATE_PROJECT_TAB_TOOL_NAME = 'create_project_tab';
export const CREATE_PROJECT_TAB_TOOL = named(CREATE_PROJECT_TAB_TOOL_NAME);
export const SET_FRAME_URL_TOOL_NAME = 'set_frame_url';
export const SET_FRAME_URL_TOOL = named(SET_FRAME_URL_TOOL_NAME);
export const FRAME_WORKING_TOOL_NAME = 'frame_working';
export const WAITING_ON_TOOL_NAME = 'waiting_on';
export const WAITING_ON_TOOL = named(WAITING_ON_TOOL_NAME);

export const LIST_FRAMES_TOOL_NAME = 'list_frames';
export const LIST_FRAMES_TOOL = named(LIST_FRAMES_TOOL_NAME);
export const CREATE_FRAME_TOOL_NAME = 'create_frame';
export const MOVE_FRAME_TOOL_NAME = 'move_frame';
export const MOVE_FRAMES_TOOL_NAME = 'move_frames';
export const DUPLICATE_FRAMES_TOOL_NAME = 'duplicate_frames';
export const RENAME_FRAME_TOOL_NAME = 'rename_frame';
export const REORDER_FRAME_TOOL_NAME = 'reorder_frame';
export const REMOVE_FRAME_TOOL_NAME = 'remove_frame';
export const REMOVE_FRAMES_TOOL_NAME = 'remove_frames';
export const CLEAR_FRAME_QUOTE_TOOL_NAME = 'clear_frame_quote';
export const EVALUATE_IN_FRAME_TOOL_NAME = 'evaluate_in_frame';
export const EVALUATE_IN_FRAME_TOOL = named(EVALUATE_IN_FRAME_TOOL_NAME);
export const CAPTURE_FRAME_TOOL_NAME = 'capture_frame';
export const CAPTURE_FRAME_TOOL = named(CAPTURE_FRAME_TOOL_NAME);
export const READ_FRAME_TOOL_NAME = 'read_frame';
export const READ_FRAME_TOOL = named(READ_FRAME_TOOL_NAME);
export const UNDO_CANVAS_TOOL_NAME = 'undo_canvas';
export const REDO_CANVAS_TOOL_NAME = 'redo_canvas';
export const CREATE_TEXT_TOOL_NAME = 'create_text';
export const CREATE_SECTION_TOOL_NAME = 'create_section';
export const SET_TEXT_TOOL_NAME = 'set_text';
export const CREATE_IMAGE_TOOL_NAME = 'create_image';

export const LIST_PAGES_TOOL_NAME = 'list_pages';
export const CREATE_PAGE_TOOL_NAME = 'create_page';
export const RENAME_PAGE_TOOL_NAME = 'rename_page';
export const REORDER_PAGE_TOOL_NAME = 'reorder_page';
export const MOVE_NODES_TO_PAGE_TOOL_NAME = 'move_nodes_to_page';
export const DELETE_PAGE_TOOL_NAME = 'delete_page';
export const SAVE_ATTACHMENT_TOOL_NAME = 'save_attachment';

/** `card-once-setup-verified` runs without a card while the project has no verified setup (ONL-2499). */
type StudioToolApproval = 'auto' | 'card' | 'card-once-setup-verified';

interface StudioToolFacts {
  approval: StudioToolApproval;
  turnKind: TurnToolKind;
  /** Whether a call codex announces under the bare name is shown as the Studio row; without it the row keeps the bare name and kind `other`. */
  codexRow: boolean;
}

/** One record per Studio tool. Every list of them is read from here; `studio-tools.ts` binds each to its definition. */
export const STUDIO_TOOLS = {
  [PROJECT_SETUP_TOOL_NAMES.read]: { approval: 'auto', turnKind: 'other', codexRow: false },
  [ARTIFACT_TOOL_NAMES.create]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [ARTIFACT_TOOL_NAMES.read]: { approval: 'auto', turnKind: 'read', codexRow: true },
  [ARTIFACT_TOOL_NAMES.set]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [ARTIFACT_TOOL_NAMES.import]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [ARTIFACT_TOOL_NAMES.place]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [ARTIFACT_TOOL_NAMES.fork]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [SERVER_RUNNING_TOOL_NAME]: { approval: 'auto', turnKind: 'other', codexRow: true },
  [SET_FRAME_URL_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_navigate', codexRow: true },
  [FRAME_WORKING_TOOL_NAME]: { approval: 'auto', turnKind: 'other', codexRow: false },
  [WAITING_ON_TOOL_NAME]: { approval: 'auto', turnKind: 'other', codexRow: false },
  [LIST_FRAMES_TOOL_NAME]: { approval: 'auto', turnKind: 'frame_check', codexRow: true },
  [CREATE_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [MOVE_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [MOVE_FRAMES_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [DUPLICATE_FRAMES_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [RENAME_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [REORDER_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [REMOVE_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [REMOVE_FRAMES_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [CLEAR_FRAME_QUOTE_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [EVALUATE_IN_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'frame_check', codexRow: true },
  [CAPTURE_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'frame_check', codexRow: true },
  [READ_FRAME_TOOL_NAME]: { approval: 'auto', turnKind: 'frame_check', codexRow: true },
  [RENAME_PROJECT_TOOL_NAME]: { approval: 'auto', turnKind: 'other', codexRow: false },
  [SUGGEST_NEXT_TASKS_TOOL_NAME]: { approval: 'auto', turnKind: 'other', codexRow: false },
  // Additive, like `create_frame`: creating a worktree touches nothing that exists.
  [CREATE_PROJECT_TAB_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_navigate', codexRow: false },
  [CREATE_TEXT_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [CREATE_SECTION_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [SET_TEXT_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  // Writes into Studio's own state only; the file it copies from is one the agent can already read (ONL-2486).
  [CREATE_IMAGE_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: true },
  [LIST_PAGES_TOOL_NAME]: { approval: 'auto', turnKind: 'read', codexRow: false },
  // Arrangement, like `reorder_frame`: a page added, named or moved takes nothing away (ONL-2488).
  [CREATE_PAGE_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: false },
  [RENAME_PAGE_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: false },
  [REORDER_PAGE_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: false },
  [MOVE_NODES_TO_PAGE_TOOL_NAME]: { approval: 'auto', turnKind: 'canvas_edit', codexRow: false },

  [PROJECT_SETUP_TOOL_NAMES.save]: { approval: 'card-once-setup-verified', turnKind: 'other', codexRow: false },
  [PROJECT_SETUP_TOOL_NAMES.run]: { approval: 'card-once-setup-verified', turnKind: 'shell', codexRow: false },
  [SAVE_ATTACHMENT_TOOL_NAME]: { approval: 'card', turnKind: 'file_edit', codexRow: false },
  [DELETE_PROJECT_FILE_TOOL_NAME]: { approval: 'card', turnKind: 'file_delete', codexRow: true },
  [UNDO_CANVAS_TOOL_NAME]: { approval: 'card', turnKind: 'canvas_edit', codexRow: true },
  [REDO_CANVAS_TOOL_NAME]: { approval: 'card', turnKind: 'canvas_edit', codexRow: true },
  // The card names the page and what it holds at the moment the work would be destroyed (ONL-2488).
  [DELETE_PAGE_TOOL_NAME]: { approval: 'card', turnKind: 'canvas_edit', codexRow: false },
} as const satisfies Record<string, StudioToolFacts>;

export type StudioToolName = keyof typeof STUDIO_TOOLS;

export const STUDIO_TOOL_NAMES = Object.keys(STUDIO_TOOLS) as StudioToolName[];

/** Not the whole answer: `canUseTool` also grants the `card-once-setup-verified` tools while a project has no verified setup (ONL-2499). */
export const STUDIO_AUTO_APPROVED_TOOLS: readonly string[] = STUDIO_TOOL_NAMES.filter(
  (name) => STUDIO_TOOLS[name].approval === 'auto',
).map(named);
