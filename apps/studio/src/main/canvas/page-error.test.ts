import { describe, expect, it } from 'bun:test';
import type { MirroredFrame } from '@studio/events';
import {
  derivePageError,
  GUEST_PAGE_READ_SCRIPT,
  readGuestPage,
  readingOf,
  readPageErrors,
  type GuestPageReading,
  type GuestReadOutcome,
  type PageElementLike,
  type PageRootLike,
} from './page-error.js';

const element = (
  textContent: string | null,
  within: Record<string, string> = {},
  options: { shadow?: boolean } = {},
): PageElementLike => {
  const find = (selector: string): PageElementLike | null =>
    selector in within ? element(within[selector] ?? null) : null;
  const findAll = (selector: string): PageElementLike[] => {
    const one = find(selector);
    return one === null ? [] : [one];
  };
  return {
    textContent,
    shadowRoot: options.shadow === false ? null : { textContent, querySelector: find, querySelectorAll: findAll },
    querySelector: find,
    querySelectorAll: findAll,
  };
};

const page = (
  nodes: Record<string, PageElementLike | PageElementLike[]> = {},
  body: { innerText: string } | null = { innerText: 'Lemonade Stand' },
): PageRootLike => ({
  querySelector: (selector) => {
    const found = nodes[selector];
    if (found === undefined) return null;
    return Array.isArray(found) ? found[0] ?? null : found;
  },
  querySelectorAll: (selector) => {
    const found = nodes[selector];
    if (found === undefined) return [];
    return Array.isArray(found) ? found : [found];
  },
  body,
});

const frame = (over: Partial<MirroredFrame> = {}): MirroredFrame => ({
  id: 'frame-1',
  currentUrl: 'http://localhost:5297/',
  health: 'live',
  title: 'Lemonade Stand',
  webContentsId: 42,
  console: [],
  errorCount: 0,
  ...over,
});

const read = (reading: GuestReadOutcome) => () => Promise.resolve(reading);

/** The blank confirmation's wait, stepped past rather than slept through. */
const atOnce = (): Promise<void> => Promise.resolve();

const MEDIA = 'img, svg, canvas, video, picture, object, embed, iframe';

describe('reading what a page is showing', () => {
  it("names the file when Vite's overlay is up", () => {
    const reading = readGuestPage(
      page({
        'vite-error-overlay': element(null, {
          '.plugin': '[plugin:vite:react-babel]',
          '.message-body': 'Unexpected token, expected ","',
          '.file': '/private/tmp/onl2297/site/src/Hero.jsx:2:79',
        }),
      }),
    );

    expect(reading.overlay).toEqual({
      source: 'vite',
      message: '[plugin:vite:react-babel] Unexpected token, expected ","',
      file: '/private/tmp/onl2297/site/src/Hero.jsx:2:79',
    });
  });

  it("carries the overlay's code frame and stack, line breaks kept", () => {
    const reading = readGuestPage(
      page({
        'vite-error-overlay': element(null, {
          '.plugin': '[plugin:vite:react-babel]',
          '.message-body': 'Unexpected token',
          '.file': 'src/Hero.jsx:2:79',
          '.frame': '\n1 |  export const hero = () =>\n  |                     ^\n2 |    <div>\n',
          '.stack': '\n    at TransformPluginContext._formatLog\n    at TransformPluginContext.error\n',
        }),
      }),
    );

    expect(reading.overlay?.codeFrame).toBe('1 |  export const hero = () =>\n  |                     ^\n2 |    <div>');
    expect(reading.overlay?.stack).toBe('    at TransformPluginContext._formatLog\n    at TransformPluginContext.error');
  });

  it('falls back to the element when the overlay keeps no shadow root', () => {
    const plain = element('[plugin:vite:react-babel] Unexpected token', {}, { shadow: false });

    expect(readGuestPage(page({ 'vite-error-overlay': plain })).overlay).toEqual({
      source: 'vite',
      message: '[plugin:vite:react-babel] Unexpected token',
    });
  });

  it('still reports an overlay whose text it cannot read (ONL-2297)', () => {
    const reading = readGuestPage(page({ 'vite-error-overlay': element(null) }));

    expect(reading.overlay?.source).toBe('vite');
    expect(reading.overlay?.message).not.toBe('');
  });

  it("reads Next's dialog out of its portal", () => {
    const portal = element(null, {
      '[data-nextjs-dialog]': 'Failed to compile. ./src/Hero.tsx  Error: Unexpected token',
    });

    expect(readGuestPage(page({ 'nextjs-portal': portal })).overlay).toEqual({
      source: 'next',
      message: 'Failed to compile. ./src/Hero.tsx Error: Unexpected token',
    });
  });

  it("looks past a Next portal that carries no dialog", () => {
    const indicator = element(null);
    const dialog = element(null, { '[data-nextjs-dialog]': 'Failed to compile. ./src/Hero.tsx' });

    expect(readGuestPage(page({ 'nextjs-portal': [indicator, dialog] })).overlay).toEqual({
      source: 'next',
      message: 'Failed to compile. ./src/Hero.tsx',
    });
  });

  it('reports a page that rendered neither text nor media as blank', () => {
    expect(readGuestPage(page({}, { innerText: '   ' }))).toEqual({ blank: true });
  });

  it('does not call a page of pictures blank', () => {
    expect(readGuestPage(page({ [MEDIA]: element(null) }, { innerText: '' }))).toEqual({});
  });

  it('does not call an app that renders into a shadow root blank', () => {
    const host = element(null, { 'x-hero': 'Lemonade Stand' });
    host.shadowRoot = { textContent: 'Lemonade Stand', querySelector: () => null, querySelectorAll: () => [] };

    expect(readGuestPage(page({ '*': host }, { innerText: '' }))).toEqual({});
  });

  it('says nothing about a page that is showing the site', () => {
    expect(readGuestPage(page())).toEqual({});
  });
});

describe('the script main ships into the guest', () => {
  // ⚠️ `readGuestPage` is serialized by `toString()`: a helper hoisted to module scope breaks every real read while the calls above still pass (ONL-2297).
  const serialized = new Function('document', `return ${GUEST_PAGE_READ_SCRIPT}`) as (
    doc: PageRootLike,
  ) => GuestPageReading;

  it('answers a healthy page with no error, closed over nothing', () => {
    expect(serialized(page())).toEqual({});
  });

  it("answers Vite's overlay with the file, closed over nothing", () => {
    const reading = serialized(
      page({
        'vite-error-overlay': element(null, {
          '.plugin': '[plugin:vite:react-babel]',
          '.message-body': 'Unexpected token',
          '.file': 'src/Hero.jsx:2:79',
        }),
      }),
    );

    expect(reading.overlay).toEqual({
      source: 'vite',
      message: '[plugin:vite:react-babel] Unexpected token',
      file: 'src/Hero.jsx:2:79',
    });
  });
});

describe('a reading that crossed from the guest', () => {
  it('refuses a value that is not an object', () => {
    expect(readingOf('broken')).toBeUndefined();
    expect(readingOf(null)).toBeUndefined();
  });

  it('drops an overlay whose source it does not know', () => {
    expect(readingOf({ overlay: { source: 'webpack', message: 'boom' } })).toEqual({});
  });

  it('keeps a blank flag beside an overlay it dropped', () => {
    expect(readingOf({ overlay: { source: 'webpack', message: 'boom' }, blank: true })).toEqual({ blank: true });
  });

  it('drops an overlay carrying no message', () => {
    expect(readingOf({ overlay: { source: 'vite', message: '' } })).toEqual({});
  });

  it('truncates a code frame and a stack a page made enormous', () => {
    const reading = readingOf({
      overlay: { source: 'vite', message: 'boom', codeFrame: 'x'.repeat(5_000), stack: 'y'.repeat(5_000) },
    });

    expect(reading?.overlay?.codeFrame?.length).toBe(1_200);
    expect(reading?.overlay?.stack?.length).toBe(400);
  });

  it('truncates a message a page made enormous', () => {
    const reading = readingOf({ overlay: { source: 'vite', message: 'x'.repeat(5_000) } });

    expect(reading?.overlay?.message.length).toBe(600);
  });
});

describe('what a reading means', () => {
  it('carries the overlay through as the error', () => {
    expect(
      derivePageError({
        read: true,
        reading: { overlay: { source: 'vite', message: 'Unexpected token', file: 'src/Hero.jsx:2:79' } },
      }),
    ).toEqual({ source: 'vite', message: 'Unexpected token', file: 'src/Hero.jsx:2:79' });
  });

  it('reports a blank page', () => {
    expect(derivePageError({ read: true, reading: { blank: true } })?.source).toBe('blank');
  });

  it('reports nothing for a page that is showing the site', () => {
    expect(derivePageError({ read: true, reading: {} })).toBeUndefined();
  });

  it('reports a page that never answered', () => {
    expect(derivePageError({ read: false, why: 'timeout' })?.source).toBe('unreadable');
  });

  it('reports a page it reached but could not read (ONL-2297)', () => {
    expect(derivePageError({ read: false, why: 'failed' })?.source).toBe('unreadable');
  });

  it('stays quiet when the frame simply has no page to address', () => {
    expect(derivePageError({ read: false, why: 'unaddressable' })).toBeUndefined();
  });
});

describe('the reading every list_frames takes', () => {
  it('answers the same broken page twice — it is recomputed, never drained (ONL-2297)', async () => {
    const broken = read({
      read: true,
      reading: { overlay: { source: 'vite', message: 'Unexpected token', file: 'src/Hero.jsx:2:79' } },
    });

    const first = await readPageErrors([frame()], broken, { settle: atOnce });
    const second = await readPageErrors([frame()], broken, { settle: atOnce });

    expect(first.get('frame-1')?.file).toBe('src/Hero.jsx:2:79');
    expect(second.get('frame-1')?.file).toBe('src/Hero.jsx:2:79');
  });

  it('does not call a client-rendered app blank while it is still mounting (ONL-2297)', async () => {
    const looks: GuestReadOutcome[] = [
      { read: true, reading: { blank: true } },
      { read: true, reading: {} },
    ];
    const mounting = await readPageErrors(
      [frame()],
      () => Promise.resolve(looks.shift() ?? { read: true, reading: {} }),
      { settle: atOnce },
    );

    expect(mounting.size).toBe(0);
  });

  it('reports a page that is still blank on the second look', async () => {
    const blank = await readPageErrors([frame()], read({ read: true, reading: { blank: true } }), { settle: atOnce });

    expect(blank.get('frame-1')?.source).toBe('blank');
  });

  it('keeps the blank verdict when the confirming look does not answer', async () => {
    const looks: GuestReadOutcome[] = [
      { read: true, reading: { blank: true } },
      { read: false, why: 'timeout' },
    ];
    const held = await readPageErrors(
      [frame()],
      () => Promise.resolve(looks.shift() ?? { read: true, reading: {} }),
      { settle: atOnce },
    );

    expect(held.get('frame-1')?.source).toBe('blank');
  });

  it('does not pay the confirm again for a page already confirmed blank (ONL-2297)', async () => {
    const confirmedBlank = new Set<string>();
    const blank = read({ read: true, reading: { blank: true } });
    let confirms = 0;
    const counted = (): Promise<void> => {
      confirms += 1;
      return atOnce();
    };

    const first = await readPageErrors([frame()], blank, { settle: counted, confirmedBlank });
    const second = await readPageErrors([frame()], blank, { settle: counted, confirmedBlank });

    expect(first.get('frame-1')?.source).toBe('blank');
    expect(second.get('frame-1')?.source).toBe('blank');
    // The page is still read on both calls; only the second look's wait is skipped.
    expect(confirms).toBe(1);
  });

  it('confirms again once the page has stopped being blank', async () => {
    const confirmedBlank = new Set<string>(['frame-1']);

    const healthy = await readPageErrors([frame()], read({ read: true, reading: {} }), {
      settle: atOnce,
      confirmedBlank,
    });

    expect(healthy.size).toBe(0);
    expect(confirmedBlank.has('frame-1')).toBe(false);
  });

  it('forgets a frame that left the canvas', async () => {
    const confirmedBlank = new Set<string>(['gone']);

    await readPageErrors([frame()], read({ read: true, reading: {} }), { settle: atOnce, confirmedBlank });

    expect(confirmedBlank.has('gone')).toBe(false);
  });

  it('clears itself once the page is fixed', async () => {
    const healthy = await readPageErrors([frame()], read({ read: true, reading: {} }), { settle: atOnce });

    expect(healthy.size).toBe(0);
  });

  it('leaves a frame that is still loading alone', async () => {
    const loading = await readPageErrors(
      [frame({ health: 'loading' })],
      read({ read: true, reading: { blank: true } }),
      { settle: atOnce },
    );

    expect(loading.size).toBe(0);
  });

  it('leaves a frame it cannot address alone', async () => {
    const unaddressable = await readPageErrors(
      [frame({ webContentsId: undefined })],
      read({ read: true, reading: { blank: true } }),
      { settle: atOnce },
    );

    expect(unaddressable.size).toBe(0);
  });

  it('says nothing about a page that has wandered off this machine', async () => {
    const remote = await readPageErrors(
      [frame({ currentUrl: 'https://example.com/pricing' })],
      read({ read: true, reading: { blank: true } }),
      { settle: atOnce },
    );

    expect(remote.size).toBe(0);
  });

  it('reads every frame on the canvas, not only the first', async () => {
    const errors = await readPageErrors(
      [frame(), frame({ id: 'frame-2' })],
      read({ read: true, reading: { overlay: { source: 'vite', message: 'Unexpected token' } } }),
      { settle: atOnce },
    );

    expect([...errors.keys()]).toEqual(['frame-1', 'frame-2']);
  });
});

describe('from the page to the agent’s reading', () => {
  it('turns a real overlay into a pageError naming the file, every stage joined up', async () => {
    const broken = page({
      'vite-error-overlay': element(null, {
        '.plugin': '[plugin:vite:react-babel]',
        '.message-body': 'Unexpected token, expected ","',
        '.file': 'src/Hero.jsx:2:79',
      }),
    });

    const errors = await readPageErrors(
      [frame()],
      () => {
        const crossed = readingOf(JSON.parse(JSON.stringify(readGuestPage(broken))));
        return Promise.resolve(
          crossed === undefined ? { read: false, why: 'failed' } : { read: true, reading: crossed },
        );
      },
      { settle: atOnce },
    );

    expect(errors.get('frame-1')).toEqual({
      source: 'vite',
      message: '[plugin:vite:react-babel] Unexpected token, expected ","',
      file: 'src/Hero.jsx:2:79',
    });
  });
});
