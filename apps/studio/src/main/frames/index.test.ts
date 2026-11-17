import { describe, expect, it } from 'bun:test';
import { ARTIFACT_SCHEME, ARTIFACTS_PARTITION, type CanvasDocId } from '@studio/events';
import { applyGuestPolicies, isDevFrameSrc, watchArtifactGuest, watchGuest } from './index.js';
import { FRAMES_PARTITION } from './partition.js';

// Electron builds the guest from `webPreferences` alone; `params` carries the element's
// attributes and reaches the guest's session not at all, so a key written there is inert.
function attachGuest(attributes: Record<string, string>): { session: string; params: string[] } {
  const webPreferences: Electron.WebPreferences = {};
  if (attributes['partition'] !== undefined) webPreferences.partition = attributes['partition'];
  const params: Record<string, string> = { ...attributes };

  applyGuestPolicies(webPreferences, params);

  return { session: webPreferences.partition ?? 'default', params: Object.keys(params) };
}

// A dev frame always attaches with one: `nodeIssue()` enforces a non-empty `homeUrl`, and
// `newFrameUrl` admits only http, https and about:blank (ONL-2568).
const DEV = 'http://127.0.0.1:5173/';

describe('guest policies — the session a canvas frame lands in', () => {
  it('lands a dev frame in the frames partition whatever the element asked for', () => {
    expect(attachGuest({ src: DEV }).session).toBe(FRAMES_PARTITION);
    expect(attachGuest({ src: DEV, partition: '' }).session).toBe(FRAMES_PARTITION);
    expect(attachGuest({ src: DEV, partition: 'persist:borrowed' }).session).toBe(FRAMES_PARTITION);
    expect(attachGuest({ src: 'about:blank' }).session).toBe(FRAMES_PARTITION);
  });

  it('lands anything it does not positively recognise in the artifacts partition', () => {
    // Fail closed: `src` is renderer-controlled, and a webview can attach empty and be given
    // its URL afterwards, so the default must be the session with no bridge (ONL-2568).
    expect(attachGuest({}).session).toBe(ARTIFACTS_PARTITION);
    expect(attachGuest({ src: '' }).session).toBe(ARTIFACTS_PARTITION);
    expect(attachGuest({ src: `${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html` }).session).toBe(
      ARTIFACTS_PARTITION,
    );
    expect(attachGuest({ src: 'file:///etc/passwd' }).session).toBe(ARTIFACTS_PARTITION);
    expect(attachGuest({ src: 'data:text/html,hi' }).session).toBe(ARTIFACTS_PARTITION);
    expect(attachGuest({ src: 'not a url' }).session).toBe(ARTIFACTS_PARTITION);
  });

  it('adds no partition key to the element attributes, where it would be inert', () => {
    expect(attachGuest({ src: DEV }).params).not.toContain('partition');
  });

  it('matches the partitions the two elements ask for, so no login is stranded', () => {
    expect(FRAMES_PARTITION).toBe('persist:studio-frames');
    expect(ARTIFACTS_PARTITION).toBe('persist:studio-artifacts');
  });
});

describe('guest policies — what main refuses to take from the element', () => {
  function attach(attributes: Record<string, string>): {
    webPreferences: Electron.WebPreferences;
    params: Record<string, string>;
  } {
    const webPreferences: Electron.WebPreferences = {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      preload: '/tmp/attacker.js',
      webviewTag: true,
    };
    const params: Record<string, string> = { allowpopups: 'true', ...attributes };
    applyGuestPolicies(webPreferences, params);
    return { webPreferences, params };
  }

  it('pins the sandbox, isolation and preload, and denies popups on a dev frame', () => {
    const { webPreferences, params } = attach({ src: DEV });

    expect(webPreferences.nodeIntegration).toBe(false);
    expect(webPreferences.nodeIntegrationInSubFrames).toBe(false);
    expect(webPreferences.contextIsolation).toBe(true);
    expect(webPreferences.sandbox).toBe(true);
    expect(webPreferences.focusOnNavigation).toBe(false);
    expect(webPreferences.webviewTag).toBe(false);
    expect(webPreferences.preload).toMatch(/guest\.cjs$/);
    expect(params['allowpopups']).toBe('false');
  });

  it('takes the bridge away from a guest it does not recognise, and from the attacker attribute', () => {
    // The bridge is the element picker and the evidence rail: a page keeping it can forge
    // element evidence into the agent's prompt (ONL-2568).
    const cases: Record<string, string>[] = [{}, { src: '' }, { src: 'file:///etc/passwd' }];
    for (const attributes of cases) {
      const { webPreferences } = attach(attributes);
      expect(webPreferences.preload).toBeUndefined();
      expect(webPreferences.partition).toBe(ARTIFACTS_PARTITION);
      expect(webPreferences.sandbox).toBe(true);
      expect(webPreferences.contextIsolation).toBe(true);
      expect(webPreferences.webviewTag).toBe(false);
    }
  });
});

describe('isDevFrameSrc', () => {
  it('recognises what a dev frame really attaches with, and nothing else', () => {
    expect(isDevFrameSrc(DEV)).toBe(true);
    expect(isDevFrameSrc('https://example.com/')).toBe(true);
    expect(isDevFrameSrc('about:blank')).toBe(true);

    expect(isDevFrameSrc(undefined)).toBe(false);
    expect(isDevFrameSrc('')).toBe(false);
    expect(isDevFrameSrc(`${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/x`)).toBe(false);
    expect(isDevFrameSrc('file:///x')).toBe(false);
    expect(isDevFrameSrc('data:text/html,x')).toBe(false);
    expect(isDevFrameSrc('blob:http://localhost/x')).toBe(false);
    expect(isDevFrameSrc('javascript:alert(1)')).toBe(false);
  });
});

// The guest is addressed by its own `webContents` id, which is what the frame mirror indexes.
function fakeGuest(id: number): {
  contents: Electron.WebContents;
  fire: (event: string) => void;
  zoomPins: () => number;
} {
  const listeners = new Map<string, (() => void)[]>();
  let zoomPins = 0;
  const contents = {
    id,
    debugger: { on: (): void => undefined },
    isDestroyed: (): boolean => false,
    setZoomFactor: (): void => {
      zoomPins += 1;
    },
    setWindowOpenHandler: (): void => undefined,
    on: (event: string, listener: () => void): unknown => {
      const held = listeners.get(event) ?? [];
      held.push(listener);
      listeners.set(event, held);
      return contents;
    },
  } as unknown as Electron.WebContents;
  return {
    contents,
    fire: (event) => {
      for (const listener of listeners.get(event) ?? []) listener();
    },
    zoomPins: () => zoomPins,
  };
}

/** One guest whose navigation gates can be fired per frame, for either watcher. */
function navigableGuest(): {
  contents: Electron.WebContents;
  frameNavigate: (url: string, isMainFrame: boolean) => boolean;
} {
  const gates: ((event: { preventDefault: () => void; url: string; isMainFrame: boolean }) => void)[] = [];
  const contents = {
    id: 77,
    debugger: { on: (): void => undefined },
    isDestroyed: (): boolean => false,
    setZoomFactor: (): void => undefined,
    setWindowOpenHandler: (): void => undefined,
    setWebRTCIPHandlingPolicy: (): void => undefined,
    on: (event: string, listener: (payload: never) => void): unknown => {
      if (event === 'will-frame-navigate') {
        gates.push(listener as unknown as (typeof gates)[number]);
      }
      return contents;
    },
  } as unknown as Electron.WebContents;

  return {
    contents,
    frameNavigate: (url, isMainFrame) => {
      let prevented = false;
      const event = {
        preventDefault: (): void => {
          prevented = true;
        },
        url,
        isMainFrame,
      };
      for (const gate of gates) gate(event);
      return !prevented;
    },
  };
}

describe('a subframe navigation (ONL-2568)', () => {
  it('leaves a dev frame’s own iframes alone', () => {
    // The user's app frames `blob:`, `data:` and `about:srcdoc` for previews and editors;
    // before the artifact gate existed, a dev guest had no navigation gate at all.
    const guest = navigableGuest();
    watchGuest(guest.contents, { docIdForGuest: () => undefined, frameForGuest: () => undefined, markDirty: () => undefined, loaded: () => undefined });

    expect(guest.frameNavigate('blob:http://127.0.0.1:5173/abc', false)).toBe(true);
    expect(guest.frameNavigate('data:text/html,<p>hi', false)).toBe(true);
    expect(guest.frameNavigate('about:srcdoc', false)).toBe(true);
    // Its own main frame is still confined to http(s).
    expect(guest.frameNavigate('data:text/html,<p>hi', true)).toBe(false);
    expect(guest.frameNavigate(DEV, true)).toBe(true);
  });

  it('confines an artifact’s iframes to the artifact scheme', () => {
    const guest = navigableGuest();
    watchArtifactGuest(guest.contents);

    expect(guest.frameNavigate('data:text/html,<p>hi', false)).toBe(false);
    expect(guest.frameNavigate(`${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/two.html`, false)).toBe(
      true,
    );
  });
});

/** Records the two seams an artifact guest must never reach, plus what it is told to refuse. */
function fakeArtifactGuest(): {
  contents: Electron.WebContents;
  navigate: (url: string) => boolean;
  openHandler: () => (details: { url: string }) => { action: string };
  webRtcPolicies: string[];
  fire: (event: string) => void;
} {
  const navigators = new Map<string, ((event: { preventDefault: () => void }, url: string) => void)[]>();
  const webRtcPolicies: string[] = [];
  let openHandler: ((details: { url: string }) => { action: string }) | undefined;

  const contents = {
    id: 99,
    debugger: { on: (): void => undefined },
    isDestroyed: (): boolean => false,
    setZoomFactor: (): void => undefined,
    setWindowOpenHandler: (handler: (details: { url: string }) => { action: string }): void => {
      openHandler = handler;
    },
    setWebRTCIPHandlingPolicy: (policy: string): void => {
      webRtcPolicies.push(policy);
    },
    on: (event: string, listener: (event: { preventDefault: () => void }, url: string) => void): unknown => {
      const held = navigators.get(event) ?? [];
      held.push(listener);
      navigators.set(event, held);
      return contents;
    },
  } as unknown as Electron.WebContents;

  return {
    contents,
    /** Answers whether the navigation was allowed through. */
    navigate: (url) => {
      let prevented = false;
      const event = {
        preventDefault: (): void => {
          prevented = true;
        },
        url,
      };
      for (const listener of navigators.get('will-navigate') ?? []) listener(event, url);
      return !prevented;
    },
    openHandler: () => {
      if (openHandler === undefined) throw new Error('no window-open handler was installed');
      return openHandler;
    },
    webRtcPolicies,
    fire: (event) => {
      for (const listener of navigators.get(event) ?? []) listener({ preventDefault: () => undefined }, '');
    },
  };
}

describe('an artifact guest reports its loads, so a quote on it can lift (ONL-2960)', () => {
  it('reports a finished load against the node the mirror says holds it', () => {
    const guest = fakeArtifactGuest();
    const loads: [string, string][] = [];
    watchArtifactGuest(guest.contents, {
      frameForGuest: (webContentsId) => (webContentsId === 99 ? { docId: 'doc-a', frameId: 'a1' } : undefined),
      loaded: (docId, frameId) => loads.push([docId, frameId]),
    });
    guest.fire('did-finish-load');
    expect(loads).toEqual([['doc-a', 'a1']]);
  });

  it('reports nothing for a guest the mirror does not know', () => {
    const guest = fakeArtifactGuest();
    const loads: string[] = [];
    watchArtifactGuest(guest.contents, { frameForGuest: () => undefined, loaded: (_docId, frameId) => loads.push(frameId) });
    guest.fire('did-finish-load');
    expect(loads).toEqual([]);
  });
});

describe('an artifact guest reaches nothing (ONL-2568)', () => {
  it('denies a window open and hands the URL to no external handler', () => {
    const guest = fakeArtifactGuest();
    watchArtifactGuest(guest.contents);

    // The shared electron stub throws from `shell.openExternal`, so reaching it fails loudly.
    expect(guest.openHandler()({ url: 'https://example.com/' })).toEqual({ action: 'deny' });
    expect(guest.openHandler()({ url: 'http://127.0.0.1:5173/' })).toEqual({ action: 'deny' });
  });

  it('stops WebRTC at the guest, which the CSP directive does not do', () => {
    const guest = fakeArtifactGuest();
    watchArtifactGuest(guest.contents);

    expect(guest.webRtcPolicies).toEqual(['disable_non_proxied_udp']);
  });

  it('confines navigation to its own scheme, after attach', () => {
    const guest = fakeArtifactGuest();
    watchArtifactGuest(guest.contents);

    expect(guest.navigate(`${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html`)).toBe(true);

    expect(guest.navigate('http://localhost:5173/')).toBe(false);
    expect(guest.navigate('https://example.com/')).toBe(false);
    expect(guest.navigate('file:///etc/passwd')).toBe(false);
    expect(guest.navigate('data:text/html,hi')).toBe(false);
    expect(guest.navigate('blob:null/x')).toBe(false);
    expect(guest.navigate('about:blank')).toBe(false);
  });
});

describe('a dev guest stays on its own schemes (ONL-2568)', () => {
  it('refuses a navigation to the artifact scheme', () => {
    const guest = fakeArtifactGuest();
    watchGuest(guest.contents, { docIdForGuest: () => undefined, frameForGuest: () => undefined, markDirty: () => undefined, loaded: () => undefined });

    expect(guest.navigate('http://127.0.0.1:5173/next')).toBe(true);
    expect(guest.navigate(`${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html`)).toBe(false);
    expect(guest.navigate('file:///etc/passwd')).toBe(false);
  });
});

function watched(
  guests: Record<number, CanvasDocId | undefined>,
): { marked: CanvasDocId[]; watch: (contents: Electron.WebContents) => void } {
  const marked: CanvasDocId[] = [];
  return {
    marked,
    watch: (contents) =>
      watchGuest(contents, {
        docIdForGuest: (webContentsId) => guests[webContentsId],
        frameForGuest: () => undefined,
        markDirty: (docId) => marked.push(docId),
        loaded: () => undefined,
      }),
  };
}

describe('a navigating frame marks its project dirty (ONL-2471)', () => {
  it('marks the document the mirror says holds the guest', () => {
    const guest = fakeGuest(31);
    const { marked, watch } = watched({ 31: 'doc-a' });
    watch(guest.contents);

    guest.fire('did-navigate');

    expect(marked).toEqual(['doc-a']);
  });

  it('marks again when the same page is reloaded, which arrives as another did-navigate', () => {
    const guest = fakeGuest(31);
    const { marked, watch } = watched({ 31: 'doc-a' });
    watch(guest.contents);

    guest.fire('did-navigate');
    guest.fire('did-navigate');

    expect(marked).toEqual(['doc-a', 'doc-a']);
  });

  it('marks on an in-page navigation, which did-navigate does not report', () => {
    const guest = fakeGuest(31);
    const { marked, watch } = watched({ 31: 'doc-a' });
    watch(guest.contents);

    guest.fire('did-navigate-in-page');

    expect(marked).toEqual(['doc-a']);
  });

  it('marks its own project and NOT a sibling project’s', () => {
    const a = fakeGuest(31);
    const b = fakeGuest(32);
    const { marked, watch } = watched({ 31: 'doc-a', 32: 'doc-b' });
    watch(a.contents);
    watch(b.contents);

    a.fire('did-navigate');

    expect(marked).toEqual(['doc-a']);
  });

  it('marks nothing, and does not throw, for a guest the mirror cannot name', () => {
    const guest = fakeGuest(31);
    const { marked, watch } = watched({});
    watch(guest.contents);

    expect(() => guest.fire('did-navigate')).not.toThrow();
    expect(marked).toEqual([]);
  });

  it('still pins the zoom on every navigation (ONL-1989)', () => {
    const guest = fakeGuest(31);
    const { watch } = watched({ 31: 'doc-a' });
    watch(guest.contents);
    const atWatch = guest.zoomPins();

    guest.fire('did-navigate');
    guest.fire('did-navigate-in-page');
    guest.fire('zoom-changed');

    expect(atWatch).toBe(1);
    expect(guest.zoomPins()).toBe(4);
  });
});
