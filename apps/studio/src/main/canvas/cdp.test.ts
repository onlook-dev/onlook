import { describe, expect, it } from 'bun:test';
import { session } from 'electron';
import { ARTIFACTS_PARTITION } from '@studio/events';
import { framesSession } from '../frames/partition.js';
import {
  captureGuest,
  captureGuestForThumbnail,
  clipGuest,
  evaluateInGuest,
  readGuestFrame,
  readGuestPageError,
  THUMBNAIL_SOURCE_MAX_EDGE,
  type GuestSource,
} from './cdp.js';
import { seatTabFreezer, type RevealFacts } from './capture-view.js';

interface FakeImage {
  isEmpty(): boolean;
  toPNG(): Buffer;
  getSize(): { width: number; height: number };
  toBitmap(): Buffer;
  resize(options: { width?: number; height?: number; quality?: string }): FakeImage;
  crop(rect: { x: number; y: number; width: number; height: number }): FakeImage;
  resizes: { width: number; height: number }[];
  pngReads: number;
}

const fakeImage = (base64: string, empty = false, size = { width: 800, height: 600 }): FakeImage => {
  const image: FakeImage = {
    isEmpty: () => empty,
    toPNG: () => {
      image.pngReads += 1;
      return Buffer.from(base64, 'base64');
    },
    getSize: () => size,
    toBitmap: () => Buffer.alloc(0),
    resize: (options) => {
      const asked = { width: options.width ?? size.width, height: options.height ?? size.height };
      image.resizes.push(asked);
      return fakeImage(base64, empty, asked);
    },
    crop: (rect) => fakeImage(base64, empty, { width: rect.width, height: rect.height }),
    resizes: [],
    pngReads: 0,
  };
  return image;
};

interface FakeGuest {
  hostWebContents?: unknown;
  attached: boolean;
  attachCount: number;
  detachCount: number;
  destroyed: boolean;
  isDestroyed(): boolean;
  getType(): string;
  getURL(): string;
  getZoomFactor(): number;
  session: unknown;
  capturePage(rect?: { x: number; y: number; width: number; height: number }): Promise<FakeImage>;
  captureRects: ({ x: number; y: number; width: number; height: number } | undefined)[];
  isolatedReads: number;
  executeJavaScriptInIsolatedWorld(worldId: number, scripts: { code: string }[]): Promise<unknown>;
  loading: boolean;
  isLoading(): boolean;
  stopLoading(): void;
  on(event: string, listener: () => void): void;
  removeListener(event: string, listener: () => void): void;
  debugger: {
    isAttached(): boolean;
    attach(version?: string): void;
    detach(): void;
    sendCommand(method: string, params?: object): Promise<unknown>;
  };
}

interface FakeOptions {
  destroyed?: boolean;
  attachThrows?: string;
  alreadyAttached?: boolean;
  respond?: (method: string, params?: object) => Promise<unknown>;
  capture?: () => Promise<FakeImage>;
  type?: string;
  url?: string;
  session?: unknown;
  isolated?: () => Promise<unknown>;
  isolatedThrows?: string;
  viewport?: { width: number; height: number; ratio?: number };
  zoom?: number;
}

function fakeGuest(options: FakeOptions = {}): FakeGuest {
  const listeners = new Map<string, (() => void)[]>();
  const guest: FakeGuest = {
    attached: options.alreadyAttached ?? false,
    attachCount: 0,
    detachCount: 0,
    destroyed: options.destroyed ?? false,
    isDestroyed: () => guest.destroyed,
    getType: () => options.type ?? 'webview',
    getURL: () => options.url ?? 'http://localhost:3000/',
    getZoomFactor: () => options.zoom ?? 1,
    session: options.session ?? framesSession(),
    captureRects: [],
    capturePage: (rect) => {
      guest.captureRects.push(rect);
      return options.capture ? options.capture() : Promise.resolve(fakeImage('iVBORw0KGgo='));
    },
    loading: false,
    isLoading: () => guest.loading,
    stopLoading: () => {
      guest.loading = false;
      for (const listener of [...(listeners.get('did-stop-loading') ?? [])]) listener();
    },
    on: (event, listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
    },
    removeListener: (event, listener) => {
      listeners.set(event, (listeners.get(event) ?? []).filter((each) => each !== listener));
    },
    isolatedReads: 0,
    executeJavaScriptInIsolatedWorld: (_worldId, scripts) => {
      guest.isolatedReads += 1;
      if (options.isolatedThrows !== undefined) throw new Error(options.isolatedThrows);
      return options.isolated ? options.isolated() : Promise.resolve(scripts[0]?.code.includes('innerWidth') ? { ratio: 1, ...(options.viewport ?? { width: 800, height: 600 }) } : {});
    },
    debugger: {
      isAttached: () => guest.attached,
      attach: () => {
        if (options.attachThrows !== undefined) throw new Error(options.attachThrows);
        guest.attachCount += 1;
        guest.attached = true;
      },
      detach: () => {
        guest.detachCount += 1;
        guest.attached = false;
      },
      sendCommand: async (method, params) => {
        if (options.respond) return options.respond(method, params);
        return {};
      },
    },
  };
  return guest;
}

const sourceFor = (guest: FakeGuest | undefined): GuestSource =>
  (() => guest) as unknown as GuestSource;

// No default for `webContentsId`: a default fires on an explicit `undefined` and hollows the unaddressable case.
const deps = (guest: FakeGuest | undefined, webContentsId?: number) => ({
  frameId: 'frame-a',
  webContentsId,
  guests: sourceFor(guest),
});

const addressable = (guest: FakeGuest | undefined) => deps(guest, 7);

describe('artifact canvas guests', () => {
  it('evaluates and captures only the artifact the canvas object owns', async () => {
    const guest = fakeGuest({ session: session.fromPartition(ARTIFACTS_PARTITION), url: 'studio-artifact://artifact-a/pages/index.html' });
    const own = { ...addressable(guest), artifactId: 'artifact-a' };
    expect((await evaluateInGuest(own, '1')).ok).toBe(true);
    expect((await captureGuest(own)).ok).toBe(true);
    for (const artifactId of [undefined, 'artifact-b']) {
      const wrong = { ...addressable(guest), ...(artifactId === undefined ? {} : { artifactId }) };
      expect((await evaluateInGuest(wrong, '1')).ok).toBe(false);
      expect((await captureGuest(wrong)).ok).toBe(false);
    }
  });
  it('rejects artifact identities on frames, other sessions, and other URL authorities', async () => {
    for (const options of [
      { url: 'studio-artifact://artifact-a/pages/index.html' },
      { session: session.fromPartition(ARTIFACTS_PARTITION), url: 'http://localhost:3000/' },
      { session: session.fromPartition(ARTIFACTS_PARTITION), url: 'studio-artifact://artifact-a.other/pages/index.html' },
      { session: session.fromPartition(ARTIFACTS_PARTITION), url: 'studio-artifact://user@artifact-a/pages/index.html' },
    ]) {
      const guest = fakeGuest(options);
      const asked = { ...addressable(guest), artifactId: 'artifact-a' };
      expect((await evaluateInGuest(asked, '1')).ok).toBe(false);
      expect((await captureGuest(asked)).ok).toBe(false);
      expect(guest.attachCount).toBe(0);
      expect(guest.captureRects).toHaveLength(0);
    }
  });
});

const forThumbnail = (guest: FakeGuest | undefined, deadlineMs = 1_000) => ({
  ...addressable(guest),
  deadlineMs,
});

describe('resolving a frame to a page', () => {
  it('refuses a frame with no mirrored webContents id', async () => {
    const guest = fakeGuest();
    const result = await evaluateInGuest(deps(guest), '1');
    expect(result.ok).toBe(false);
    expect(guest.attachCount).toBe(0);
  });

  it('refuses an id that resolves to nothing — the guest died in the push gap', async () => {
    const result = await evaluateInGuest(addressable(undefined), '1');
    expect(result.ok).toBe(false);
  });

  it('refuses a destroyed guest rather than attaching to it', async () => {
    const guest = fakeGuest({ destroyed: true });
    const result = await evaluateInGuest(addressable(guest), '1');
    expect(result.ok).toBe(false);
    expect(guest.attachCount).toBe(0);
  });
});

describe('the attachment lifecycle', () => {
  it('detaches after a command that threw in the page', async () => {
    const guest = fakeGuest({
      respond: async () => ({
        exceptionDetails: { exception: { description: 'ReferenceError: nope' } },
      }),
    });
    const result = await evaluateInGuest(addressable(guest), 'nope');
    expect(result.ok).toBe(false);
    expect(guest.attached).toBe(false);
    expect(guest.detachCount).toBe(1);
  });

  it('detaches after the transport itself throws mid-command', async () => {
    const guest = fakeGuest({
      respond: async () => {
        throw new Error('target closed');
      },
    });
    const result = await evaluateInGuest(addressable(guest), '1');
    expect(result.ok).toBe(false);
    expect(guest.attached).toBe(false);
    expect(guest.detachCount).toBe(1);
  });

  it('reports an attach that throws as a refusal, not a crash', async () => {
    const guest = fakeGuest({ attachThrows: 'cannot attach' });
    const result = await evaluateInGuest(addressable(guest), '1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('cannot attach');
  });

  it('refuses a page somebody else is already debugging, without detaching them', async () => {
    const guest = fakeGuest({ alreadyAttached: true });
    const result = await evaluateInGuest(addressable(guest), '1');
    expect(result.ok).toBe(false);
    expect(guest.detachCount).toBe(0);
    expect(guest.attached).toBe(true);
  });
});

describe('evaluate', () => {
  it('serializes a value the way the renderer half did', async () => {
    const guest = fakeGuest({
      respond: async () => ({ result: { value: { a: 1 } } }),
    });
    const result = await evaluateInGuest(addressable(guest), '({a:1})');
    expect(result).toEqual({ ok: true, value: '{"a":1}' });
  });

  it('answers the string "undefined" for a script with no value', async () => {
    const guest = fakeGuest({ respond: async () => ({ result: {} }) });
    expect(await evaluateInGuest(addressable(guest), 'void 0')).toEqual({
      ok: true,
      value: 'undefined',
    });
  });

  it('relays what the page threw', async () => {
    const guest = fakeGuest({
      respond: async () => ({
        exceptionDetails: { exception: { description: 'TypeError: x is not a function' } },
      }),
    });
    const result = await evaluateInGuest(addressable(guest), 'x()');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('TypeError: x is not a function');
  });
});

describe('a page that navigates while a script runs', () => {
  const navigatingGuest = (loss: string) => {
    let evaluations = 0;
    const guest: FakeGuest = fakeGuest({
      url: 'http://localhost:3000/menu',
      respond: async (method) => {
        if (method !== 'Runtime.evaluate') return {};
        evaluations += 1;
        guest.loading = true;
        setTimeout(() => guest.stopLoading(), 5);
        throw new Error(loss);
      },
    });
    return { guest, evaluations: () => evaluations };
  };

  it.each(['Inspected target navigated or closed', 'Execution context was destroyed.'])(
    'answers that the page loaded again once it has, running the script once (%s)',
    async (loss) => {
      const { guest, evaluations } = navigatingGuest(loss);
      const result = await evaluateInGuest(addressable(guest), 'location.reload(); await wait(800)');
      expect(result).toEqual({ ok: true, navigatedTo: 'http://localhost:3000/menu' });
      expect(guest.loading).toBe(false);
      expect(evaluations()).toBe(1);
    },
  );

  it('says the page is still loading when it has not finished by the bound', async () => {
    const guest = fakeGuest({
      respond: async (method) => {
        if (method !== 'Runtime.evaluate') return {};
        guest.loading = true;
        throw new Error('Inspected target navigated or closed');
      },
    });
    const result = await evaluateInGuest({ ...addressable(guest), navigationLoadMs: 5 }, 'location.reload(); await wait(800)');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('still loading');
  });

  it('keeps a page that went away a failure', async () => {
    const guest = fakeGuest({
      respond: async (method) => {
        if (method !== 'Runtime.evaluate') return {};
        guest.destroyed = true;
        throw new Error('Inspected target navigated or closed');
      },
    });
    expect((await evaluateInGuest(addressable(guest), 'window.close()')).ok).toBe(false);
  });
});

/** A tab renderer that answers every step at once, moving the view to a camera the frame paints whole under. */
function hostedBy(guest: FakeGuest, log: string[]): () => void {
  const tab = { width: 1200, height: 500 };
  const frame = { width: 1512, height: 982 };
  const at = (zoom: number) => ({ tab, pane: { left: 0, top: 0 }, frame, rect: { left: 100, top: 80, width: frame.width * zoom, height: frame.height * zoom }, hidden: false });
  const replies = { check: { state: 'needs-move', geometry: at(0.9) }, move: { state: 'moved', geometry: at(0.6) }, restore: { state: 'restored' } };
  const listeners = new Set<(event: unknown, answer: unknown) => void>();
  const host = {
    id: 9_000 + log.length,
    mainFrame: {},
    isDestroyed: () => false,
    ipc: {
      on: (_channel: string, listener: (event: unknown, answer: unknown) => void) => listeners.add(listener),
      removeListener: (_channel: string, listener: (event: unknown, answer: unknown) => void) => listeners.delete(listener),
    },
    send: (_channel: string, request: { requestId: number; step: keyof typeof replies }) => {
      log.push(request.step);
      queueMicrotask(() => {
        for (const listener of [...listeners]) listener({ sender: host, senderFrame: host.mainFrame }, { requestId: request.requestId, step: request.step, ...replies[request.step] });
      });
    },
  };
  guest.hostWebContents = host;
  seatTabFreezer(async () => {
    log.push('freeze');
    return { state: 'held', lift: () => log.push('unfreeze') };
  });
  return () => seatTabFreezer(undefined);
}

describe('a capture that moves the view', () => {
  it('captures the settled size when an off-screen frame resizes while its view is being revealed', async () => {
    const log: string[] = [];
    const phone = { width: 390, height: 844, ratio: 1 };
    const guest = fakeGuest({
      isolated: async () => log.includes('move') ? phone : { width: 800, height: 600, ratio: 1 },
      capture: async () => fakeImage('iVBORw0KGgo=', false, phone),
    });
    const unseat = hostedBy(guest, log);
    try {
      expect(await captureGuest(addressable(guest))).toEqual({ ok: true, pngBase64: 'iVBORw0KGgo=' });
      expect(guest.captureRects.at(-1)).toEqual({ x: 0, y: 0, width: 390, height: 844 });
      expect(log.filter(step => step === 'restore')).toHaveLength(2);
      expect(log.filter(step => step === 'unfreeze')).toHaveLength(2);
    } finally {
      unseat();
    }
  });

  it('reads the page before the freeze and after it lifts, so only the shot runs under the moved view (ONL-3031)', async () => {
    const log: string[] = [];
    const guest = fakeGuest({
      capture: async () => { log.push('shoot'); return fakeImage('iVBORw0KGgo='); },
      isolated: async () => { log.push('read'); return { width: 800, height: 600, ratio: 1 }; },
    });
    const unseat = hostedBy(guest, log);
    try {
      expect((await captureGuest(addressable(guest))).ok).toBe(true);
    } finally {
      unseat();
    }
    expect(log).toEqual(['read', 'check', 'freeze', 'move', 'shoot', 'restore', 'unfreeze', 'read']);
  });

  it('reads a clip\'s selectors before the freeze, so only the shot runs under the moved view (ONL-3031)', async () => {
    const log: string[] = [];
    const guest = fakeGuest({
      capture: async () => { log.push('shoot'); return fakeImage('iVBORw0KGgo='); },
      isolated: async () => { log.push('read'); return { width: 800, height: 600, ratio: 1, targets: [{ rect: { x: 100, y: 100, width: 200, height: 150 }, visible: true, inView: true }] }; },
    });
    const unseat = hostedBy(guest, log);
    try {
      const clip = await clipGuest({ ...addressable(guest), targets: [{ selector: '.gallery-item' }] });
      expect(clip.ok).toBe(true);
    } finally {
      unseat();
    }
    expect(log).toEqual(['shoot', 'read', 'check', 'freeze', 'move', 'shoot', 'restore', 'unfreeze']);
  });
});

describe('capture', () => {
  it('returns the png the page rendered, over capturePage and never the debugger (ONL-2304)', async () => {
    const guest = fakeGuest({ capture: async () => fakeImage('iVBORw0KGgo=') });
    expect(await captureGuest(addressable(guest))).toEqual({
      ok: true,
      pngBase64: 'iVBORw0KGgo=',
    });
    expect(guest.attachCount).toBe(0);
    expect(guest.captureRects).toEqual([{ x: 0, y: 0, width: 800, height: 600 }]);
  });

  it('captures a page somebody else is debugging, since it attaches nothing', async () => {
    const guest = fakeGuest({ alreadyAttached: true });
    expect((await captureGuest(addressable(guest))).ok).toBe(true);
    expect(guest.attached).toBe(true);
    expect(guest.detachCount).toBe(0);
  });

  it('refuses an empty image rather than answering with nothing', async () => {
    const guest = fakeGuest({ capture: async () => fakeImage('', true) });
    const result = await captureGuest(addressable(guest));
    expect(result.ok).toBe(false);
    expect(guest.attached).toBe(false);
  });

  it('a capture that never settles answers a refusal at the deadline', async () => {
    const guest = fakeGuest({ capture: () => new Promise(() => undefined) });
    const result = await captureGuest({ ...addressable(guest), deadlineMs: 20 });
    expect(result.ok).toBe(false);
  });

  it('reports a capture that threw as a refusal naming the error', async () => {
    const guest = fakeGuest({ capture: () => Promise.reject(new Error('Current display surface not available for capture')) });
    const result = await captureGuest(addressable(guest));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('FRAME_NOT_VISIBLE');
      expect(result.reason).toContain('read the page with evaluate_in_frame');
      expect(result.reason).toContain('Current display surface not available for capture');
    }
  });

  it('still refuses a retired id before capturing', async () => {
    let captured = 0;
    const retired = fakeGuest({ type: 'window', capture: async () => { captured += 1; return fakeImage('iVBORw0KGgo='); } });
    expect((await captureGuest(addressable(retired))).ok).toBe(false);
    expect(captured).toBe(0);
  });

  it('photographs and runs a script on a page at any address, where the code mapper stays on local ones (ONL-2658)', async () => {
    for (const url of ['https://example.com/', 'http://192.168.1.20:3000/', 'http://100.101.102.103:5173/']) {
      const guest = fakeGuest({ url, respond: async () => ({ result: { value: 1 } }) });
      expect(await captureGuest(addressable(guest))).toEqual({ ok: true, pngBase64: 'iVBORw0KGgo=' });
      expect((await evaluateInGuest(addressable(guest), '1')).ok).toBe(true);
      const mapped = await evaluateInGuest({ ...addressable(guest), localOnly: true }, '1');
      expect(!mapped.ok && mapped.reason).toContain('not a local address');
    }
  });

  it('refuses a script in a page that is not a web page', async () => {
    const guest = fakeGuest({ url: 'file:///etc/hosts' });
    expect((await evaluateInGuest(addressable(guest), '1')).ok).toBe(false);
    expect(guest.attachCount).toBe(0);
  });

  it('pictures the whole frame for a target it cannot clip, and says why (ONL-2977)', async () => {
    const guest = fakeGuest({
      isolated: async () => ({ width: 800, height: 600, ratio: 1, targets: [{ rect: { x: 100, y: 100, width: 200, height: 150 }, visible: true, inView: true }, { rect: { x: 100, y: 900, width: 200, height: 150 }, visible: true }, { stale: true }] }),
    });
    const clip = await clipGuest({ ...addressable(guest), targets: [{ selector: '.card' }, { ref: 'e9', expect: { role: 'link', name: 'Paywall' } }, { ref: 'e4', expect: null }] });
    expect(clip.ok && clip.targets.map(({ source, missed }) => [source, missed ?? null])).toEqual([['element', null], ['frame', 'not-in-view'], ['frame', 'stale-ref']]);
  });

  it('falls back to the frame’s picture from its last load when the capture fails (ONL-2977)', async () => {
    const guest = fakeGuest({ capture: () => Promise.reject(new Error('Current display surface not available for capture')) });
    const tile = fakeImage('dGlsZQ==', false, { width: 144, height: 112 });
    const clip = await clipGuest({ ...addressable(guest), targets: [{}], remembered: () => tile as never });
    expect(clip.ok).toBe(false);
    expect(!clip.ok && clip.remembered).toEqual(Buffer.from('dGlsZQ==', 'base64'));
    expect(!clip.ok && clip.reason).toContain('Current display surface');
  });

  it('reads a frame in Studio’s own world, never through the debugger', async () => {
    const answered = { url: 'https://example.com/', width: 800, height: 600, scrollY: 0, pageHeight: 600, truncated: false, items: [{ depth: 0, role: 'link', name: 'Home', ref: 'e1', place: 'in' as const }] };
    const guest = fakeGuest({ url: 'https://example.com/', alreadyAttached: true, isolated: async () => answered });
    expect(await readGuestFrame(addressable(guest))).toEqual({ ok: true, read: answered });
    expect(guest.attachCount).toBe(0);
    expect((await readGuestFrame(addressable(fakeGuest({ url: 'file:///etc/hosts', isolated: async () => answered })))).ok).toBe(false);
  });

  it('clips an element on a page at any address', async () => {
    for (const url of ['https://mobbin.com/discover', 'http://192.168.1.20:3000/']) {
      const guest = fakeGuest({
        url,
        isolated: async () => ({ width: 800, height: 600, ratio: 1, targets: [{ rect: { x: 100, y: 100, width: 200, height: 150 }, visible: true, inView: true }] }),
      });
      const clip = await clipGuest({ ...addressable(guest), targets: [{ selector: '.gallery-item' }] });
      expect(clip.ok && clip.targets.map((target) => target.ok)).toEqual([true]);
    }
  });

  it('refuses a reused id now held by a webview outside the Frames session, on every path', async () => {
    let captured = 0;
    const artifact = fakeGuest({
      session: session.fromPartition(ARTIFACTS_PARTITION),
      capture: async () => { captured += 1; return fakeImage('iVBORw0KGgo='); },
    });
    expect((await captureGuest(addressable(artifact))).ok).toBe(false);
    expect((await captureGuestForThumbnail(forThumbnail(artifact))).ok).toBe(false);
    expect((await evaluateInGuest(addressable(artifact), '1')).ok).toBe(false);
    expect(captured).toBe(0);
    expect(artifact.attachCount).toBe(0);
  });

  it('encodes the full-size image, so the thumbnail source cap never reaches the agent', async () => {
    const source = fakeImage('iVBORw0KGgo=', false, { width: 4096, height: 4096 });
    const guest = fakeGuest({ capture: async () => source, viewport: { width: 4096, height: 4096 } });
    expect(await captureGuest(addressable(guest))).toEqual({ ok: true, pngBase64: 'iVBORw0KGgo=' });
    expect(source.resizes).toEqual([]);
    expect(source.pngReads).toBe(1);
  });

  it('answers a capture that settles late when no deadline is passed', async () => {
    const guest = fakeGuest({
      capture: () =>
        new Promise((settle) => {
          setTimeout(() => settle(fakeImage('iVBORw0KGgo=')), 60);
        }),
    });
    expect((await captureGuest(addressable(guest))).ok).toBe(true);
  });

  for (const [placement, size] of [
    ['off-screen strip', { width: 800, height: 40 }],
    ['partly visible corner', { width: 120, height: 80 }],
    ['far off-canvas empty surface', { width: 0, height: 0 }],
  ] as const) {
    it(`refuses an ${placement} instead of encoding a partial image`, async () => {
      const image = fakeImage('iVBORw0KGgo=', false, size);
      const guest = fakeGuest({ capture: async () => image });
      const result = await captureGuest(addressable(guest));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('FRAME_NOT_VISIBLE');
        expect(result.reason).toContain(`${size.width}x${size.height}`);
        expect(result.reason).toContain('800x600');
        expect(result.reason).toContain('read the page with evaluate_in_frame');
      }
      expect(image.pngReads).toBe(0);
    });
  }

  it('checks every repeated capture even after the same frame returned a complete image', async () => {
    const sizes = [{ width: 800, height: 600 }, { width: 800, height: 30 }, { width: 800, height: 600 }];
    const guest = fakeGuest({ capture: async () => fakeImage('iVBORw0KGgo=', false, sizes.shift()!) });
    const results = [];
    while (sizes.length > 0) results.push((await captureGuest(addressable(guest))).ok);
    expect(results).toEqual([true, false, true]);
  });

  it('names a stalled capture separately from a frame that is not visible, and the step it stalled on', async () => {
    const guest = fakeGuest({ capture: () => new Promise(() => undefined) });
    const revealed: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    const result = await captureGuest({ ...addressable(guest), deadlineMs: 10, revealed });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('FRAME_CAPTURE_TIMEOUT');
    expect(revealed.stalledStep).toBe('capture');
  });

  it('bounds the viewport read as well as the image capture, and names the read as the stalled step', async () => {
    const guest = fakeGuest({ isolated: () => new Promise(() => undefined) });
    const revealed: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null };
    const result = await captureGuest({ ...addressable(guest), deadlineMs: 10, revealed });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('FRAME_CAPTURE_TIMEOUT');
    expect(revealed.stalledStep).toBe('viewport-read');
  });

  it('does not start a capture after its viewport read timed out, and later calls recover', async () => {
    let finishRead: ((value: unknown) => void) | undefined;
    let reads = 0;
    const guest = fakeGuest({ isolated: () => ++reads === 1
      ? new Promise(resolve => { finishRead = resolve; })
      : Promise.resolve({ width: 800, height: 600, ratio: 1 }) });
    expect((await captureGuest({ ...addressable(guest), deadlineMs: 10 })).ok).toBe(false);
    finishRead?.({ width: 800, height: 600, ratio: 1 });
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(guest.captureRects).toEqual([]);
    expect((await captureGuest(addressable(guest))).ok).toBe(true);
  });

  for (const viewport of [{ width: 0, height: 600 }, { width: Infinity, height: 600 }, { width: 800.5, height: 600 }]) {
    it(`refuses an unusable viewport width of ${viewport.width} before capture`, async () => {
      const guest = fakeGuest({ viewport });
      expect((await captureGuest(addressable(guest))).ok).toBe(false);
      expect(guest.captureRects).toEqual([]);
    });
  }

  it('refuses a viewport that keeps changing after one retry instead of comparing with a stale size', async () => {
    let reads = 0;
    const guest = fakeGuest({ isolated: async () => ({ width: ++reads % 2 === 1 ? 800 : 900, height: 600, ratio: 1 }) });
    const result = await captureGuest(addressable(guest));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('FRAME_VIEWPORT_CHANGED');
    expect(guest.captureRects).toHaveLength(2);
    expect(guest.isolatedReads).toBe(4);
  });

  it('discards the old-size image and returns only the complete image from the settled viewport', async () => {
    let reads = 0;
    const oldImage = fakeImage('b2xk', false, { width: 800, height: 600 });
    const settledImage = fakeImage('bmV3', false, { width: 390, height: 844 });
    const guest = fakeGuest({
      isolated: async () => ++reads === 1 ? { width: 800, height: 600, ratio: 1 } : { width: 390, height: 844, ratio: 1 },
      capture: async () => reads === 1 ? oldImage : settledImage,
    });
    expect(await captureGuest(addressable(guest))).toEqual({ ok: true, pngBase64: 'bmV3' });
    expect(oldImage.pngReads).toBe(0);
    expect(settledImage.pngReads).toBe(1);
    expect(guest.captureRects).toEqual([
      { x: 0, y: 0, width: 800, height: 600 },
      { x: 0, y: 0, width: 390, height: 844 },
    ]);
  });

  it('still refuses a partial image after the resize settles', async () => {
    let reads = 0;
    const partial = fakeImage('b2xk', false, { width: 800, height: 600 });
    const guest = fakeGuest({
      isolated: async () => ({ width: ++reads === 1 ? 800 : 900, height: 600, ratio: 1 }),
      capture: async () => partial,
    });
    const result = await captureGuest(addressable(guest));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('FRAME_NOT_VISIBLE');
    expect(guest.captureRects).toHaveLength(2);
    expect(partial.pngReads).toBe(0);
  });

  it('captures at the new display scale after it settles', async () => {
    let reads = 0;
    const image = fakeImage('bmV3', false, { width: 1600, height: 1200 });
    const guest = fakeGuest({
      isolated: async () => ({ width: 800, height: 600, ratio: ++reads === 1 ? 1 : 2 }),
      capture: async () => image,
    });
    expect(await captureGuest(addressable(guest))).toEqual({ ok: true, pngBase64: 'bmV3' });
    expect(image.pngReads).toBe(1);
    expect(guest.captureRects).toHaveLength(2);
  });

  it('never returns an image of a page that navigated away during capture', async () => {
    const image = fakeImage('iVBORw0KGgo=');
    const guest = fakeGuest({ capture: async () => {
      guest.getURL = () => 'https://example.com/';
      return image;
    } });
    const result = await captureGuest(addressable(guest));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('FRAME_PAGE_CHANGED');
    expect(image.pngReads).toBe(0);
    expect(guest.captureRects).toHaveLength(1);
  });

  for (const ratio of [1.25, 1.5, 2]) {
    it(`accepts a complete bitmap at device scale ${ratio} without resizing it`, async () => {
      const image = fakeImage('iVBORw0KGgo=', false, { width: Math.round(800 * ratio), height: Math.round(600 * ratio) });
      const guest = fakeGuest({ viewport: { width: 800, height: 600, ratio }, capture: async () => image });
      expect((await captureGuest(addressable(guest))).ok).toBe(true);
      expect(guest.captureRects).toEqual([{ x: 0, y: 0, width: 800, height: 600 }]);
      expect(image.resizes).toEqual([]);
    });

    it(`refuses a cropped bitmap even at device scale ${ratio}`, async () => {
      const image = fakeImage('iVBORw0KGgo=', false, { width: Math.round(800 * ratio), height: Math.round(600 * ratio) - 1 });
      const guest = fakeGuest({ viewport: { width: 800, height: 600, ratio }, capture: async () => image });
      const result = await captureGuest(addressable(guest));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('FRAME_NOT_VISIBLE');
      expect(image.pngReads).toBe(0);
    });
  }

  it('captures the whole guest in DIPs when page zoom changes its CSS viewport', async () => {
    const image = fakeImage('iVBORw0KGgo=', false, { width: 1600, height: 1200 });
    const guest = fakeGuest({ zoom: 1.25, viewport: { width: 640, height: 480, ratio: 2.5 }, capture: async () => image });
    expect((await captureGuest(addressable(guest))).ok).toBe(true);
    expect(guest.captureRects).toEqual([{ x: 0, y: 0, width: 800, height: 600 }]);
  });

  it('refuses a device scale that keeps changing after one retry', async () => {
    let reads = 0;
    const guest = fakeGuest({ isolated: async () => ({ width: 800, height: 600, ratio: ++reads % 2 === 1 ? 1 : 2 }) });
    const result = await captureGuest(addressable(guest));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('FRAME_VIEWPORT_CHANGED');
    expect(guest.captureRects).toHaveLength(2);
  });
});

describe('the thumbnail capture', () => {
  it('photographs a frame on a remote address', async () => {
    const guest = fakeGuest({ url: 'https://accounts.google.com/signin' });
    expect((await captureGuestForThumbnail(forThumbnail(guest))).ok).toBe(true);
  });

  it('still refuses a destroyed guest, a holder that is not a webview, and an unaddressable frame', async () => {
    let captured = 0;
    const count = async (): Promise<FakeImage> => {
      captured += 1;
      return fakeImage('iVBORw0KGgo=');
    };
    expect((await captureGuestForThumbnail(forThumbnail(fakeGuest({ destroyed: true, capture: count })))).ok).toBe(false);
    expect((await captureGuestForThumbnail(forThumbnail(fakeGuest({ type: 'window', capture: count })))).ok).toBe(false);
    expect((await captureGuestForThumbnail(forThumbnail(undefined))).ok).toBe(false);
    expect((await captureGuestForThumbnail({ ...forThumbnail(fakeGuest({ capture: count })), webContentsId: undefined })).ok).toBe(false);
    expect(captured).toBe(0);
  });

  it('hands the image over, reading none of its pixels', async () => {
    const source = fakeImage('iVBORw0KGgo=', false, { width: 800, height: 600 });
    const result = await captureGuestForThumbnail(forThumbnail(fakeGuest({ capture: async () => source })));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.image.getSize()).toEqual({ width: 800, height: 600 });
    expect(source.pngReads).toBe(0);
  });

  it('caps a source over the long edge before anything reads it, preserving its aspect', async () => {
    const source = fakeImage('iVBORw0KGgo=', false, { width: 4096, height: 2048 });
    const result = await captureGuestForThumbnail(forThumbnail(fakeGuest({ capture: async () => source })));
    expect(source.resizes).toEqual([{ width: THUMBNAIL_SOURCE_MAX_EDGE, height: 1024 }]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.image.getSize()).toEqual({ width: 2048, height: 1024 });
    expect(source.pngReads).toBe(0);
  });

  it('caps a tall source on its own long edge', async () => {
    const source = fakeImage('iVBORw0KGgo=', false, { width: 1500, height: 6000 });
    await captureGuestForThumbnail(forThumbnail(fakeGuest({ capture: async () => source })));
    expect(source.resizes).toEqual([{ width: 512, height: THUMBNAIL_SOURCE_MAX_EDGE }]);
  });

  it('does not upscale a source already inside the cap', async () => {
    const source = fakeImage('iVBORw0KGgo=', false, { width: 640, height: 480 });
    const result = await captureGuestForThumbnail(forThumbnail(fakeGuest({ capture: async () => source })));
    expect(source.resizes).toEqual([]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.image.getSize()).toEqual({ width: 640, height: 480 });
  });

  it('answers at the passed deadline, never at the agent command default', async () => {
    const guest = fakeGuest({ capture: () => new Promise(() => undefined) });
    const startedAt = Date.now();
    const result = await captureGuestForThumbnail(forThumbnail(guest, 20));
    expect(result.ok).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it('refuses an empty image rather than answering with nothing', async () => {
    const guest = fakeGuest({ capture: async () => fakeImage('', true) });
    expect((await captureGuestForThumbnail(forThumbnail(guest))).ok).toBe(false);
  });

  it('reports a capture that threw as a refusal rather than throwing into the caller', async () => {
    const guest = fakeGuest({ capture: () => Promise.reject(new Error('display surface not available')) });
    expect(await captureGuestForThumbnail(forThumbnail(guest))).toEqual({
      ok: false,
      reason: 'display surface not available',
    });
  });

  it('attaches no debugger, so a page somebody else is debugging still photographs', async () => {
    const guest = fakeGuest({ alreadyAttached: true });
    expect((await captureGuestForThumbnail(forThumbnail(guest))).ok).toBe(true);
    expect(guest.attachCount).toBe(0);
    expect(guest.detachCount).toBe(0);
  });
});

describe("reading what a page is showing", () => {
  const forPageRead = (guest: FakeGuest | undefined, deadlineMs?: number) => ({
    ...addressable(guest),
    ...(deadlineMs === undefined ? {} : { deadlineMs }),
  });

  it('stays silent about a frame with no page to address', async () => {
    expect(await readGuestPageError(deps(fakeGuest()))).toEqual({ read: false, why: 'unaddressable' });
  });

  it('answers the page’s own reading', async () => {
    const guest = fakeGuest({
      isolated: () => Promise.resolve({ overlay: { source: 'vite', message: 'Unexpected token', file: 'src/Hero.jsx:2:79' } }),
    });

    expect(await readGuestPageError(forPageRead(guest))).toEqual({
      read: true,
      reading: { overlay: { source: 'vite', message: 'Unexpected token', file: 'src/Hero.jsx:2:79' } },
    });
  });

  it('reports a read that failed rather than calling the page fine (ONL-2297)', async () => {
    // Chromium answers `undefined` for a script that threw in the isolated world.
    const guest = fakeGuest({ isolated: () => Promise.resolve(undefined) });

    expect(await readGuestPageError(forPageRead(guest))).toEqual({ read: false, why: 'failed' });
  });

  it('reports a read the page refused outright', async () => {
    const guest = fakeGuest({ isolatedThrows: 'no renderer' });

    expect(await readGuestPageError(forPageRead(guest))).toEqual({ read: false, why: 'failed' });
  });

  it('reports a read that ran past its deadline', async () => {
    const guest = fakeGuest({ isolated: () => new Promise(() => undefined) });

    expect(await readGuestPageError(forPageRead(guest, 10))).toEqual({ read: false, why: 'timeout' });
  });

  it('never attaches the debugger, which an open DevTools would refuse', async () => {
    const guest = fakeGuest();
    await readGuestPageError(forPageRead(guest));

    expect(guest.attachCount).toBe(0);
    expect(guest.isolatedReads).toBe(1);
  });
});
