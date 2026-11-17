import { takeComplaints } from '../../testing/dom.js';
import { expect, it, spyOn } from 'bun:test';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { StudioBridge } from '@studio/events';
import type { WebviewTag } from 'electron';
import * as facts from '../frameFacts.js';
import * as attach from '../frame/useFrameAttachUrl.js';
import { ArtifactWebview } from './ArtifactWebview.js';
import { artifactSnapshots } from './snapshots.js';

type Layer = React.ReactElement<{ 'data-testid'?: string; src?: string; style?: React.CSSProperties }>;
const layers = (surface: React.JSX.Element): Layer[] => React.Children.toArray((surface.props as { children: React.ReactNode }).children) as Layer[];
const found = (surface: React.JSX.Element, testId: string): number => layers(surface).findIndex((child) => child.props['data-testid'] === testId);

it('publishes a deferred leased Artifact guest and ignores a superseded page attachment', async () => {
  const previousBridge = window.studio;
  type Result = Awaited<ReturnType<StudioBridge['canvasFrameAttach']>>;
  const pending: { nodeId: string; resolve: (result: Result) => void }[] = [];
  window.studio = { ...window.studio, canvasFrameAttach: ({ nodeId }) => new Promise<Result>((resolve) => {
    pending.push({ nodeId, resolve });
  }) };
  const globals = {
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    requestIdleCallback: () => 0,
    cancelIdleCallback: () => {},
    IntersectionObserver: class { observe(): void {} disconnect(): void {} },
  };
  const descriptors = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const guests: { element: HTMLElement; ready: boolean; reloads: number }[] = [];
  const createElement = document.createElement.bind(document);
  const create = spyOn(document, 'createElement').mockImplementation(((name: string, options?: ElementCreationOptions) => {
    const element = createElement(name, options);
    if (name !== 'webview') return element;
    const guest = { element, ready: false, reloads: 0 };
    const contentsId = guests.push(guest);
    Object.assign(element, {
      getWebContentsId: () => { if (!guest.ready) throw new Error('not ready'); return contentsId; },
      reload: () => { guest.reloads += 1; },
      isLoading: () => true,
    });
    return element;
  }) as typeof document.createElement);
  const attached = spyOn(facts, 'noteGuestAttached');
  const gone = spyOn(facts, 'noteGuestGone');
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  const page = (name: string) => `studio-artifact://leased-artifact/pages/${name}.html`;
  const render = async (name: string, revision = 'v1') => {
    await React.act(async () => {
      root ??= createRoot(container);
      root.render(<ArtifactWebview nodeId="leased-artifact" url={page(name)} revision={revision} cover="data:image/png;base64,cover" />);
    });
  };
  try {
    await render('first');
    expect(pending.map(({ nodeId }) => nodeId)).toEqual(['leased-artifact']);
    expect(container.querySelector('webview')).toBeNull();
    expect(container.querySelector('[data-testid="artifact-cover"]')).not.toBeNull();
    expect(attached).not.toHaveBeenCalled();
    const initialLease = 'about:blank#studio-frame-attach=artifact-first';
    await React.act(async () => { pending[0]!.resolve({ url: initialLease }); });
    const original = guests.at(-1)!;
    expect(original.element.getAttribute('src')).toBe(initialLease);
    expect(attached).not.toHaveBeenCalled();
    await React.act(async () => { original.ready = true; original.element.dispatchEvent(new Event('dom-ready')); });
    expect(attached).toHaveBeenLastCalledWith('leased-artifact', 1);

    await render('superseded');
    expect(container.querySelector('webview')).toBeNull();
    expect(gone).toHaveBeenLastCalledWith('leased-artifact');
    await render('current');
    expect(pending.map(({ nodeId }) => nodeId)).toEqual(['leased-artifact', 'leased-artifact', 'leased-artifact']);
    const currentLease = 'about:blank#studio-frame-attach=artifact-current';
    await React.act(async () => { pending[2]!.resolve({ url: currentLease }); });
    const current = guests.at(-1)!;
    expect(current.element).not.toBe(original.element);
    expect(current.element.getAttribute('src')).toBe(currentLease);
    await React.act(async () => { current.ready = true; current.element.dispatchEvent(new Event('dom-ready')); });
    expect(attached).toHaveBeenLastCalledWith('leased-artifact', 2);
    await render('current', 'v2');
    expect(current.reloads).toBe(1);
    expect(original.reloads).toBe(0);
    const publications = attached.mock.calls.length;
    const retirements = gone.mock.calls.length;
    await React.act(async () => {
      pending[1]!.resolve({ url: 'about:blank#studio-frame-attach=artifact-stale' });
      original.element.dispatchEvent(new Event('dom-ready'));
      original.element.dispatchEvent(new Event('destroyed'));
      original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { isMainFrame: true, errorCode: -102 }));
    });
    expect(guests).toHaveLength(2);
    expect(container.querySelector('webview')).toBe(current.element);
    expect(attached.mock.calls.length).toBe(publications);
    expect(gone.mock.calls.length).toBe(retirements);
    expect(container.querySelector('[data-testid="artifact-cover"]')).not.toBeNull();
    await React.act(async () => {
      current.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { isMainFrame: true, errorCode: -102 }));
    });
    expect(container.querySelector('[data-testid="artifact-cover"]')).toBeNull();
    await React.act(async () => { root!.unmount(); });
    root = undefined;
    expect(gone).toHaveBeenLastCalledWith('leased-artifact');
  } finally {
    await React.act(async () => { root?.unmount(); });
    container.remove();
    create.mockRestore();
    attached.mockRestore();
    gone.mockRestore();
    facts.forgetFrameFacts();
    window.studio = previousBridge;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    expect(takeComplaints()).toEqual([]);
  }
});

it('paints the remembered page picture alone, and under a session snapshot when one exists', async () => {
  const url = 'studio-artifact://artifact-b/pages/cover.html';
  const cover = 'data:image/png;base64,last-render';
  const effect = spyOn(React, 'useEffect').mockImplementation(() => {});
  const ref = spyOn(React, 'useRef').mockImplementation(() => ({ current: null }));
  const state = spyOn(React, 'useState').mockImplementation((value?: unknown) => [typeof value === 'function' ? value() : value, () => {}] as never);
  try {
    const alone = ArtifactWebview({ url, cover, snapshotRevision: 'v1', nodeId: 'cover-node' });
    expect(found(alone, 'artifact-snapshot')).toBe(-1);
    const picture = layers(alone)[found(alone, 'artifact-cover')]!;
    expect(picture.props.src).toBe(cover);
    // The preview is 1000x625 and the node box 480x640: contain would leave most of the node muted.
    expect(picture.props.style).toMatchObject({ objectFit: 'cover', objectPosition: 'top center' });

    await artifactSnapshots.capture(`cover-node:${url}:v1`, () => true, async () => ({ image: 'data:image/png;base64,own-box', width: 640, height: 400 }));
    const both = ArtifactWebview({ url, cover, snapshotRevision: 'v1', nodeId: 'cover-node' });
    expect(found(both, 'artifact-cover')).toBeGreaterThanOrEqual(0);
    expect(found(both, 'artifact-snapshot')).toBeGreaterThan(found(both, 'artifact-cover'));
  } finally { effect.mockRestore(); ref.mockRestore(); state.mockRestore(); }
});

for (const revision of ['v1', 'v1:4']) it(`covers a remounted artifact after refresh revision ${revision} while the new guest loads`, async () => {
  const url = 'studio-artifact://artifact-a/pages/remount.html';
  await artifactSnapshots.capture(`canvas-art:${url}:v1`, () => true, async () => ({ image: 'data:image/png;base64,last-page', width: 640, height: 400 }));
  const effect = spyOn(React, 'useEffect').mockImplementation(() => {});
  const ref = spyOn(React, 'useRef').mockImplementation(() => ({ current: null }));
  const state = spyOn(React, 'useState').mockImplementation((value?: unknown) => [typeof value === 'function' ? value() : value, () => {}] as never);
  try {
    const surface = ArtifactWebview({ url, revision, snapshotRevision: 'v1', nodeId: 'canvas-art' });
    const children = React.Children.toArray(surface.props.children) as React.ReactElement<{ 'data-testid'?: string; src?: string }>[];
    const snapshot = children.find((child) => child.props['data-testid'] === 'artifact-snapshot');
    expect(snapshot?.props.src).toBe('data:image/png;base64,last-page');
  } finally { effect.mockRestore(); ref.mockRestore(); state.mockRestore(); }
});

for (const initiallyReady of [true, false]) {
  it(`publishes the canvas guest when ready is ${initiallyReady ? 'before' : 'after'} binding and forgets it on cleanup`, () => {
    let ready = initiallyReady;
    const listeners = new Map<string, Set<() => void>>();
    const guest = {
      getWebContentsId() { if (!ready) throw new Error('not ready'); return 19; },
      reload() {},
      addEventListener(type: string, listener: () => void) {
        const set = listeners.get(type) ?? new Set();
        set.add(listener);
        listeners.set(type, set);
      },
      removeEventListener(type: string, listener: () => void) { listeners.get(type)?.delete(listener); },
    };
    const effects: (() => unknown)[] = [];
    const attachUrl = spyOn(attach, 'useFrameAttachUrl').mockImplementation((_nodeId, url) => url);
    const effect = spyOn(React, 'useEffect').mockImplementation((callback) => { effects.push(callback); });
    const ref = spyOn(React, 'useRef').mockImplementation(() => ({ current: null }));
    const state = spyOn(React, 'useState').mockImplementation((value?: unknown) => [typeof value === 'function' ? value() : value, () => {}] as never);
    const attached = spyOn(facts, 'noteGuestAttached').mockImplementation(() => {});
    const gone = spyOn(facts, 'noteGuestGone').mockImplementation(() => {});
    try {
      ArtifactWebview({ url: 'studio-artifact://artifact-a/pages/index.html', nodeId: 'canvas-art', webviewRef: { current: guest as unknown as WebviewTag } });
      const cleanup = effects[0]!() as () => void;
      expect(attached).toHaveBeenCalledTimes(initiallyReady ? 1 : 0);
      ready = true;
      for (const listener of listeners.get('dom-ready') ?? []) listener();
      expect(attached).toHaveBeenLastCalledWith('canvas-art', 19);
      const calls = attached.mock.calls.length;
      cleanup();
      expect(gone).toHaveBeenLastCalledWith('canvas-art');
      for (const listener of listeners.get('dom-ready') ?? []) listener();
      expect(attached).toHaveBeenCalledTimes(calls);
      expect(listeners.get('destroyed')?.size).toBe(0);
    } finally {
      attachUrl.mockRestore();
      effect.mockRestore();
      ref.mockRestore();
      state.mockRestore();
      attached.mockRestore();
      gone.mockRestore();
    }
  });
}
