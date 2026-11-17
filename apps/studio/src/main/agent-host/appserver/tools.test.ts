import { describe, expect, it } from 'bun:test';
import type { NextTask } from '@studio/events';

import {
  APPSERVER_APPROVAL_TOOLS,
  appServerToolNames,
  appServerToolRunner,
  appServerToolSpecs,
  toContentItems,
} from './tools.js';
import { studioToolDefinitions, type StudioToolSinks } from '../studio-tools.js';
import { artifactTools } from '../artifact-tools.js';
import {
  CAPTURE_FRAME_TOOL_NAME,
  DELETE_PROJECT_FILE_TOOL_NAME,
  DELETE_PAGE_TOOL_NAME,
  REMOVE_FRAME_TOOL_NAME,
  SET_FRAME_URL_TOOL_NAME,
  REMOVE_FRAMES_TOOL_NAME,
  REDO_CANVAS_TOOL_NAME,
  RENAME_PROJECT_TOOL_NAME,
  SERVER_RUNNING_TOOL_NAME,
  SUGGEST_NEXT_TASKS_TOOL_NAME,
  UNDO_CANVAS_TOOL_NAME,
} from '../tool-names.js';

const node = { id: 'f1', type: 'frame', content: { homeUrl: 'http://localhost:3000' } };
const page = { id: 'pg_1', name: 'Page 1', divider: false, current: true, objects: 1 };

function sinks(overrides: Partial<StudioToolSinks> = {}): StudioToolSinks {
  return {
    onArtifact: async () => ({ ok: false, reason: 'inert' }),
    onServerRunning: () => undefined,
    onFrameWorking: () => undefined,
    onWaitingOn: () => undefined,
    onSuggestNextTasks: () => undefined,
    onClipNextTaskPictures: (_frameId, targets) => Promise.resolve(targets.map(() => ({ ok: false as const, reason: 'project-closed' as const }))),
    onFrameUrl: () => Promise.resolve({ ok: true, node } as never),
    onRenameProject: () => Promise.resolve({ ok: true, name: 'Pricing Page', branchName: 'x/pricing-page' }),
    onCreateProjectTab: () => Promise.resolve({ ok: true as const, workspaceName: 'teal-skylark', link: 'onlook://project/acme/workspace/teal-skylark' }),
    onListFrames: () => Promise.resolve([node]),
    onListPages: () => Promise.resolve([page]),
    onCreatePage: () => Promise.resolve({ ok: true as const, page }),
    onRenamePage: () => Promise.resolve({ ok: true as const, page }),
    onReorderPage: () => Promise.resolve({ ok: true as const, page }),
    onDeletePage: () =>
      Promise.resolve({ ok: true as const, removed: { name: 'Checkout', objects: 2 }, pages: [page] }),
    onMoveNodesToPage: () =>
      Promise.resolve({ ok: true as const, page: { id: 'pg_1', name: 'Page 1' }, nodes: [node] }),
    onCreateFrame: () => Promise.resolve({ ok: true, node }),
    onClearFrameQuote: () => Promise.resolve({ ok: true }),
    onMoveFrame: () => Promise.resolve({ ok: true, node }),
    onMoveFrames: () => Promise.resolve({ ok: true, nodes: [node] }),
    onDuplicateFrames: () => Promise.resolve({ ok: true, nodes: [node] }),
    onRenameFrame: () => Promise.resolve({ ok: true, node }),
    onReorderFrame: () => Promise.resolve({ ok: true, node }),
    onCreateText: () => Promise.resolve({ ok: true, node }),
    onSetText: () => Promise.resolve({ ok: true, node }),
    onCreateImage: () => Promise.resolve({ ok: true, node }),
    onRemoveFrame: () => Promise.resolve({ ok: true, removed: { name: 'Home' }, frames: [] }),
    onRemoveFrames: () => Promise.resolve({ ok: true, removed: [{ name: 'Home' }], frames: [] }),
    onEvaluateInFrame: () => Promise.resolve({ ok: true, value: '1' } as never),
    onCaptureFrame: () => Promise.resolve({ ok: true, pngBase64: 'QUJD' } as never),
    onReadFrame: () => Promise.resolve({ ok: true as const, text: '- link "Home" [ref=e1]' }),
    onUndoCanvas: () => Promise.resolve({ ok: true, applied: false, frames: [] }),
    onRedoCanvas: () => Promise.resolve({ ok: true, applied: false, frames: [] }),
    ...overrides,
  };
}

describe('the declaration codex receives', () => {
  it('exposes bounded targeted artifact edits to Claude and Codex through the same schema', async () => {
    const calls: unknown[] = [];
    const configured = sinks({ onArtifact: async (verb, input) => {
      calls.push({ verb, input });
      return { ok: true, value: { updated: true } };
    } });
    const input = { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', edits: [{ path: 'pages/hero.css', oldText: 'red', newText: 'blue' }] };
    const claude = artifactTools(configured.onArtifact).find((definition) => definition.name === 'set_artifact');
    expect(claude).toBeDefined();
    const shape = claude?.inputSchema as unknown as Record<string, import('zod').z.ZodTypeAny>;
    expect(shape['edits']?.safeParse(input.edits).success).toBe(true);
    expect(shape['edits']?.safeParse([]).success).toBe(false);
    expect(shape['edits']?.safeParse([{ path: 'pages/hero.css', oldText: '', newText: 'blue' }]).success).toBe(false);
    expect(shape['edits']?.safeParse(Array.from({ length: 129 }, () => input.edits[0])).success).toBe(false);
    const codex = appServerToolSpecs(configured).find((spec) => spec.name === 'set_artifact');
    const properties = codex?.inputSchema['properties'] as Record<string, Record<string, unknown>>;
    expect(properties['edits']).toMatchObject({ type: 'array', minItems: 1, maxItems: 128 });
    expect(codex?.description).toBe(claude?.description);
    expect(artifactTools(configured.onArtifact).find((definition) => definition.name === 'create_artifact')?.inputSchema).not.toHaveProperty('edits');
    await claude?.handler(input as never, {} as never);
    await appServerToolRunner(configured)('set_artifact', input);
    expect(calls).toEqual([{ verb: 'set', input }, { verb: 'set', input }]);
  });

  it('runs all six artifact verbs through the same scoped reporter as Claude', async () => {
    const calls: string[] = [];
    const configured = sinks({ onArtifact: async (verb) => {
      calls.push(verb);
      return { ok: true, value: { received: verb } };
    } });
    const names = ['create_artifact', 'read_artifact', 'set_artifact', 'import_artifact', 'place_artifact', 'fork_artifact'];
    const runner = appServerToolRunner(configured);
    for (const name of names) {
      const result = await runner(name, { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Idea', path: 'idea.html' });
      expect(result).toBeDefined();
    }
    expect(calls).toEqual(['create', 'read', 'set', 'import', 'place', 'fork']);
  });

  it('offers every Studio verb the Claude path offers', () => {
    const everyVerb = studioToolDefinitions(sinks()).map((d) => d.name);
    expect(appServerToolNames(sinks())).toEqual(everyVerb);
  });

  it('declares rename_project with the same one-field schema as the Claude path (ONL-2181)', () => {
    const spec = appServerToolSpecs(sinks()).find((s) => s.name === RENAME_PROJECT_TOOL_NAME);
    expect(spec).toBeDefined();
    expect(spec?.inputSchema['required']).toEqual(['name']);
    expect(Object.keys(spec?.inputSchema['properties'] as Record<string, unknown>)).toEqual(['name']);
    expect(APPSERVER_APPROVAL_TOOLS).not.toContain(RENAME_PROJECT_TOOL_NAME);
  });

  it('declares suggest_next_tasks capped at three tasks and runs it without asking (ONL-2899)', async () => {
    const spec = appServerToolSpecs(sinks()).find((s) => s.name === SUGGEST_NEXT_TASKS_TOOL_NAME);
    const properties = spec?.inputSchema['properties'] as Record<string, Record<string, unknown>> | undefined;
    const tasks = properties?.['tasks'];
    expect(tasks?.['maxItems']).toBe(3);
    expect(APPSERVER_APPROVAL_TOOLS).not.toContain(SUGGEST_NEXT_TASKS_TOOL_NAME);
    const offered: (readonly NextTask[])[] = [];
    const task = { title: 'Show it on mobile', line: 'At 390 wide.' };
    const result = await appServerToolRunner(sinks({ onSuggestNextTasks: (t) => offered.push(t) }))(SUGGEST_NEXT_TASKS_TOOL_NAME, { tasks: [task] });
    expect(result.success).toBe(true);
    expect(offered).toEqual([[task]]);
  });

  it('declares each next task as a closed object of title and line (ONL-2977)', () => {
    const spec = appServerToolSpecs(sinks()).find((s) => s.name === SUGGEST_NEXT_TASKS_TOOL_NAME);
    const properties = spec?.inputSchema['properties'] as Record<string, Record<string, unknown>> | undefined;
    const item = properties?.['tasks']?.['items'] as Record<string, unknown> | undefined;
    expect(item?.['type']).toBe('object');
    expect(item?.['required']).toEqual(['title', 'line']);
    expect(item?.['additionalProperties']).toBe(false);
  });

  it('names pass codex validation', () => {
    for (const spec of appServerToolSpecs(sinks())) {
      expect(spec.name).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(spec.name.length).toBeLessThanOrEqual(128);
    }
  });

  it('emits object schemas with no $schema key', () => {
    for (const spec of appServerToolSpecs(sinks())) {
      expect(spec.inputSchema['type']).toBe('object');
      expect(spec.inputSchema['additionalProperties']).toBe(false);
      expect(spec.inputSchema).not.toHaveProperty('$schema');
    }
  });
});

describe('the approval gate', () => {
  it('asks about history-sensitive actions and a page delete; a frame removal is undoable (ONL-2384, ONL-2488)', () => {
    expect(APPSERVER_APPROVAL_TOOLS).not.toContain(REMOVE_FRAME_TOOL_NAME);
    expect(APPSERVER_APPROVAL_TOOLS).not.toContain(REMOVE_FRAMES_TOOL_NAME);
    expect(APPSERVER_APPROVAL_TOOLS).toEqual([
      'save_project_setup',
      'run_project_setup',
      'save_attachment',
      DELETE_PROJECT_FILE_TOOL_NAME,
      UNDO_CANVAS_TOOL_NAME,
      REDO_CANVAS_TOOL_NAME,
      DELETE_PAGE_TOOL_NAME,
    ]);
  });
});

describe('results going back to codex', () => {
  it('turns an MCP image block into an inline data URI', () => {
    const items = toContentItems({
      content: [
        { type: 'image', data: 'QUJD', mimeType: 'image/png' },
        { type: 'text', text: 'a screenshot' },
      ],
    });
    expect(items[0]).toEqual({ type: 'inputImage', imageUrl: 'data:image/png;base64,QUJD' });
    expect(items[1]).toEqual({ type: 'inputText', text: 'a screenshot' });
  });

  it('runs a tool by name and reports success', async () => {
    const result = await appServerToolRunner(sinks())(SERVER_RUNNING_TOOL_NAME, { port: 3000 });
    expect(result.success).toBe(true);
    expect(result.contentItems[0]?.type).toBe('inputText');
  });

  it('reports a sink that said no as success:false, so codex ends the row failed (ONL-2304)', async () => {
    const runner = appServerToolRunner(
      sinks({ onCaptureFrame: () => Promise.resolve({ ok: false, reason: 'the page did not respond in time' } as never) }),
    );
    const result = await runner(CAPTURE_FRAME_TOOL_NAME, { frame_id: 'f1' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.contentItems)).toContain('did not respond');
    const declined = appServerToolRunner(sinks({ onFrameUrl: () => Promise.resolve({ ok: false, reason: 'no frame "ghost"' } as never) }));
    expect((await declined(SET_FRAME_URL_TOOL_NAME, { frame_id: 'ghost', url: 'http://localhost:3000' })).success).toBe(false);
    expect((await appServerToolRunner(sinks())(SET_FRAME_URL_TOOL_NAME, { frame_id: 'f1', url: 'http://localhost:3000' })).success).toBe(true);
  });

  it('answers an unknown tool instead of leaving codex waiting', async () => {
    const result = await appServerToolRunner(sinks())('no_such_tool', {});
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.contentItems)).toContain('no_such_tool');
  });

  it('answers a throwing sink instead of leaving codex waiting', async () => {
    const runner = appServerToolRunner(
      sinks({
        onRemoveFrame: () => Promise.reject(new Error('canvas is gone')),
      }),
    );
    const result = await runner(REMOVE_FRAME_TOOL_NAME, { frame_id: 'f1' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.contentItems)).toContain('canvas is gone');
  });
});
