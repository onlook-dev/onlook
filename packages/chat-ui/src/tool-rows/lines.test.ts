import { describe, expect, it } from 'bun:test';
import { renamedProjectResult, type ToolCallView } from '@studio/events';
import { subjectRowFor } from '../ToolApproval.js';
import { leavesNoTrace } from '../ToolCalls.js';
import { classifyToolCalls, type ToolLineContext } from './classify.js';
import { TOOL_LINE_IDS, type ToolLineStrings } from './lines.js';

const strings = Object.fromEntries(
  TOOL_LINE_IDS.map((id) => [id, { running: `${id}:running {name}{what}{url}{text}{file}`, done: `${id}:done {name}{what}{url}{text}{file}` }]),
) as ToolLineStrings;
const NAMES: Record<string, string> = { f1: 'Home', p1: 'Mobile', a1: 'Hero sketch' };
const lines: ToolLineContext = { strings, nameOf: (id) => NAMES[id] };
const verbs = Object.fromEntries(
  ['read', 'write', 'edit', 'search', 'find', 'run', 'fetch', 'searchWeb', 'use', 'rename'].map((v) => [v, { running: `${v}ing`, done: `${v}ed` }]),
) as Parameters<typeof subjectRowFor>[2] & object;

let seq = 0;
function call(name: string, extra: Partial<ToolCallView> = {}): ToolCallView {
  seq += 1;
  return { toolCallId: `c${String(seq)}`, name, kind: 'other', title: name, status: 'completed', displayStatus: 'completed', startedAt: 0, ...extra };
}
const studio = (leaf: string, input: unknown = {}, extra: Partial<ToolCallView> = {}) => call(`mcp__studio__${leaf}`, { input, ...extra });
const row = (c: ToolCallView) => {
  const node = classifyToolCalls([c], lines)[0];
  if (node?.kind !== 'row') return undefined;
  return node.sentence === undefined ? node : { ...node, sentence: unfilled(node.sentence) };
};
const unfilled = (text: string) => text.replace(/\{\w+\}/g, '');

describe('a tool line says what happened, never which tool did it (ONL-2960)', () => {
  it('names the project a rename gave it, read from the tool’s own result', () => {
    const named = row(studio('rename_project', { name: 'Reusable component thing' }, { result: renamedProjectResult('Reusable Component') }));
    expect(named?.line).toBe('projectNamed');
    expect(named?.sentence).toBe('projectNamed:done Reusable Component');
  });

  it('draws no line for a rename that was skipped, since nothing changed', () => {
    expect(row(studio('rename_project', { name: 'X' }, { result: 'Rename skipped: the user named this project' }))).toBeUndefined();
  });

  it('names the frame, page or artifact a call acts on when the canvas still has it, and falls back to a plain noun', () => {
    expect(row(studio('capture_frame', { frame_id: 'f1' }))?.line).toBe('frameLookNamed');
    expect(row(studio('capture_frame', { frame_id: 'gone' }))?.line).toBe('frameLook');
    expect(row(studio('delete_page', { page_id: 'p1' }))?.sentence).toBe('pageDeleteNamed:done Mobile');
    expect(row(studio('set_artifact', { artifactId: 'a1' }))?.sentence).toBe('artifactEditNamed:done Hero sketch');
  });

  it('links the name of the frame a look, check, resize, rename or new address acts on, so the person can go to it', () => {
    for (const c of [
      studio('capture_frame', { frame_id: 'f1', setup_script: 'pause()' }),
      studio('evaluate_in_frame', { frame_id: 'f1', script: '1' }),
      studio('move_frame', { frame_id: 'f1', width: 390 }),
      studio('set_frame_url', { frame_id: 'f1', url: '/pricing' }),
    ]) {
      expect(row(c)?.frameLink).toMatchObject({ frameId: 'f1', name: 'Home' });
    }
    expect(row(studio('rename_frame', { frame_id: 'f1', name: 'Landing' }))?.frameLink).toMatchObject({ frameId: 'f1', name: 'Landing' });
    const look = row(studio('capture_frame', { frame_id: 'f1' }));
    expect(look?.frameLink?.before).toBe('frameLookNamed:done ');
  });

  it('links no name when the frame is gone or was just removed, since there is nowhere to go', () => {
    expect(row(studio('capture_frame', { frame_id: 'gone' }))?.frameLink).toBeUndefined();
    expect(row(studio('remove_frame', { frame_id: 'f1' }))?.frameLink).toBeUndefined();
  });

  it('tells a resize from a move, and a start from a stop', () => {
    expect(row(studio('move_frame', { frame_id: 'f1', width: 390 }))?.line).toBe('frameResizeNamed');
    expect(row(studio('move_frame', { frame_id: 'f1', x: 10 }))?.line).toBe('frameMoveNamed');
    expect(row(studio('run_project_setup', { action: 'stop' }))?.line).toBe('appStop');
    expect(row(studio('run_project_setup', { action: 'start' }))?.line).toBe('appStart');
  });

  it('uses the running half while the call runs and the done half once it settles', () => {
    expect(row(studio('list_frames', {}, { displayStatus: 'in_progress' }))?.sentence).toBe('canvasList:running ');
    expect(row(studio('list_frames'))?.sentence).toBe('canvasList:done ');
  });

  it('reads a Studio tool on Codex, named bare, the same as on Claude', () => {
    expect(row(call('read_artifact', { input: { artifactId: 'a1' } }))?.line).toBe('artifactReadNamed');
  });

  it('gives an unknown tool and a connector a line that carries no tool name', () => {
    expect(row(studio('a_tool_from_the_future'))?.line).toBe('other');
    expect(row(call('SomeNewBuiltIn'))?.line).toBe('other');
    const connector = row(call('mcp__figma__get_node'));
    expect(connector?.line).toBe('connector');
    expect(connector?.sentence).not.toContain('get_node');
  });

  it('asks a helper in the agent’s words, lowered to read mid-sentence', () => {
    expect(row(call('Task', { input: { description: 'Explore the header' } }))?.sentence).toBe('helper:done explore the header');
  });
});

describe('a call whose work shows in its own surface draws no line (ONL-2960)', () => {
  const question = call('AskUserQuestion', {
    displayStatus: 'awaiting_approval',
    status: 'pending',
    permission: { requestId: 'r1', options: [], questions: [{ question: 'Which component?', header: 'Component', options: [] }] },
  });

  it('draws no shimmering row above an open question, and keeps the call so its card renders', () => {
    expect(classifyToolCalls([question], lines)).toEqual([]);
    expect(leavesNoTrace(question, lines)).toBe(false);
  });

  it('draws no row for an answered question, only its answers', () => {
    const answered = { ...question, displayStatus: 'completed' as const, status: 'completed' as const, permission: undefined, answeredQuestions: { questions: [], answers: {} } };
    expect(classifyToolCalls([answered], lines).map((node) => node.kind)).toEqual(['answered']);
    expect(leavesNoTrace(answered, lines)).toBe(false);
  });

  it('draws no row above any card waiting on approval, until it is approved', () => {
    const asking = call('Bash', { input: { command: 'rm -rf dist' }, displayStatus: 'awaiting_approval', status: 'pending', permission: { requestId: 'r2', options: [] } });
    expect(classifyToolCalls([asking], lines)).toEqual([]);
    expect(classifyToolCalls([{ ...asking, displayStatus: 'in_progress', status: 'in_progress' }], lines)).toHaveLength(1);
  });

  it('leaves Studio’s own bookkeeping out of the chat entirely', () => {
    for (const leaf of ['waiting_on', 'frame_working', 'server_running', 'clear_frame_quote']) {
      expect(leavesNoTrace(studio(leaf), lines)).toBe(true);
    }
    for (const name of ['TaskCreate', 'TaskUpdate', 'ToolSearch']) expect(leavesNoTrace(call(name), lines)).toBe(true);
  });

  it('keeps a row for work the chat is the only record of', () => {
    expect(leavesNoTrace(studio('create_frame', { name: 'Pricing' }), lines)).toBe(false);
  });
});

describe('an approval card names the action in the same words (ONL-2960)', () => {
  it('says what a command would do instead of the shell’s name', () => {
    const asking = call('Bash', { title: 'Bash', input: { command: 'git push', description: 'Push the branch' }, displayStatus: 'awaiting_approval', permission: { requestId: 'r', options: [] } });
    expect(subjectRowFor(asking, lines, verbs).verb).toBe('runing');
  });

  it('says what a Studio tool would do', () => {
    const asking = studio('delete_page', { page_id: 'p1' }, { title: 'studio', target: 'delete page', displayStatus: 'awaiting_approval', permission: { requestId: 'r', options: [] } });
    expect(unfilled(subjectRowFor(asking, lines, verbs).verb)).toBe('pageDeleteNamed:running Mobile');
  });
});
