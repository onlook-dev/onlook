// Pins the SDK's own encoding of `alwaysLoad` and `destructiveHint` (0.3.220); both fail silently when wrong.

import { afterEach, describe, expect, it } from 'bun:test';
import { nextTaskPicturesIn, type CanvasNode, type NextTask } from '@studio/events';
import type { FramePicture, PictureTarget } from '../canvas/clip.js';
import { APPSERVER_APPROVAL_TOOLS } from './appserver/tools.js';
import {
  ARTIFACT_TOOL_NAMES,
  CREATE_IMAGE_TOOL_NAME,
  CREATE_PAGE_TOOL_NAME,
  CREATE_SECTION_TOOL_NAME,
  CREATE_TEXT_TOOL_NAME,
  DELETE_PROJECT_FILE_TOOL_NAME,
  DELETE_PAGE_TOOL_NAME,
  LIST_FRAMES_TOOL_NAME,
  LIST_PAGES_TOOL_NAME,
  MOVE_NODES_TO_PAGE_TOOL_NAME,
  READ_FRAME_TOOL_NAME,
  REDO_CANVAS_TOOL_NAME,
  REMOVE_FRAME_TOOL_NAME,
  REMOVE_FRAMES_TOOL_NAME,
  RENAME_PAGE_TOOL_NAME,
  REORDER_PAGE_TOOL_NAME,
  SET_TEXT_TOOL_NAME,
  STUDIO_AUTO_APPROVED_TOOLS,
  SUGGEST_NEXT_TASKS_TOOL_NAME,
  UNDO_CANVAS_TOOL_NAME,
} from './tool-names.js';
import {
  FRAME_WORKING_TOOL_NAME,
  WAITING_ON_TOOL_NAME,
  frameStatusTool,
  waitingOnTool,
  renameProjectTool,
  nextTaskPictures,
  PICTURE_NOTES_LABEL,
  suggestNextTasksWithSketchesTool,
  SERVER_RUNNING_TOOL_NAME,
  serverRunningTool,
  studioToolDefinitions,
  setFrameUrlTool,
  studioToolServer,
  STUDIO_MCP_SERVER,
  type FrameUrlOutcome,
  createProjectTabTool,
  type CreateProjectTabOutcome,
} from './studio-tools.js';

const freshNode: CanvasNode = {
  id: 'fr_1',
  pageId: 'page-1',
  kind: 'browser',
  name: 'localhost:5173',
  x: 0,
  y: 0,
  width: 1280,
  height: 800,
  order: 0,
  content: { homeUrl: 'http://localhost:5173/' },
};

const landed = (): FrameUrlOutcome => ({ ok: true, node: freshNode });

const noSinks = {
  onDeleteProjectFile: () => ({ ok: false as const, reason: 'inert' }),
  onServerRunning: () => undefined,
  onFrameWorking: () => undefined,
  onWaitingOn: () => undefined,
  onFrameUrl: async () => landed(),
  onRenameProject: async () => ({ ok: false as const, reason: 'inert' }),
  onCreateProjectTab: async () => ({ ok: false as const, reason: 'inert' }),
  onSuggestNextTasks: () => undefined,
  onClipNextTaskPictures: (_frameId: string, targets: readonly unknown[]) => Promise.resolve(targets.map(() => ({ ok: false as const, reason: 'project-closed' as const }))),
  onArtifact: async () => ({ ok: false as const, reason: 'inert' }),
  onListFrames: async () => [],
  onCreateFrame: async () => landed(),
  onClearFrameQuote: async () => ({ ok: true as const }),
  onMoveFrame: async () => landed(),
  onMoveFrames: async () => ({ ok: true as const, nodes: [freshNode] }),
  onDuplicateFrames: async () => ({ ok: true as const, nodes: [freshNode] }),
  onRenameFrame: async () => landed(),
  onReorderFrame: async () => landed(),
  onCreateText: async () => landed(),
  onSetText: async () => landed(),
  onCreateImage: async () => landed(),
  onRemoveFrame: async () => ({ ok: true as const, removed: { name: 'x' }, frames: [] }),
  onRemoveFrames: async () => ({ ok: true as const, removed: [{ name: 'x' }], frames: [] }),
  onEvaluateInFrame: async () => ({ ok: true as const, value: '1' }),
  onCaptureFrame: async () => ({ ok: true as const, pngBase64: 'iVBORw0KGgo=' }),
  onReadFrame: async () => ({ ok: true as const, text: '- link "Home" [ref=e1]' }),
  onUndoCanvas: async () => ({ ok: true as const, applied: false, frames: [] }),
  onRedoCanvas: async () => ({ ok: true as const, applied: false, frames: [] }),
  onListPages: async () => [],
  onCreatePage: async () => ({ ok: false as const, reason: 'inert' }),
  onRenamePage: async () => ({ ok: false as const, reason: 'inert' }),
  onReorderPage: async () => ({ ok: false as const, reason: 'inert' }),
  onDeletePage: async () => ({ ok: false as const, reason: 'inert' }),
  onMoveNodesToPage: async () => ({ ok: false as const, reason: 'inert' }),
};

describe('every registered tool', () => {
  const registered = studioToolDefinitions(noSinks);
  const destructive: readonly string[] = [
    DELETE_PROJECT_FILE_TOOL_NAME,
    ARTIFACT_TOOL_NAMES.import,
    ARTIFACT_TOOL_NAMES.set,
    REMOVE_FRAME_TOOL_NAME,
    REMOVE_FRAMES_TOOL_NAME,
    DELETE_PAGE_TOOL_NAME,
  ];
  const readOnly: readonly string[] = [
    ARTIFACT_TOOL_NAMES.read,
    LIST_FRAMES_TOOL_NAME,
    LIST_PAGES_TOOL_NAME,
    READ_FRAME_TOOL_NAME,
    SERVER_RUNNING_TOOL_NAME,
    FRAME_WORKING_TOOL_NAME,
    WAITING_ON_TOOL_NAME,
    SUGGEST_NEXT_TASKS_TOOL_NAME,
  ];

  it('is loaded in the turn-1 prompt rather than deferred behind tool search', () => {
    for (const { name, _meta } of registered) {
      expect(`${name}: ${String(_meta?.['anthropic/alwaysLoad'])}`).toBe(`${name}: true`);
    }
  });

  it('states its destructive hint, which the MCP default leaves true: removal is destructive and every other verb is not', () => {
    for (const { name, annotations } of registered) {
      expect(`${name}: ${String(annotations?.destructiveHint)}`).toBe(`${name}: ${String(destructive.includes(name))}`);
    }
  });

  it('states its read-only hint: the reads and the signals are read-only and every write is not', () => {
    for (const { name, annotations } of registered) {
      expect(`${name}: ${String(annotations?.readOnlyHint)}`).toBe(`${name}: ${String(readOnly.includes(name))}`);
    }
  });

  it('carries a human title', () => {
    for (const { name, annotations } of registered) {
      expect(`${name}: ${typeof annotations?.title}`).toBe(`${name}: string`);
    }
  });

  it('writes a text node, its string and an image without an approval card, and leaves the history verbs asking (ONL-2486)', () => {
    for (const name of [CREATE_TEXT_TOOL_NAME, SET_TEXT_TOOL_NAME, CREATE_IMAGE_TOOL_NAME]) {
      expect(`${name}: ${String(STUDIO_AUTO_APPROVED_TOOLS.includes(`mcp__${STUDIO_MCP_SERVER}__${name}`))}`).toBe(
        `${name}: true`,
      );
      expect(APPSERVER_APPROVAL_TOOLS).not.toContain(name);
    }
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

  it('imports and edits scoped artifacts without asking on either harness, following the in-app report (ONL-2763)', () => {
    expect(STUDIO_AUTO_APPROVED_TOOLS).toContain(`mcp__${STUDIO_MCP_SERVER}__${ARTIFACT_TOOL_NAMES.set}`);
    expect(APPSERVER_APPROVAL_TOOLS).not.toContain(ARTIFACT_TOOL_NAMES.set);
    expect(STUDIO_AUTO_APPROVED_TOOLS).toContain(`mcp__${STUDIO_MCP_SERVER}__${ARTIFACT_TOOL_NAMES.import}`);
    expect(APPSERVER_APPROVAL_TOOLS).not.toContain(ARTIFACT_TOOL_NAMES.import);
  });

  it('offers the three new canvas verbs', () => {
    const names = registered.map(({ name }) => name);
    for (const name of [CREATE_TEXT_TOOL_NAME, SET_TEXT_TOOL_NAME, CREATE_IMAGE_TOOL_NAME]) {
      expect(names).toContain(name);
    }
  });

  it('arranges pages without an approval card and raises one before a page is deleted (ONL-2488)', () => {
    const names = registered.map(({ name }) => name);
    for (const name of [
      LIST_PAGES_TOOL_NAME,
      CREATE_PAGE_TOOL_NAME,
      RENAME_PAGE_TOOL_NAME,
      REORDER_PAGE_TOOL_NAME,
      MOVE_NODES_TO_PAGE_TOOL_NAME,
      DELETE_PAGE_TOOL_NAME,
    ]) {
      expect(names).toContain(name);
    }
    for (const name of [
      LIST_PAGES_TOOL_NAME,
      CREATE_PAGE_TOOL_NAME,
      RENAME_PAGE_TOOL_NAME,
      REORDER_PAGE_TOOL_NAME,
      MOVE_NODES_TO_PAGE_TOOL_NAME,
    ]) {
      expect(`${name}: ${String(STUDIO_AUTO_APPROVED_TOOLS.includes(`mcp__${STUDIO_MCP_SERVER}__${name}`))}`).toBe(
        `${name}: true`,
      );
    }
    expect(STUDIO_AUTO_APPROVED_TOOLS).not.toContain(
      `mcp__${STUDIO_MCP_SERVER}__${DELETE_PAGE_TOOL_NAME}`,
    );
    expect(APPSERVER_APPROVAL_TOOLS).toContain(DELETE_PAGE_TOOL_NAME);
  });

  it('never auto-approves a counterpart that closes or removes a tab (ONL-2212)', () => {
    for (const name of STUDIO_AUTO_APPROVED_TOOLS) {
      expect(name).not.toMatch(/close_project_tab|remove_project_tab/);
    }
  });
});

describe('the create_section tool behind its flag (ONL-2661)', () => {
  const offered = (): string[] => studioToolDefinitions(noSinks).map((definition) => definition.name);
  const held = process.env['STUDIO_FLAGS'];
  afterEach(() => {
    if (held === undefined) delete process.env['STUDIO_FLAGS'];
    else process.env['STUDIO_FLAGS'] = held;
  });

  it('is withheld on a build whose Canvas draws no Section', () => {
    delete process.env['STUDIO_FLAGS'];
    expect(offered()).not.toContain(CREATE_SECTION_TOOL_NAME);
  });

  it('is offered where the flag is on', () => {
    process.env['STUDIO_FLAGS'] = 'sections';
    expect(offered()).toContain(CREATE_SECTION_TOOL_NAME);
  });
});

describe('the suggest_next_tasks Studio offers (ONL-2959)', () => {
  it('takes only the tasks, each a title and a line: the agent’s own last reply is what leads into the cards', () => {
    const offered = studioToolDefinitions(noSinks).find((definition) => definition.name === 'suggest_next_tasks')!;
    expect(Object.keys(offered.inputSchema)).toEqual(['tasks']);
    const tasks = (offered.inputSchema as Record<string, { safeParse: (value: unknown) => { success: boolean } }>)['tasks']!;
    expect(tasks.safeParse([{ title: 'Tighten the hero', line: 'Less space between the headline and the button.' }]).success).toBe(true);
    expect(tasks.safeParse(['Tighten the hero']).success).toBe(false);
  });
});

describe('the server_running tool', () => {
  it('hands the reported port to the app', async () => {
    const reports: (number | undefined)[] = [];
    const definition = serverRunningTool((port) => {
      reports.push(port);
    });

    await definition.handler({ port: 4173, cwd: undefined }, {});
    expect(reports).toEqual([4173]);
  });

  it('accepts a report with no port at all', async () => {
    const reports: (number | undefined)[] = [];
    const definition = serverRunningTool((port) => {
      reports.push(port);
    });

    await definition.handler({ port: undefined, cwd: undefined }, {});
    expect(reports).toEqual([undefined]);
  });

  it('answers with the frame Studio placed, or why it placed none, once the report settles (ONL-2424)', async () => {
    const reply = async (ack: Awaited<ReturnType<Parameters<typeof serverRunningTool>[0]>>): Promise<string> => {
      const result = await serverRunningTool(async () => ack).handler({ port: 5173, cwd: undefined }, {});
      return result.content.map((block) => ('text' in block ? block.text : '')).join(' ');
    };

    const placed = await reply({ frame: { kind: 'placed', node: freshNode } });
    expect(placed).toContain(freshNode.id);
    expect(placed).toContain(freshNode.content.homeUrl);

    const shown = await reply({ frame: { kind: 'already-shown', node: freshNode } });
    expect(shown).toContain(freshNode.id);

    const declined = await reply({ frame: { kind: 'not-placed', reason: "this session's project is no longer open" } });
    expect(declined).toContain("this session's project is no longer open");
    expect(declined).not.toContain(freshNode.id);
  });

  it('takes only a port and a cwd: retiring the starter is never an argument (ONL-2152)', () => {
    const definition = serverRunningTool(() => undefined);
    expect(Object.keys(definition.inputSchema)).toEqual(['port', 'cwd']);
  });

  it('names the starter port the sink is retiring beside the reported port', async () => {
    const definition = serverRunningTool(() => ({ retiringStarterPort: 4712 }));
    const result = await definition.handler({ port: 5173, cwd: undefined }, {});
    const text = result.content.map((block) => ('text' in block ? block.text : '')).join(' ');

    expect(text).toContain('4712');
    expect(text).toContain('5173');
  });

  it('builds an in-process SDK server, not a subprocess', () => {
    const server = studioToolServer(noSinks);
    expect(server.type).toBe('sdk');
    expect(server.name).toBe(STUDIO_MCP_SERVER);
    expect(server.instance).toBeDefined();
  });
});

describe('the waiting_on tool', () => {
  it("hands the agent's words to the sink verbatim", async () => {
    const said: string[] = [];
    await waitingOnTool((what) => said.push(what)).handler({ what: 'a font choice' }, {});
    expect(said).toEqual(['a font choice']);
  });
});

describe('the frame_working tool', () => {
  it('hands the frame and the agent\'s words to the sink verbatim', async () => {
    const marked: unknown[] = [];
    const definition = frameStatusTool((frameId, words) => {
      marked.push([frameId, words]);
    });

    await definition.handler({ frame_id: 'fr_1', done: 'Recolored', what: 'Order button' }, {});

    expect(marked).toEqual([['fr_1', { done: 'Recolored', what: 'Order button' }]]);
  });
});

describe('the set_frame_url tool', () => {
  it('hands the frame and the address to the sink verbatim, forming no opinion about either', async () => {
    const asked: [string, string][] = [];
    const definition = setFrameUrlTool(async (frameId, url) => {
      asked.push([frameId, url]);
      return landed();
    });

    await definition.handler({ frame_id: 'fr_1', url: 'http://localhost:5173' }, {});
    await definition.handler({ frame_id: 'fr_2', url: '5173' }, {});

    expect(asked).toEqual([
      ['fr_1', 'http://localhost:5173'],
      ['fr_2', '5173'],
    ]);
  });

  it('points the agent at the registered tool that lists frame ids (ONL-1995)', () => {
    const definition = setFrameUrlTool(noSinks.onFrameUrl);
    expect(definition.description).toContain(LIST_FRAMES_TOOL_NAME);
  });

  it('returns the landed node, id and address, when the write lands', async () => {
    const definition = setFrameUrlTool(async () => landed());
    const result = await definition.handler({ frame_id: 'fr_1', url: '5173' }, {});
    const text = result.content.map((block) => ('text' in block ? block.text : '')).join(' ');

    expect(text).toContain('http://localhost:5173/');
    expect(text).toContain('"fr_1"');
  });

  it('relays a decline as an error result carrying the reason, never as success', async () => {
    const definition = setFrameUrlTool(async () => ({
      ok: false,
      reason: 'no frame "fr_gone" on this canvas',
    }));
    const result = await definition.handler({ frame_id: 'fr_gone', url: '5173' }, {});
    const text = result.content.map((block) => ('text' in block ? block.text : '')).join(' ');

    expect(result.isError).toBe(true);
    expect(text).toContain('fr_gone');
  });
});

describe('the rename_project tool (ONL-2181)', () => {
  const text = (result: { content: { type: string; text?: string }[] }): string =>
    result.content.map((block) => ('text' in block ? block.text : '')).join(' ');

  it('reports the FINAL name the sink settled on, never the name it was handed', async () => {
    const asked: string[] = [];
    const definition = renameProjectTool(async (name) => {
      asked.push(name);
      return { ok: true, name: 'Pricing Page', branchName: 'x/pricing-page' };
    });
    const result = await definition.handler({ name: 'pricing page redesign again' }, {});
    expect(asked).toEqual(['pricing page redesign again']);
    expect(text(result)).toContain('Pricing Page');
    expect(text(result)).not.toContain('pricing page redesign again');
  });

  it("relays a refusal with the sink's reason", async () => {
    const definition = renameProjectTool(async () => ({ ok: false, reason: 'the user named this project' }));
    const result = await definition.handler({ name: 'Pricing Page' }, {});
    expect(text(result)).toContain('the user named this project');
  });
});

describe('the suggest_next_tasks tool (ONL-2899)', () => {
  const text = (result: { content: { type: string; text?: string }[] }): string =>
    result.content.map((block) => ('text' in block ? block.text : '')).join(' ');

  const task = (title: string, line = 'Where it changes.') => ({ title, line });

  const noClip = async (_frameId: string, targets: readonly unknown[]): Promise<FramePicture[]> => targets.map(() => ({ ok: false, reason: 'missing-page' }));

  it('hands the tasks to the sink verbatim and tells the agent to end its turn', async () => {
    const offered: (readonly NextTask[])[] = [];
    const definition = suggestNextTasksWithSketchesTool((tasks) => offered.push(tasks), noClip);
    const tasks = [task('Show the page on mobile'), task('Try two heroes')];
    const result = await definition.handler({ tasks }, {});
    expect(offered).toEqual([tasks]);
    expect(text(result)).toContain('end your turn');
  });

  it('takes one to three tasks and nothing else', () => {
    const tasks = suggestNextTasksWithSketchesTool(() => undefined, noClip).inputSchema.tasks;
    expect(tasks.safeParse([]).success).toBe(false);
    expect(tasks.safeParse([task('a'), task('b'), task('c')]).success).toBe(true);
    expect(tasks.safeParse([task('a'), task('b'), task('c'), task('d')]).success).toBe(false);
    expect(tasks.safeParse([task('')]).success).toBe(false);
  });

  it('takes a title and a line on every task, and no other field (ONL-2977)', () => {
    const tasks = suggestNextTasksWithSketchesTool(() => undefined, noClip).inputSchema.tasks;
    expect(tasks.safeParse([{ title: 'Tighten the hero' }]).success).toBe(false);
    expect(tasks.safeParse([task('Tighten the hero', '')]).success).toBe(false);
    expect(tasks.safeParse([{ ...task('Tighten the hero'), extra: 1 }]).success).toBe(false);
    expect(tasks.safeParse([task('x'.repeat(61))]).success).toBe(false);
    expect(tasks.safeParse([task('Tighten the hero', 'x'.repeat(101))]).success).toBe(false);
  });

});

describe('next-task pictures (ONL-2977)', () => {
  const ID = (n: number): string => `0123456789abcdef-abcd1234-0000-4000-8000-00000000000${String(n)}`;
  const clipped = (id: string): FramePicture => ({ ok: true, id, source: 'element' });
  const clips = (answers: Record<string, (FramePicture | string | null)[]>) => {
    const asked: { frameId: string; targets: readonly PictureTarget[] }[] = [];
    const clip = async (frameId: string, targets: readonly PictureTarget[]): Promise<FramePicture[]> => {
      asked.push({ frameId, targets });
      return (answers[frameId] ?? targets.map(() => null)).map((answer) =>
        typeof answer === 'string' ? clipped(answer) : (answer ?? { ok: false, reason: 'capture-error' }),
      );
    };
    return { asked, clip };
  };

  it('clips every target on one frame with one call, in task order, by ref before selector', async () => {
    const { asked, clip } = clips({ f1: [ID(1), ID(2), ID(3)] });
    const { pictures, notes } = await nextTaskPictures([{ frame_id: 'f1', selector: '#title' }, { frame_id: 'f1' }, { frame_id: 'f1', ref: 'e4', selector: '.card' }], clip);
    expect(asked).toEqual([{ frameId: 'f1', targets: [{ selector: '#title' }, {}, { ref: 'e4' }] }]);
    expect(pictures).toEqual([{ clip: ID(1) }, { clip: ID(2) }, { clip: ID(3) }]);
    expect(notes).toEqual([]);
  });

  it('tells the agent which card shows the whole frame or its last picture instead of the element, and why', async () => {
    const { clip } = clips({
      f1: [{ ok: true, id: ID(1), source: 'frame', missed: 'not-in-view' }, { ok: true, id: ID(2), source: 'frame', missed: 'stale-ref' }],
      f2: [{ ok: true, id: ID(3), source: 'remembered', missed: 'timeout' }],
    });
    const { pictures, notes } = await nextTaskPictures([{ frame_id: 'f1', ref: 'e25' }, { frame_id: 'f1', ref: 'e3' }, { frame_id: 'f2', ref: 'e1' }], clip);
    expect(pictures).toEqual([{ clip: ID(1) }, { clip: ID(2) }, { clip: ID(3) }]);
    expect(notes).toEqual([
      'card 1 shows the whole frame, because its element is not in view.',
      `card 2 shows the whole frame, because its ref is not from the latest ${READ_FRAME_TOOL_NAME} of this page, or now names a different element.`,
      'card 3 shows the frame as it last loaded, because the frame could not be captured in time.',
    ]);
  });

  it('falls back to the task’s sketch when its frame has no picture at all, and to text when it named none, saying why', async () => {
    const { clip } = clips({ f1: [{ ok: false, reason: 'missing-page' }, { ok: false, reason: 'missing-page' }] });
    const { pictures, notes } = await nextTaskPictures([{ frame_id: 'f1', ref: 'e2', skeleton: 'button' }, { frame_id: 'f1', ref: 'e3' }], clip);
    expect(pictures).toEqual([{ skeleton: 'button' }, null]);
    expect(notes).toEqual(['card 1 shows a stock sketch, because the frame has no live page.', 'card 2 shows no picture, because the frame has no live page.']);
  });

  it('draws a sketch or text without any capture when no frame is named', async () => {
    const { asked, clip } = clips({});
    expect(await nextTaskPictures([{ skeleton: 'story' }, undefined, {}], clip)).toEqual({ pictures: [{ skeleton: 'story' }, null, null], notes: [] });
    expect(asked).toEqual([]);
  });

  it('falls back on every task of a frame whose clip throws, and still pictures the other frame', async () => {
    const clip = async (frameId: string): Promise<FramePicture[]> => {
      if (frameId === 'f1') throw new Error('the frame went away');
      return [clipped(ID(4))];
    };
    expect((await nextTaskPictures([{ frame_id: 'f1', skeleton: 'row' }, { frame_id: 'f2' }], clip)).pictures).toEqual([{ skeleton: 'row' }, { clip: ID(4) }]);
  });

  it('offers the cards once the pictures exist, and names each in the result the chat reads back', async () => {
    const offered: (readonly NextTask[])[] = [];
    const { clip } = clips({ f1: [ID(5)] });
    const definition = suggestNextTasksWithSketchesTool((tasks) => offered.push(tasks), clip);
    const tasks = [
      { title: 'Tighten the hero', line: 'Less space under the headline.', picture: { frame_id: 'f1', selector: 'h1' } },
      { title: 'Style the Order button', line: 'A filled, rounded button.', picture: { sketch: [{ kind: 'block' as const, x: 10, y: 10, w: 40, h: 20 }] } },
    ];
    const result = await definition.handler({ tasks }, {});
    expect(offered).toEqual([[{ title: 'Tighten the hero', line: 'Less space under the headline.' }, { title: 'Style the Order button', line: 'A filled, rounded button.' }]]);
    const resultText = result.content.map((block) => ('text' in block ? block.text : '')).join('\n');
    expect(resultText).toContain('end your turn');
    expect(nextTaskPicturesIn(resultText)).toEqual([{ clip: ID(5) }, { sketch: [{ kind: 'block', x: 10, y: 10, w: 40, h: 20 }] }]);
    expect(resultText).not.toContain(PICTURE_NOTES_LABEL);
  });

  it('puts the notes in the result after the pictures, where the chat still finds its pictures', async () => {
    const { clip } = clips({ f1: [{ ok: true, id: ID(6), source: 'frame', missed: 'not-in-view' }] });
    const definition = suggestNextTasksWithSketchesTool(() => undefined, clip);
    const result = await definition.handler({ tasks: [{ title: 'Bring in the paywall', line: 'Its screens onto the canvas.', picture: { frame_id: 'f1', ref: 'e25' } }] }, {});
    const resultText = result.content.map((block) => ('text' in block ? block.text : '')).join('\n');
    expect(nextTaskPicturesIn(resultText)).toEqual([{ clip: ID(6) }]);
    expect(resultText.split('\n').at(-1)).toBe(`${PICTURE_NOTES_LABEL}card 1 shows the whole frame, because its element is not in view.`);
  });

  it('refuses a picture field it does not know', () => {
    const tasks = suggestNextTasksWithSketchesTool(() => undefined, clips({}).clip).inputSchema.tasks;
    const task = { title: 'Tighten the hero', line: 'Less space under the headline.' };
    expect(tasks.safeParse([{ ...task, picture: { frame_id: 'f1', selector: 'h1' } }]).success).toBe(true);
    expect(tasks.safeParse([{ ...task, picture: { frame_id: 'f1', skeleton: 'row' } }]).success).toBe(false);
    expect(tasks.safeParse([{ ...task, picture: { skeleton: 'hero' } }]).success).toBe(false);
    expect(tasks.safeParse([{ ...task, picture: { frame_id: 'f1', html: '<b>' } }]).success).toBe(false);
    expect(tasks.safeParse([{ ...task, picture: { frame_id: 'f1', ref: 'e12' } }]).success).toBe(true);
    expect(tasks.safeParse([{ ...task, picture: { frame_id: 'f1', ref: 'button.primary' } }]).success).toBe(false);
  });

  it('names only the picture fields its schema takes', () => {
    const fields = [
      { word: /\bframe\b/, picture: { frame_id: 'f1' } },
      { word: /\bselector\b/, picture: { frame_id: 'f1', selector: 'h1' } },
      { word: /\bskeleton\b/, picture: { skeleton: 'row' } },
      { word: /\bsketch\b/, picture: { sketch: [{ kind: 'block', x: 0, y: 0, w: 10, h: 10 }] } },
    ];
    const task = { title: 'Tighten the hero', line: 'Less space under the headline.' };
    for (const definition of [suggestNextTasksWithSketchesTool(() => undefined, clips({}).clip)]) {
      for (const { word, picture } of fields) {
        if (!word.test(definition.description)) continue;
        expect({ word: String(word), parses: definition.inputSchema.tasks.safeParse([{ ...task, picture }]).success }).toEqual({ word: String(word), parses: true });
      }
    }
  });
});

describe('a next task that adds something new carries the agent’s sketch (ONL-2959)', () => {
  const ID = '0123456789abcdef-abcd1234-0000-4000-8000-000000000009';
  const phone = [{ kind: 'outline' as const, x: 32, y: 4, w: 36, h: 92 }, { kind: 'heading' as const, x: 38, y: 14, w: 24 }, { kind: 'block' as const, x: 38, y: 74, w: 24, h: 12 }];
  const noClip = async (_frameId: string, targets: readonly unknown[]): Promise<FramePicture[]> => targets.map(() => ({ ok: false, reason: 'missing-page' }));

  it('pictures a task with its sketch, and a task with a sketch and a clip by the clip', async () => {
    const clip = async (): Promise<FramePicture[]> => [{ ok: true, id: ID, source: 'frame' }];
    expect((await nextTaskPictures([{ sketch: phone }, { frame_id: 'f1', sketch: phone }], clip)).pictures).toStrictEqual([{ sketch: phone }, { clip: ID }]);
  });

  it('falls back from a failed clip to the sketch before the stock skeleton', async () => {
    expect((await nextTaskPictures([{ frame_id: 'f1', sketch: phone, skeleton: 'row' }], noClip)).pictures).toStrictEqual([{ sketch: phone }]);
  });

  it('names the sketch in the result the chat reads back', async () => {
    const definition = suggestNextTasksWithSketchesTool(() => undefined, noClip);
    const result = await definition.handler({ tasks: [{ title: 'Wireframe the payment screen', line: 'A phone screen for paying.', picture: { sketch: phone } }] }, {});
    const resultText = result.content.map((block) => ('text' in block ? block.text : '')).join('\n');
    expect(nextTaskPicturesIn(resultText)).toStrictEqual([{ sketch: phone }]);
  });

  it('refuses a sketch past the cap, outside the box, or of a shape it cannot draw', () => {
    const tasks = suggestNextTasksWithSketchesTool(() => undefined, noClip).inputSchema.tasks;
    const task = (sketch: unknown) => [{ title: 'Wireframe the payment screen', line: 'A phone screen.', picture: { sketch } }];
    expect(tasks.safeParse(task(phone)).success).toBe(true);
    expect(tasks.safeParse(task(Array.from({ length: 13 }, () => phone[1]))).success).toBe(false);
    expect(tasks.safeParse(task([{ kind: 'block', x: 0, y: 0, w: 140, h: 10 }])).success).toBe(false);
    expect(tasks.safeParse(task([{ kind: 'path', x: 0, y: 0, w: 10 }])).success).toBe(false);
    expect(tasks.safeParse(task([{ kind: 'text', x: 0, y: 0, w: 10, fill: 'red' }])).success).toBe(false);
    expect(tasks.safeParse(task([])).success).toBe(false);
  });
});

describe('next-task pictures Studio offers (ONL-2977)', () => {
  const tasks = () => (studioToolDefinitions(noSinks).find((definition) => definition.name === 'suggest_next_tasks')!.inputSchema as Record<string, { safeParse: (value: unknown) => { success: boolean } }>)['tasks']!;

  it('takes a clip and a sketch', () => {
    expect(tasks().safeParse([{ title: 'Tighten the hero', line: 'Less space.', picture: { frame_id: 'frame-1' } }]).success).toBe(true);
    expect(tasks().safeParse([{ title: 'Add a returning rider’s flow', line: 'A second path.', picture: { sketch: [{ kind: 'text', x: 10, y: 10, w: 40 }] } }]).success).toBe(true);
  });
});

describe('the create_project_tab tool (ONL-2212)', () => {
  const opened = {
    ok: true as const,
    workspaceName: 'teal-skylark',
    link: 'onlook://project/github.com%2Facme%2Fapp/workspace/teal-skylark',
  };
  const body = async (outcome: CreateProjectTabOutcome): Promise<{ text: string; isError: boolean }> => {
    const definition = createProjectTabTool(async () => outcome);
    const result = await definition.handler({}, undefined as never);
    return {
      text: result.content.map((block) => ('text' in block ? block.text : '')).join(' '),
      isError: result.isError === true,
    };
  };

  it('takes no arguments — the repo is the session own', () => {
    expect(Object.keys(createProjectTabTool(async () => opened).inputSchema)).toEqual([]);
  });

  it('carries the landed project identity and its link', async () => {
    const { text, isError } = await body(opened);

    expect(isError).toBe(false);
    expect(text).toContain('teal-skylark');
    expect(text).toContain('onlook://project/github.com%2Facme%2Fapp/workspace/teal-skylark');
  });

  it('relays a refusal with its reason, as an error result', async () => {
    const { text, isError } = await body({ ok: false, reason: 'the repository has no commit to branch from yet' });

    expect(isError).toBe(true);
    expect(text).toContain('the repository has no commit to branch from yet');
  });
});
