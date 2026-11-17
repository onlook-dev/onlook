import type { StudioToolSinks } from '../../apps/studio/src/main/agent-host/studio-tools.js';
import { ARTIFACT_TOOL_NAMES } from '../../apps/studio/src/main/agent-host/tool-names.js';

export function recordingSinks(): { sinks: StudioToolSinks; calls: string[] } {
  const calls: string[] = [];
  const reach = (name: string, args: unknown[]): void => {
    calls.push(`${name}(${args.map((arg) => String(JSON.stringify(arg))).join(', ')})`);
  };
  const refuse = (name: string) => async (...args: unknown[]): Promise<{ ok: false; reason: string }> => {
    reach(name, args);
    return { ok: false, reason: 'harness check: recorded, nothing performed' };
  };
  const sinks: StudioToolSinks = {
    onServerRunning: (...args) => reach('server_running', args),
    onFrameWorking: (...args) => reach('frame_working', args),
    onWaitingOn: (...args) => reach('waiting_on', args),
    onSuggestNextTasks: (...args) => reach('suggest_next_tasks', args),
    onClipNextTaskPictures: (_frameId, targets) => Promise.resolve(targets.map(() => ({ ok: false as const, reason: 'project-closed' as const }))),
    onListFrames: async (...args) => {
      reach('list_frames', args);
      return [];
    },
    onListPages: async () => {
      reach('list_pages', []);
      return [];
    },
    onFrameUrl: refuse('set_frame_url'),
    onRenameProject: refuse('rename_project'),
    onCreateProjectTab: refuse('create_project_tab'),
    onCreatePage: refuse('create_page'),
    onRenamePage: refuse('rename_page'),
    onReorderPage: refuse('reorder_page'),
    onDeletePage: refuse('delete_page'),
    onMoveNodesToPage: refuse('move_nodes_to_page'),
    onCreateFrame: refuse('create_frame'),
    onClearFrameQuote: refuse('clear_frame_quote'),
    onMoveFrame: refuse('move_frame'),
    onMoveFrames: refuse('move_frames'),
    onDuplicateFrames: refuse('duplicate_frames'),
    onRenameFrame: refuse('rename_frame'),
    onReorderFrame: refuse('reorder_frame'),
    onCreateText: refuse('create_text'),
    onSetText: refuse('set_text'),
    onCreateImage: refuse('create_image'),
    onRemoveFrame: refuse('remove_frame'),
    onRemoveFrames: refuse('remove_frames'),
    onEvaluateInFrame: refuse('evaluate_in_frame'),
    onCaptureFrame: refuse('capture_frame'),
    onReadFrame: refuse('read_frame'),
    onUndoCanvas: refuse('undo_canvas'),
    onRedoCanvas: refuse('redo_canvas'),
    onArtifact: async (verb, input) => refuse(ARTIFACT_TOOL_NAMES[verb])(input),
  };
  return { sinks, calls };
}

const TOOL_ARGUMENTS: Readonly<Record<string, Record<string, unknown>>> = {
  server_running: { port: 5173 },
  frame_working: { frame_id: 'f1', done: 'Built', what: 'page' },
  waiting_on: { what: 'a color for the signup button' },
  set_frame_url: { frame_id: 'f1', url: 'http://localhost:5173' },
  rename_project: { name: 'Harness Check' },
  create_project_tab: {},
  suggest_next_tasks: { tasks: [{ title: 'Show it on mobile', line: 'At phone width.' }] },
  list_frames: {},
  list_pages: {},
  create_page: { name: 'Harness Page' },
  rename_page: { page_id: 'p1', name: 'Renamed Page' },
  reorder_page: { page_id: 'p1', position: 'last' },
  move_nodes_to_page: { object_ids: ['f1'], page_id: 'p1' },
  delete_page: { page_id: 'p1' },
  create_frame: { url: 'http://localhost:5173', name: 'Home', done: 'Added' },
  move_frame: { frame_id: 'f1', x: 10, y: 10 },
  move_frames: { frame_ids: ['f1'], delta_x: 10, delta_y: 10 },
  duplicate_frames: { frame_ids: ['f1'], done: 'Copied' },
  rename_frame: { frame_id: 'f1', name: 'Copy' },
  clear_frame_quote: { frame_id: 'f1' },
  reorder_frame: { frame_id: 'f1', position: 'front' },
  create_text: { text: 'Harness Check' },
  set_text: { text_id: 't1', text: 'Updated Harness Check' },
  create_image: { path: 'fixture.png' },
  remove_frame: { frame_id: 'f1' },
  remove_frames: { frame_ids: ['f1'] },
  evaluate_in_frame: { frame_id: 'f1', script: '1 + 1' },
  capture_frame: { frame_id: 'f1' },
  read_frame: { frame_id: 'f1' },
  undo_canvas: {},
  redo_canvas: {},
  create_artifact: { title: 'Harness Artifact', html: '<!doctype html><title>Harness Check</title>' },
  read_artifact: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' },
  fork_artifact: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Harness Variant' },
  set_artifact: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', html: '<!doctype html><title>Updated Harness Check</title>' },
  import_artifact: { path: 'fixture.html' },
  place_artifact: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' },
};

export function toolsPrompt(names: readonly string[]): string {
  const lines = names.map((name) => {
    if (!Object.hasOwn(TOOL_ARGUMENTS, name)) throw new Error(`No live tool argument fixture for '${name}'`);
    return `- ${name} ${JSON.stringify(TOOL_ARGUMENTS[name])}`;
  });
  return [
    'This is a wiring check. Remember the codeword ZEPHYR-7742.',
    'Call each of these tools exactly once, with exactly these arguments. Most will report that nothing was performed; that is expected, keep going.',
    'Call no other tool. When every one has answered, reply with just: DONE',
    ...lines,
  ].join('\n');
}
