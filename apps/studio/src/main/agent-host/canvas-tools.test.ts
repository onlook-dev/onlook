import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { FRAME_QUOTE_MAX_LENGTH, MAX_CANVAS_OPS_PER_REQUEST, type FrameShown } from '@studio/events';
import {
  agentFramesText,
  captureFrameTool,
  clearFrameQuoteTool,
  createFrameTool,
  createImageTool,
  createPageTool,
  createTextTool,
  deletePageTool,
  setTextTool,
  evaluateInFrameTool,
  listFramesTool,
  listPagesTool,
  moveFrameTool,
  moveFramesTool,
  moveNodesToPageTool,
  duplicateFramesTool,
  removeFrameTool,
  removeFramesTool,
  renameFrameTool,
  renamePageTool,
  reorderFrameTool,
  reorderPageTool,
  type FrameOutcome,
  type FramesOutcome,
  type PageOutcome,
  redoCanvasTool,
  undoCanvasTool,
} from './canvas-tools.js';
import { CLEAR_FRAME_QUOTE_TOOL_NAME, CREATE_FRAME_TOOL_NAME, LIST_PAGES_TOOL_NAME } from './tool-names.js';

const node = {
  id: 'frame-1',
  kind: 'browser' as const,
  name: 'Storefront',
  x: 10,
  y: 20,
  width: 1280,
  height: 800,
  order: 0,
  content: { homeUrl: 'http://localhost:3000/' },
};

const landed: FrameOutcome = { ok: true, node };
const noSetup = async (): Promise<{ ok: false; reason: string }> => ({ ok: false, reason: 'no setup expected' });
const declined: FrameOutcome = { ok: false, reason: 'no frame "ghost" on this canvas' };

const say = async (
  definition: { handler: (args: never, extra: unknown) => Promise<{ content: unknown[] }> },
  args: unknown,
): Promise<string> => {
  const result = await definition.handler(args as never, {});
  return result.content.map((block) => (block as { text?: string }).text ?? '').join(' ');
};

describe('group frame_ids admission', () => {
  const idsSchema = moveFramesTool(async () => declined).inputSchema.frame_ids;

  it('accepts a unique bounded list and rejects empty, duplicate, and over-cap lists', () => {
    expect(idsSchema.safeParse(['frame-1', 'frame-2']).success).toBe(true);
    expect(
      idsSchema.safeParse(
        Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST }, (_, index) => `f-${index}`),
      ).success,
    ).toBe(true);
    expect(idsSchema.safeParse([]).success).toBe(false);
    expect(idsSchema.safeParse(['frame-1', 'frame-1']).success).toBe(false);
    expect(
      idsSchema.safeParse(
        Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST + 1 }, (_, index) => `f-${index}`),
      ).success,
    ).toBe(false);
  });
});

describe('canvas history tools', () => {
  it('an applied undo answers with the frames as the canvas now records them', async () => {
    const frames = [node, { ...node, id: 'frame-2' }];
    const undo = await say(undoCanvasTool(async () => ({ ok: true, applied: true, frames })), {});
    expect(undo).toContain(JSON.stringify(frames));
  });
});

describe('list_frames', () => {
  it('hands the frames back as JSON the model can read', async () => {
    const text = await say(listFramesTool(async () => [node]), {});
    expect(JSON.parse(text)).toEqual([node]);
  });

  it('points the agent at the registered create tool when the canvas is empty', async () => {
    const text = await say(listFramesTool(async () => []), {});
    expect(text).toContain(CREATE_FRAME_TOOL_NAME);
  });
});

describe('every mutation returns the fresh frame', () => {
  it('carries the post-write node in the create result', async () => {
    const text = await say(createFrameTool(async () => landed), { url: 'http://localhost:3000' });
    expect(text).toContain('frame-1');
    expect(JSON.parse(text.slice(text.indexOf('{')))).toEqual(node);
  });

  it('carries it in the move result', async () => {
    const text = await say(moveFrameTool(async () => landed), { frame_id: 'frame-1', x: 5 });
    expect(text).toContain('frame-1');
  });

  it('carries it in the rename result', async () => {
    const text = await say(renameFrameTool(async () => landed), {
      frame_id: 'frame-1',
      name: 'Store',
    });
    expect(text).toContain('frame-1');
  });

  it('carries it in the reorder result', async () => {
    const text = await say(reorderFrameTool(async () => landed), {
      frame_id: 'frame-1',
      position: 'front',
    });
    expect(text).toContain('frame-1');
  });
});

describe('the placement Studio computed reaches the agent (ONL-2199 §3)', () => {
  it('hands the agent the placement of a single frame', async () => {
    const placement = {
      mode: 'coordinates',
      overlaps: [{ id: 'frame-2', name: 'Checkout' }],
      visible: 'unknown',
    };
    const withOverlap: FrameOutcome = { ok: true, node, placement };
    const text = await say(createFrameTool(async () => withOverlap), { url: 'http://localhost:3000' });
    expect(text).toContain(JSON.stringify(placement));
  });

  it('hands the agent every placement across a group result', async () => {
    const placements = [{ mode: 'coordinates', overlaps: [{ id: 'frame-3', name: 'Cart' }], visible: false }];
    const grouped: FramesOutcome = { ok: true, nodes: [node], placements };
    const text = await say(moveFramesTool(async () => grouped), {
      frame_ids: ['frame-1'],
      delta_x: 1,
      delta_y: 1,
    });
    expect(text).toContain(JSON.stringify(placements));
  });
});

describe('the arguments reach the sink verbatim', () => {
  it('passes a reorder position through, and admits only the four positions', async () => {
    let seen: unknown;
    const definition = reorderFrameTool(async (request) => {
      seen = request;
      return landed;
    });
    await say(definition, { frame_id: 'frame-1', position: 'backward' });
    expect(seen).toEqual({ frameId: 'frame-1', position: 'backward' });
    expect(definition.inputSchema.position.safeParse('top').success).toBe(false);
  });

  it('passes copy_of through as the source frame, and never as a url', async () => {
    let seen: unknown;
    await say(
      createFrameTool(async (request) => {
        seen = request;
        return landed;
      }),
      { copy_of: 'frame-1', name: 'Copy', done: 'Copied' },
    );
    expect(seen).toEqual({
      url: undefined,
      name: 'Copy',
      fromFrameId: 'frame-1',
      x: undefined,
      y: undefined,
      beside: undefined,
      side: undefined,
      words: { done: 'Copied' },
    });
  });

  it('hands a pending frame to the canvas as one (ONL-2960)', async () => {
    let seen: { pending?: boolean } | undefined;
    const text = await say(
      createFrameTool(async (request) => {
        seen = request;
        return landed;
      }),
      { url: 'http://localhost:5173', name: 'Home', done: 'Added', quote: 'Halde, live from your code', pending: true },
    );
    expect(seen?.pending).toBe(true);
    expect(text).toContain('run_project_setup');
  });

  it('mentions a quote only when it offers one (ONL-2960)', () => {
    for (const quotes of [true, false]) {
      const definition = createFrameTool(async () => landed, quotes);
      const fields = definition.inputSchema as Record<string, z.ZodTypeAny>;
      if ('quote' in fields) continue;
      const said = [definition.description, ...Object.values(fields).map((field) => field.description ?? '')];
      expect({ quotes, mentions: said.filter((line) => /quote/i.test(line)) }).toEqual({ quotes, mentions: [] });
    }
  });

  it('passes beside and side through on create_frame and move_frame (ONL-2199)', async () => {
    let created: unknown;
    await say(
      createFrameTool(async (request) => {
        created = request;
        return landed;
      }),
      { url: 'http://localhost:3000', name: 'Home', beside: 'frame-1', side: 'below', done: 'Added' },
    );
    expect(created).toEqual({
      url: 'http://localhost:3000',
      name: 'Home',
      fromFrameId: undefined,
      x: undefined,
      y: undefined,
      beside: 'frame-1',
      side: 'below',
      words: { done: 'Added' },
    });

    let moved: unknown;
    await say(
      moveFrameTool(async (request) => {
        moved = request;
        return landed;
      }),
      { frame_id: 'frame-2', beside: 'frame-1' },
    );
    expect(moved).toEqual({
      frameId: 'frame-2',
      x: undefined,
      y: undefined,
      width: undefined,
      height: undefined,
      beside: 'frame-1',
      side: undefined,
    });
  });

  it('passes a size through on a move, so the sink can author one resize', async () => {
    let seen: unknown;
    await say(
      moveFrameTool(async (request) => {
        seen = request;
        return landed;
      }),
      { frame_id: 'frame-1', x: 1, y: 2, width: 390, height: 844 },
    );
    expect(seen).toEqual({
      frameId: 'frame-1',
      x: 1,
      y: 2,
      width: 390,
      height: 844,
      beside: undefined,
      side: undefined,
    });
  });

  it('passes shared group motion without expanding it into per-frame patches', async () => {
    let move: unknown;
    await say(
      moveFramesTool(async (request) => {
        move = request;
        return { ok: true, nodes: [node] };
      }),
      { frame_ids: ['frame-1', 'frame-2'], delta_x: 10, delta_y: -5 },
    );
    expect(move).toEqual({ frameIds: ['frame-1', 'frame-2'], deltaX: 10, deltaY: -5 });

    let duplicate: unknown;
    await say(
      duplicateFramesTool(async (request) => {
        duplicate = request;
        return { ok: true, nodes: [node] };
      }),
      { frame_ids: ['frame-1', 'frame-2'], offset_x: 40, offset_y: 40, done: 'Copied' },
    );
    expect(duplicate).toEqual({
      frameIds: ['frame-1', 'frame-2'],
      offsetX: 40,
      offsetY: 40,
      words: { done: 'Copied' },
    });
  });

  it('passes an omitted offset through as omitted, so the sink can place beside each source', async () => {
    let seen: { offsetX?: number; offsetY?: number } | undefined;
    await say(
      duplicateFramesTool(async (request) => {
        seen = request;
        return { ok: true, nodes: [node] };
      }),
      { frame_ids: ['frame-1'] },
    );
    expect(seen?.offsetX).toBeUndefined();
    expect(seen?.offsetY).toBeUndefined();
  });
});

describe('the words for a frame the agent adds (ONL-2973)', () => {
  const accepts = (definition: { inputSchema: Record<string, unknown> }, args: Record<string, unknown>): boolean =>
    z.object(definition.inputSchema as z.ZodRawShape).safeParse(args).success;

  it('asks create_frame and duplicate_frames for a verb, and create_frame for a name', () => {
    const create = createFrameTool(async () => landed);
    expect(accepts(create, { url: 'http://localhost:3000', name: 'Home', done: 'Added' })).toBe(true);
    expect(accepts(create, { url: 'http://localhost:3000', name: 'Home' })).toBe(false);
    expect(accepts(create, { url: 'http://localhost:3000', done: 'Added' })).toBe(false);
    const duplicate = duplicateFramesTool(async () => ({ ok: true, nodes: [node] }));
    expect(accepts(duplicate, { frame_ids: ['frame-1'], done: 'Copied' })).toBe(true);
    expect(accepts(duplicate, { frame_ids: ['frame-1'] })).toBe(false);
  });
});

describe('the canvas object verbs (ONL-2486)', () => {
  it('hands create_text its words, size and placement verbatim, and answers with the node', async () => {
    let seen: unknown;
    const written = { ...node, id: 'text-1', kind: 'text' as const, content: { text: 'Variants', size: 'large' as const } };
    const text = await say(
      createTextTool(async (request) => {
        seen = request;
        return { ok: true, node: written };
      }),
      { text: 'Variants', size: 'large', width: 320, beside: 'frame-1', side: 'below' },
    );
    expect(seen).toEqual({
      text: 'Variants',
      size: 'large',
      width: 320,
      x: undefined,
      y: undefined,
      beside: 'frame-1',
      side: 'below',
    });
    expect(text).toContain(JSON.stringify(written));
  });

  it('admits only the three sizes', () => {
    const sizes = createTextTool(async () => landed).inputSchema.size;
    expect(sizes.safeParse('medium').success).toBe(true);
    expect(sizes.safeParse('huge').success).toBe(false);
  });

  it('admits only finite positive text widths, or an omitted width', () => {
    const width = createTextTool(async () => landed).inputSchema.width;
    expect(width.safeParse(undefined).success).toBe(true);
    expect(width.safeParse(240).success).toBe(true);
    for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
      expect(width.safeParse(invalid).success).toBe(false);
    }
  });

  it('hands set_text the object id under the name the sink uses', async () => {
    let seen: unknown;
    await say(
      setTextTool(async (request) => {
        seen = request;
        return landed;
      }),
      { text_id: 'text-1', text: 'After' },
    );
    expect(seen).toEqual({ textId: 'text-1', text: 'After' });
  });

  it('hands create_image its path, name, description and placement verbatim', async () => {
    let seen: unknown;
    await say(
      createImageTool(async (request) => {
        seen = request;
        return landed;
      }),
      { path: 'design/hero.png', name: 'Hero', alt: 'the hero section', x: 10, y: 20 },
    );
    expect(seen).toEqual({
      path: 'design/hero.png',
      name: 'Hero',
      alt: 'the hero section',
      x: 10,
      y: 20,
      beside: undefined,
      side: undefined,
    });
  });

  it('relays each refusal as an error result carrying its reason', async () => {
    for (const [definition, args] of [
      [createTextTool(async () => declined), { text: 'x' }],
      [setTextTool(async () => declined), { text_id: 'ghost', text: 'x' }],
      [createImageTool(async () => declined), { path: '/tmp/gone.png' }],
    ] as const) {
      const result = (await definition.handler(args as never, {})) as {
        content: { text?: string }[];
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content.map((block) => block.text).join(' ')).toContain('ghost');
    }
  });
});

describe('a removal answers with what is left (ONL-2287)', () => {
  it('remove_frame reports the remaining frame by id', async () => {
    const left = { ...node, id: 'frame-2', name: 'Checkout' };
    const text = await say(
      removeFrameTool(async () => ({ ok: true, removed: { name: 'Storefront' }, frames: [left] })),
      { frame_id: 'frame-1' },
    );
    expect(text).toContain('Storefront');
    expect(text).toContain('frame-2');
  });
});

describe('group results report every affected frame', () => {
  it('returns every moved node and every removed name', async () => {
    const moved = await say(
      moveFramesTool(async () => ({ ok: true, nodes: [node, { ...node, id: 'frame-2' }] })),
      { frame_ids: ['frame-1', 'frame-2'], delta_x: 1, delta_y: 2 },
    );
    expect(moved).toContain('frame-1');
    expect(moved).toContain('frame-2');

    const removed = await say(
      removeFramesTool(async () => ({
        ok: true,
        removed: [{ name: 'Storefront' }, { name: 'Checkout' }],
        frames: [],
      })),
      { frame_ids: ['frame-1', 'frame-2'] },
    );
    expect(removed).toContain('Storefront');
    expect(removed).toContain('Checkout');
  });
});

describe('evaluate_in_frame', () => {
  it('returns the page’s answer as-is', async () => {
    const text = await say(evaluateInFrameTool(async () => ({ ok: true, value: '"rgb(0, 0, 0)"' })), {
      frame_id: 'frame-1',
      script: '1',
    });
    expect(text).toBe('"rgb(0, 0, 0)"');
  });

  it('relays a refusal with its reason', async () => {
    const text = await say(
      evaluateInFrameTool(async () => ({ ok: false, reason: 'https://x.com is not a local address' })),
      { frame_id: 'frame-1', script: '1' },
    );
    expect(text).toContain('not a local address');
  });
});

describe('a sink that said no is an error result (ONL-2304)', () => {
  const outcome = async (
    definition: { handler: (args: never, extra: unknown) => Promise<unknown> },
    args: unknown,
  ): Promise<{ content: { type: string }[]; isError?: boolean }> =>
    (await definition.handler(args as never, {})) as { content: { type: string }[]; isError?: boolean };

  it('capture_frame: a refused capture carries isError and the reason; a capture does not', async () => {
    const refused = await outcome(
      captureFrameTool(async () => ({ ok: false, reason: 'the page did not respond in time' }), noSetup),
      { frame_id: 'frame-1' },
    );
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.content)).toContain('did not respond');

    const shot = await outcome(captureFrameTool(async () => ({ ok: true, pngBase64: 'QUJD' }), noSetup), { frame_id: 'frame-1' });
    expect(shot.isError).toBeUndefined();
    expect(shot.content[0]?.type).toBe('image');
  });

  it('capture_frame tells the agent what the user sees over the frame, on a capture and on a refusal (ONL-2960)', async () => {
    const text = (result: { content: { type: string; text?: string }[] }): string =>
      result.content.flatMap((part) => (part.type === 'text' && part.text !== undefined ? [part.text] : [])).join(' ');
    const shot = (shown?: FrameShown) => outcome(captureFrameTool(async () => ({ ok: true, pngBase64: 'QUJD', ...(shown ? { shown } : {}) }), noSetup), { frame_id: 'frame-1' });
    const refusal = (shown?: FrameShown) => outcome(captureFrameTool(async () => ({ ok: false, reason: 'no guest', ...(shown ? { shown } : {}) }), noSetup), { frame_id: 'frame-1' });

    expect(text(await shot({ kind: 'quote', quote: 'A bakery site' }))).toContain(CLEAR_FRAME_QUOTE_TOOL_NAME);
    expect(text(await shot({ kind: 'page' }))).toBe(text(await shot()));
    expect(text(await refusal({ kind: 'cover', cover: 'dead' }))).not.toBe(text(await refusal()));
    expect(text(await refusal({ kind: 'cover', cover: 'dead' }))).toContain('no guest');
  });

  it('capture_frame with covers off names only what main draws: no quote and no cover', async () => {
    const said = async (shown: FrameShown): Promise<string> => {
      const result: { content: { type: string; text?: string }[] } = await outcome(captureFrameTool(async () => ({ ok: true, pngBase64: 'QUJD', shown }), noSetup, false), { frame_id: 'frame-1' });
      return result.content.flatMap((part) => (part.type === 'text' && part.text !== undefined ? [part.text] : [])).join(' ');
    };
    const every: FrameShown[] = [
      { kind: 'quote', quote: 'A bakery site' }, { kind: 'loading' }, { kind: 'starting' }, { kind: 'load-failed' }, { kind: 'unreachable' },
      ...(['non-started', 'dead', 'users-own', 'occupied', 'container'] as const).map((cover): FrameShown => ({ kind: 'cover', cover })),
    ];
    for (const shown of every) expect({ shown, said: /cover|quote/i.test(await said(shown)) }).toEqual({ shown, said: false });
    expect(await said({ kind: 'cover', cover: 'dead' })).toContain('notice');
  });

  it('capture_frame runs its setup script in the frame, then captures, in one call', async () => {
    const steps: string[] = [];
    const shot = await outcome(
      captureFrameTool(
        async ({ frameId }) => {
          steps.push(`capture ${frameId}`);
          return { ok: true, pngBase64: 'QUJD' };
        },
        async ({ frameId, script }) => {
          steps.push(`setup ${frameId} ${script}`);
          return { ok: true, value: '"paused"' };
        },
      ),
      { frame_id: 'frame-1', setup_script: 'pause()' },
    );
    expect(steps).toEqual(['setup frame-1 pause()', 'capture frame-1']);
    expect(shot.isError).toBeUndefined();
    expect(shot.content[0]?.type).toBe('image');
    expect(JSON.stringify(shot.content)).toContain('paused');
  });

  it('capture_frame takes no picture when its setup script fails, and says why', async () => {
    let captured = false;
    const refused = await outcome(
      captureFrameTool(
        async () => {
          captured = true;
          return { ok: true, pngBase64: 'QUJD' };
        },
        async () => ({ ok: false, reason: 'the script threw in the page: boom' }),
      ),
      { frame_id: 'frame-1', setup_script: 'boom()' },
    );
    expect(captured).toBe(false);
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.content)).toContain('boom');
  });

  it('a page that navigated during a script is an answer, not an error, and capture_frame captures the loaded page', async () => {
    const navigated = async (): Promise<{ ok: true; navigatedTo: string }> => ({ ok: true, navigatedTo: 'http://localhost:3000/' });
    const read = await outcome(evaluateInFrameTool(navigated), { frame_id: 'frame-1', script: 'location.reload(); await wait()' });
    expect(read.isError).toBeUndefined();
    expect(JSON.stringify(read.content)).toContain('loaded again at http://localhost:3000/');

    let captured = false;
    const shot = await outcome(
      captureFrameTool(async () => {
        captured = true;
        return { ok: true, pngBase64: 'QUJD' };
      }, navigated),
      { frame_id: 'frame-1', setup_script: 'location.reload(); await wait()' },
    );
    expect(captured).toBe(true);
    expect(shot.isError).toBeUndefined();
    expect(shot.content[0]?.type).toBe('image');
  });

  it('capture_frame without a setup script never runs one', async () => {
    let ran = false;
    await outcome(
      captureFrameTool(async () => ({ ok: true, pngBase64: 'QUJD' }), async () => {
        ran = true;
        return { ok: true, value: 'null' };
      }),
      { frame_id: 'frame-1' },
    );
    expect(ran).toBe(false);
  });

  it('evaluate_in_frame and the frame verbs answer the same way (inverse: a landed verb carries none)', async () => {
    const ran = await outcome(
      evaluateInFrameTool(async () => ({ ok: false, reason: 'refused: not a local address' })),
      { frame_id: 'frame-1', script: '1' },
    );
    expect(ran.isError).toBe(true);
    const removed = await outcome(removeFrameTool(async () => ({ ok: false, reason: 'no frame "ghost"' })), { frame_id: 'ghost' });
    expect(removed.isError).toBe(true);
    const landedRemove = await outcome(
      removeFrameTool(async () => ({ ok: true, removed: { name: 'Home' }, frames: [] })),
      { frame_id: 'frame-1' },
    );
    expect(landedRemove.isError).toBeUndefined();
    const moved = await outcome(moveFrameTool(async () => landed), { frame_id: 'frame-1', x: 1, y: 2 });
    expect(moved.isError).toBeUndefined();
  });

  it('a declined create, move or rename carries isError and the reason', async () => {
    for (const refused of [
      await outcome(createFrameTool(async () => declined), { url: 'nonsense' }),
      await outcome(moveFrameTool(async () => declined), { frame_id: 'ghost', x: 1 }),
      await outcome(renameFrameTool(async () => declined), { frame_id: 'ghost', name: 'x' }),
      await outcome(reorderFrameTool(async () => declined), { frame_id: 'ghost', position: 'front' }),
    ]) {
      expect(refused.isError).toBe(true);
      expect(refused.content.map((block) => (block as { text?: string }).text).join(' ')).toContain(
        'no frame "ghost" on this canvas',
      );
    }
  });

  it('the history verbs and the group removal carry it too; an empty stack is not a failure', async () => {
    const stale = async () => ({ ok: false as const, reason: 'this project is no longer open' });
    expect((await outcome(undoCanvasTool(stale), {})).isError).toBe(true);
    expect((await outcome(redoCanvasTool(stale), {})).isError).toBe(true);
    expect((await outcome(undoCanvasTool(async () => ({ ok: true, applied: false, frames: [] })), {})).isError).toBeUndefined();
    const group = await outcome(removeFramesTool(async () => ({ ok: false, reason: 'no frame "ghost"' })), { frame_ids: ['ghost'] });
    expect(group.isError).toBe(true);
  });
});

describe('the page verbs at the tool seam (ONL-2488)', () => {
  const page = { id: 'pg_checkout', name: 'Checkout', divider: false, current: false, objects: 2 };
  const minted: PageOutcome = { ok: true, page };
  const noPage: PageOutcome = { ok: false, reason: 'no page "pg_gone" in this project' };

  const result = async (
    definition: { handler: (args: never, extra: unknown) => Promise<unknown> },
    args: unknown,
  ): Promise<{ text: string; isError: boolean }> => {
    const answered = (await definition.handler(args as never, {})) as {
      content: { text?: string }[];
      isError?: boolean;
    };
    return {
      text: answered.content.map((block) => block.text ?? '').join(' '),
      isError: answered.isError === true,
    };
  };

  it('create_page hands the name over and answers with the minted page, id and name', async () => {
    const asked: unknown[] = [];
    const definition = createPageTool(async (request) => {
      asked.push(request);
      return minted;
    });

    const first = await result(definition, { name: 'Checkout' });
    expect(first.text).toContain('pg_checkout');
    expect(first.text).toContain('Checkout');
    expect(first.isError).toBe(false);

    // Two pages of one name is the sink's business; the tool forms no opinion about it.
    const twin = await result(definition, { name: 'Checkout' });
    expect(twin.isError).toBe(false);
    expect(asked).toEqual([{ name: 'Checkout' }, { name: 'Checkout' }]);
  });

  it('list_pages hands the pages back as JSON, and says so when no canvas is open', async () => {
    expect(JSON.parse(await say(listPagesTool(async () => [page]), {}))).toEqual([page]);
    expect(await say(listPagesTool(async () => []), {})).toContain('no canvas');
  });

  it('rename_page and reorder_page reach the sink under the names it uses', async () => {
    let renamed: unknown;
    await say(
      renamePageTool(async (request) => {
        renamed = request;
        return minted;
      }),
      { page_id: 'pg_checkout', name: '---' },
    );
    expect(renamed).toEqual({ pageId: 'pg_checkout', name: '---' });

    let reordered: unknown;
    const definition = reorderPageTool(async (request) => {
      reordered = request;
      return minted;
    });
    await say(definition, { page_id: 'pg_checkout', position: 'first' });
    expect(reordered).toEqual({ pageId: 'pg_checkout', position: 'first' });
    expect(definition.inputSchema.position.safeParse('later').success).toBe(true);
    expect(definition.inputSchema.position.safeParse('front').success).toBe(false);
  });

  it('move_nodes_to_page hands its object ids over, and names the page it used (ONL-2488)', async () => {
    let moved: unknown;
    // The nodes carry no page of their own, so only the sentence can name the page it used.
    const text = await say(
      moveNodesToPageTool(async (request) => {
        moved = request;
        return { ok: true, page: { id: 'pg_checkout', name: 'Checkout' }, nodes: [node] };
      }),
      { object_ids: ['a', 'b', 'c', 'd'], page_id: 'pg_checkout' },
    );
    expect(moved).toEqual({ nodeIds: ['a', 'b', 'c', 'd'], pageId: 'pg_checkout' });
    expect(JSON.stringify(node)).not.toContain('Checkout');
    expect(text).toContain('Checkout');
    expect(text).toContain('pg_checkout');
    expect(text).toContain('frame-1');
  });

  it('move_nodes_to_page admits a unique bounded list of object ids', () => {
    const ids = moveNodesToPageTool(async () => ({ ok: false, reason: 'x' })).inputSchema.object_ids;
    expect(ids.safeParse(['a', 'b']).success).toBe(true);
    expect(ids.safeParse([]).success).toBe(false);
    expect(ids.safeParse(['a', 'a']).success).toBe(false);
    expect(
      ids.safeParse(Array.from({ length: MAX_CANVAS_OPS_PER_REQUEST + 1 }, (_, i) => `n-${String(i)}`))
        .success,
    ).toBe(false);
  });

  it('a refused move — a bad id, or a divider — is an error result carrying the reason', async () => {
    const stray = await result(
      moveNodesToPageTool(async () => ({ ok: false, reason: 'no object "ghost" on this canvas' })),
      { object_ids: ['ghost'], page_id: 'pg_checkout' },
    );
    expect(stray.isError).toBe(true);
    expect(stray.text).toContain('ghost');

    const ruled = await result(
      moveNodesToPageTool(async () => ({ ok: false, reason: 'page "pg_rule" is a divider, not a place objects live' })),
      { object_ids: ['a'], page_id: 'pg_rule' },
    );
    expect(ruled.isError).toBe(true);
    expect(ruled.text).toContain('divider');
  });

  it('delete_page names the page and what it holds, and relays a refusal as an error', async () => {
    let asked: unknown;
    const removed = await result(
      deletePageTool(async (request) => {
        asked = request;
        return { ok: true, removed: { name: 'Checkout', objects: 2 }, pages: [page] };
      }),
      { page_id: 'pg_checkout' },
    );
    expect(asked).toEqual({ pageId: 'pg_checkout' });
    expect(removed.isError).toBe(false);
    expect(removed.text).toContain('Checkout');
    expect(removed.text).toContain('2 objects');

    const one = await result(
      deletePageTool(async () => ({ ok: true, removed: { name: 'Scratch', objects: 1 }, pages: [] })),
      { page_id: 'pg_scratch' },
    );
    expect(one.text).toContain('the 1 object on it');

    const refused = await result(deletePageTool(async () => noPage), { page_id: 'pg_gone' });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain('pg_gone');
  });

  it('every create verb hands a named page through, and an omitted one as omitted', async () => {
    const seen: Record<string, { pageId?: string }> = {};
    await say(
      createFrameTool(async (request) => {
        seen['frame'] = request;
        return landed;
      }),
      { url: 'http://localhost:3000', page_id: 'pg_checkout' },
    );
    await say(
      createTextTool(async (request) => {
        seen['text'] = request;
        return landed;
      }),
      { text: 'Checkout', page_id: 'pg_checkout' },
    );
    await say(
      createImageTool(async (request) => {
        seen['image'] = request;
        return landed;
      }),
      { path: 'design/hero.png', page_id: 'pg_checkout' },
    );
    expect(Object.values(seen).map((request) => request.pageId)).toEqual([
      'pg_checkout',
      'pg_checkout',
      'pg_checkout',
    ]);

    // Omitted stays omitted: the current-page hint is main's to resolve, never the tool's.
    let omitted: { pageId?: string } | undefined;
    await say(
      createTextTool(async (request) => {
        omitted = request;
        return landed;
      }),
      { text: 'Checkout' },
    );
    expect(omitted?.pageId).toBeUndefined();
  });

  it('an unknown page is relayed as an error result, never as a quiet success', async () => {
    for (const [definition, args] of [
      [createFrameTool(async () => ({ ok: false as const, reason: 'no page "pg_gone" in this project' })), { url: 'http://localhost:3000', page_id: 'pg_gone' }],
      [createTextTool(async () => ({ ok: false as const, reason: 'no page "pg_gone" in this project' })), { text: 'x', page_id: 'pg_gone' }],
      [createImageTool(async () => ({ ok: false as const, reason: 'no page "pg_gone" in this project' })), { path: 'a.png', page_id: 'pg_gone' }],
    ] as const) {
      const refused = await result(definition, args);
      expect(refused.isError).toBe(true);
      expect(refused.text).toContain('pg_gone');
    }
  });

  it('list_frames passes a page filter through, and omits one when none is given', async () => {
    const asked: unknown[] = [];
    const definition = listFramesTool(async (request) => {
      asked.push(request);
      return [node];
    });
    await say(definition, { page_id: 'pg_checkout' });
    await say(definition, {});
    expect(asked).toEqual([{ pageId: 'pg_checkout' }, {}]);
  });

  it('list_frames points at list_pages when the page it was filtered to holds nothing', async () => {
    const empty = listFramesTool(async () => []);
    const filtered = await say(empty, { page_id: 'pg_empty' });
    expect(filtered).toContain('pg_empty');
    expect(filtered).toContain(LIST_PAGES_TOOL_NAME);

    const whole = await say(empty, {});
    expect(whole).toContain(CREATE_FRAME_TOOL_NAME);
  });
});

describe('the text a listing answers with', () => {
  it('names the tool that adds one when the canvas is empty, and list_pages when a page is', () => {
    expect(agentFramesText([])).toBe(
      'The canvas has no objects on any page. Use create_frame to add one.',
    );
    expect(agentFramesText([], 'pg_empty')).toBe(
      'No object is on page "pg_empty". Call list_pages for the pages this project has.',
    );
  });

  // The diagnostics read answers with this same text, so a reader of one is reading the other (ONL-2297).
  it('is the readings themselves once there is something on the canvas', () => {
    expect(agentFramesText([{ id: 'frame-1', pageError: { source: 'vite', message: 'Unexpected token' } }])).toBe(
      '[{"id":"frame-1","pageError":{"source":"vite","message":"Unexpected token"}}]',
    );
  });
});

describe('a quote on a new frame (ONL-2960)', () => {
  it('reaches Studio with the frame, trimmed, and the result tells the agent to build there', async () => {
    let seen: { quote?: string } | undefined;
    const tool = createFrameTool(async (request) => {
      seen = request;
      return landed;
    });
    const args = tool.inputSchema.quote.parse('  A bakery site  ');
    const reply = await say(tool, { url: 'http://localhost:3000', quote: args });
    expect(seen?.quote).toBe('A bakery site');
    expect(reply).toContain('shows your quote');
  });

  it('is refused past its limit, and the refusal names the limit', () => {
    const parsed = createFrameTool(async () => landed).inputSchema.quote.safeParse('x'.repeat(FRAME_QUOTE_MAX_LENGTH + 1));
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain(String(FRAME_QUOTE_MAX_LENGTH));
  });

  it('is not offered with covers off, and neither is a pending frame, as on main', () => {
    const fields = Object.keys(createFrameTool(async () => landed, false).inputSchema);
    expect(fields).not.toContain('quote');
    expect(fields).not.toContain('pending');
    expect(Object.keys(createFrameTool(async () => landed, true).inputSchema)).toContain('pending');
  });

  it('is taken down on request, and a frame with none says so as a refusal', async () => {
    expect((await outcomeOf(clearFrameQuoteTool(async () => ({ ok: true })), { frame_id: 'frame-1' })).isError).toBeUndefined();
    const refused = await outcomeOf(clearFrameQuoteTool(async () => ({ ok: false, reason: 'that frame shows no quote' })), { frame_id: 'frame-1' });
    expect(refused.isError).toBe(true);
  });
});

describe('a quote on a frame already on the canvas (ONL-2960)', () => {
  it('reaches Studio with the move, trimmed, and the result tells the agent to build there', async () => {
    let seen: { quote?: string; width?: number } | undefined;
    const tool = moveFrameTool(async (request) => {
      seen = request;
      return { ...landed, quoted: true };
    }, true);
    const quote = tool.inputSchema.quote.parse('  A bakery site  ');
    const reply = await say(tool, { frame_id: 'frame-1', width: 1512, height: 982, quote });
    expect(seen).toMatchObject({ quote: 'A bakery site', width: 1512 });
    expect(reply).toContain('shows your quote');
  });

  it('tells the agent when the object it moved cannot show one', async () => {
    const reply = await say(moveFrameTool(async () => ({ ...landed, quoted: false }), true), { frame_id: 'section-1', quote: 'A bakery site' });
    expect(reply).toContain('no quote');
    expect(reply).not.toContain('shows your quote');
  });

  it('sends no quote on a plain move', async () => {
    let seen: object | undefined;
    await say(moveFrameTool(async (request) => {
      seen = request;
      return landed;
    }, true), { frame_id: 'frame-1', x: 5 });
    expect(Object.keys(seen ?? {})).not.toContain('quote');
  });

  it('is refused past its limit, and is not offered when quotes are off', () => {
    expect(moveFrameTool(async () => landed, true).inputSchema.quote.safeParse('x'.repeat(FRAME_QUOTE_MAX_LENGTH + 1)).success).toBe(false);
    expect(Object.keys(moveFrameTool(async () => landed).inputSchema)).not.toContain('quote');
  });
});

async function outcomeOf(
  definition: { handler: (args: never, extra: unknown) => Promise<unknown> },
  args: unknown,
): Promise<{ isError?: boolean }> {
  return (await definition.handler(args as never, {})) as { isError?: boolean };
}
