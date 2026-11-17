import {
  PROJECT_SETUP_TOOL_NAMES,
  RENAME_PROJECT_TOOL_NAME,
  renamedProjectName,
  SERVER_RUNNING_TOOL_NAME,
  STUDIO_TOOL_SERVER,
  SUGGEST_NEXT_TASKS_TOOL_NAME,
  type ToolCallView,
} from '@studio/events';

export const TOOL_LINE_IDS = [
  'searchCode',
  'findFiles',
  'fetch',
  'searchWeb',
  'deleteFile',
  'helper',
  'helperBare',
  'helperMessage',
  'commandCheck',
  'commandStop',
  'commandWatch',
  'skill',
  'connector',
  'other',
  'canvasList',
  'pagesList',
  'pageAdd',
  'pageAddNamed',
  'pageRename',
  'pageReorder',
  'pageMoveItems',
  'pageDelete',
  'pageDeleteNamed',
  'frameAdd',
  'frameAddNamed',
  'sectionAdd',
  'sectionAddNamed',
  'frameMove',
  'frameMoveNamed',
  'frameResize',
  'frameResizeNamed',
  'framesMove',
  'framesDuplicate',
  'frameDuplicateNamed',
  'frameRename',
  'frameReorder',
  'frameRemove',
  'frameRemoveNamed',
  'framesRemove',
  'frameUrl',
  'frameUrlNamed',
  'frameCheck',
  'frameCheckNamed',
  'frameLook',
  'frameLookNamed',
  'undo',
  'redo',
  'textAdd',
  'textSet',
  'imageAdd',
  'imageAddNamed',
  'projectTab',
  'projectName',
  'projectNamed',
  'setupRead',
  'setupSave',
  'appStart',
  'appStop',
  'appRestart',
  'attachmentSave',
  'artifactCreate',
  'artifactRead',
  'artifactReadNamed',
  'artifactEdit',
  'artifactEditNamed',
  'artifactImport',
  'artifactPlace',
  'artifactPlaceNamed',
  'artifactFork',
] as const;

export type ToolLineId = (typeof TOOL_LINE_IDS)[number];

/** Each pair is a whole sentence; `{target}` is where the row's target sits, and `{name}`, `{what}`, `{url}`, `{text}` and `{file}` are filled from the call. */
export type ToolLineStrings = Record<ToolLineId, { running: string; done: string }>;

/** A frame, page or artifact's name on the canvas right now, by the id the agent passed. */
export type CanvasNameOf = (id: string) => string | undefined;

export type ToolLine =
  | { kind: 'hidden' }
  | { kind: 'line'; id: ToolLineId; params?: Record<string, string>; target?: string; frameId?: string };

const HIDDEN: ToolLine = { kind: 'hidden' };
const QUOTED_MAX = 40;

function line(id: ToolLineId, params?: Record<string, string>): ToolLine {
  return params === undefined ? { kind: 'line', id } : { kind: 'line', id, params };
}

function named(bare: ToolLineId, withName: ToolLineId, name: string | undefined, params: Record<string, string> = {}): ToolLine {
  return name === undefined ? line(bare, Object.keys(params).length > 0 ? params : undefined) : line(withName, { ...params, name });
}

/** A named line whose `{name}` is the frame the call acts on, so the row can take the person there. */
function framed(bare: ToolLineId, withName: ToolLineId, call: ToolCallView, nameOf: CanvasNameOf, params: Record<string, string> = {}): ToolLine {
  const frameId = field(call, 'frame_id');
  const lineFor = named(bare, withName, frameId === undefined ? undefined : nameOf(frameId), params);
  return lineFor.kind === 'line' && lineFor.id === withName && frameId !== undefined ? { ...lineFor, frameId } : lineFor;
}

function field(call: ToolCallView, key: string): string | undefined {
  const value = (call.input as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function ids(call: ToolCallView, key: string): string[] {
  const value = (call.input as Record<string, unknown> | undefined)?.[key];
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

function clip(value: string): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > QUOTED_MAX ? `${flat.slice(0, QUOTED_MAX - 1)}…` : flat;
}

function fileName(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** The first letter lowered so the agent's "Explore the header" reads mid-sentence; an acronym keeps its case. */
function midSentence(value: string): string {
  return /^[A-Z][a-z]/.test(value) ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

type Rule = (call: ToolCallView, nameOf: CanvasNameOf) => ToolLine;

const nameOfField = (call: ToolCallView, nameOf: CanvasNameOf, key: string): string | undefined => {
  const id = field(call, key);
  return id === undefined ? undefined : nameOf(id);
};

const STUDIO_LINES: Readonly<Record<string, Rule>> = {
  // Each of these has its own surface: the status list, the server's state, the next-task card, the frame itself.
  frame_working: () => HIDDEN,
  waiting_on: () => HIDDEN,
  [SERVER_RUNNING_TOOL_NAME]: () => HIDDEN,
  [SUGGEST_NEXT_TASKS_TOOL_NAME]: () => HIDDEN,
  clear_frame_quote: () => HIDDEN,
  list_frames: () => line('canvasList'),
  list_pages: () => line('pagesList'),
  create_page: (call) => named('pageAdd', 'pageAddNamed', field(call, 'name')),
  rename_page: (call) => line('pageRename', { name: field(call, 'name') ?? '' }),
  reorder_page: () => line('pageReorder'),
  move_nodes_to_page: () => line('pageMoveItems'),
  delete_page: (call, nameOf) => named('pageDelete', 'pageDeleteNamed', nameOfField(call, nameOf, 'page_id')),
  create_frame: (call) => named('frameAdd', 'frameAddNamed', field(call, 'name')),
  create_section: (call) => named('sectionAdd', 'sectionAddNamed', field(call, 'name')),
  move_frame: (call, nameOf) => {
    const input = (call.input ?? {}) as Record<string, unknown>;
    return input['width'] !== undefined || input['height'] !== undefined
      ? framed('frameResize', 'frameResizeNamed', call, nameOf)
      : framed('frameMove', 'frameMoveNamed', call, nameOf);
  },
  move_frames: () => line('framesMove'),
  duplicate_frames: (call, nameOf) => {
    const frameIds = ids(call, 'frame_ids');
    const only = frameIds.length === 1 && frameIds[0] !== undefined ? nameOf(frameIds[0]) : undefined;
    return only === undefined ? line('framesDuplicate') : line('frameDuplicateNamed', { name: only });
  },
  rename_frame: (call) => {
    const frameId = field(call, 'frame_id');
    const renamed = line('frameRename', { name: field(call, 'name') ?? '' });
    return frameId === undefined || field(call, 'name') === undefined ? renamed : { ...renamed, frameId };
  },
  reorder_frame: () => line('frameReorder'),
  remove_frame: (call, nameOf) => named('frameRemove', 'frameRemoveNamed', nameOfField(call, nameOf, 'frame_id')),
  remove_frames: () => line('framesRemove'),
  set_frame_url: (call, nameOf) => framed('frameUrl', 'frameUrlNamed', call, nameOf, { url: field(call, 'url') ?? '' }),
  evaluate_in_frame: (call, nameOf) => framed('frameCheck', 'frameCheckNamed', call, nameOf),
  read_frame: (call, nameOf) => framed('frameCheck', 'frameCheckNamed', call, nameOf),
  capture_frame: (call, nameOf) => framed('frameLook', 'frameLookNamed', call, nameOf),
  undo_canvas: () => line('undo'),
  redo_canvas: () => line('redo'),
  create_text: (call) => line('textAdd', { text: clip(field(call, 'text') ?? '') }),
  set_text: (call) => line('textSet', { text: clip(field(call, 'text') ?? '') }),
  create_image: (call) => named('imageAdd', 'imageAddNamed', field(call, 'name')),
  create_project_tab: () => line('projectTab'),
  [RENAME_PROJECT_TOOL_NAME]: (call) => {
    if (call.displayStatus === 'pending' || call.displayStatus === 'in_progress') return line('projectName');
    const name = renamedProjectName(call.result);
    if (name !== undefined) return line('projectNamed', { name });
    // A skip changed nothing on screen; only a failure is worth a line.
    return call.displayStatus === 'completed' ? HIDDEN : line('projectName');
  },
  [PROJECT_SETUP_TOOL_NAMES.read]: () => line('setupRead'),
  [PROJECT_SETUP_TOOL_NAMES.save]: () => line('setupSave'),
  [PROJECT_SETUP_TOOL_NAMES.run]: (call) => {
    const action = field(call, 'action');
    return line(action === 'stop' ? 'appStop' : action === 'restart' ? 'appRestart' : 'appStart');
  },
  save_attachment: (call) => line('attachmentSave', { file: fileName(field(call, 'path')) ?? '' }),
  delete_project_file: (call) => {
    const file = fileName(field(call, 'path'));
    return file === undefined ? line('deleteFile') : { kind: 'line', id: 'deleteFile', target: file };
  },
  create_artifact: (call) => line('artifactCreate', { name: field(call, 'title') ?? '' }),
  read_artifact: (call, nameOf) => named('artifactRead', 'artifactReadNamed', nameOfField(call, nameOf, 'artifactId')),
  set_artifact: (call, nameOf) => named('artifactEdit', 'artifactEditNamed', nameOfField(call, nameOf, 'artifactId')),
  import_artifact: (call) => line('artifactImport', { file: fileName(field(call, 'path')) ?? '' }),
  place_artifact: (call, nameOf) => named('artifactPlace', 'artifactPlaceNamed', nameOfField(call, nameOf, 'artifactId')),
  fork_artifact: (call) => line('artifactFork', { name: field(call, 'title') ?? '' }),
};

/** The Studio tools a line is written for, by their bare name; a test holds this against the tools main registers. */
export const STUDIO_TOOLS_WITH_LINES: ReadonlySet<string> = new Set(Object.keys(STUDIO_LINES));

/** Claude's bookkeeping, and the question tool, whose card and answer block are its whole surface. */
const HIDDEN_BUILT_INS: ReadonlySet<string> = new Set([
  'TodoWrite',
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskUpdate',
  'EnterPlanMode',
  'ExitPlanMode',
  'ToolSearch',
  'ListAgents',
  'AskUserQuestion',
]);

const BUILT_IN_LINES: Readonly<Record<string, Rule>> = {
  Task: helperLine,
  Agent: helperLine,
  SendMessage: () => line('helperMessage'),
  BashOutput: () => line('commandCheck'),
  KillShell: () => line('commandStop'),
  TaskStop: () => line('commandStop'),
  Monitor: () => line('commandWatch'),
  Skill: (call) => {
    const skill = field(call, 'skill') ?? field(call, 'name');
    return skill === undefined ? line('other') : line('skill', { name: skill });
  },
};

function helperLine(call: ToolCallView): ToolLine {
  const what = field(call, 'description');
  return what === undefined ? line('helperBare') : line('helper', { what: midSentence(what) });
}

/** Every built-in name that owns a line here, hidden or written; the rest of the register is `classify.ts`'s own. */
export const BUILT_INS_WITH_LINES: ReadonlySet<string> = new Set([...HIDDEN_BUILT_INS, ...Object.keys(BUILT_IN_LINES)]);

const STUDIO_PREFIX = `mcp__${STUDIO_TOOL_SERVER}__`;

function studioLeaf(name: string): string | undefined {
  if (name.startsWith(STUDIO_PREFIX)) return name.slice(STUDIO_PREFIX.length);
  return name in STUDIO_LINES ? name : undefined;
}

/**
 * The line for a call the register's file and command rows do not cover, or
 * `undefined` for one they do. Never the tool's own name: an unknown tool reads
 * as "Used a tool", and a connector by the name its server goes by.
 */
export function toolLineFor(call: ToolCallView, nameOf: CanvasNameOf): ToolLine | undefined {
  const leaf = studioLeaf(call.name);
  if (leaf !== undefined) return STUDIO_LINES[leaf]?.(call, nameOf) ?? line('other');
  if (HIDDEN_BUILT_INS.has(call.name)) return HIDDEN;
  const builtIn = BUILT_IN_LINES[call.name];
  if (builtIn !== undefined) return builtIn(call, nameOf);
  if (call.name.startsWith('mcp__')) {
    const server = call.name.split('__')[1];
    return server ? line('connector', { name: server.replace(/_/g, ' ') }) : line('other');
  }
  return undefined;
}

export function isHiddenLine(call: ToolCallView, nameOf: CanvasNameOf): boolean {
  return toolLineFor(call, nameOf)?.kind === 'hidden';
}
