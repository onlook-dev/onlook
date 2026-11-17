// Selection and hover arrive as props; only the cover's own guest events need a mounted node.

import { takeComplaints } from '../../testing/dom.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import type { ArtifactPreviewRequest, ArtifactPreviewResult, ArtifactSummary, StudioBridge } from '@studio/events';
import { forgetArtifact, resolveArtifact } from './artifactCache.js';
import { artifactPreviewDemand } from './previewDemand.js';
import { artifactSnapshots } from './snapshots.js';
import {
  ArtifactNodeSurface,
  ArtifactNode,
  artifactReadState,
  type ArtifactNodeSurfaceProps,
} from './ArtifactNode.js';

const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const C = 'cccccccc-3333-4333-8333-cccccccccccc';
const D = 'dddddddd-4444-4444-8444-dddddddddddd';
const TITLE = 'Pricing idea';
const PICTURE = 'data:image/png;base64,last-render';
const STALE = 'data:image/png;base64,before-the-edit';

const summary = (over: Record<string, unknown> = {}) => ({
  id: A,
  title: TITLE,
  pagePath: 'pages/index.html',
  updatedAt: '2026-01-01T00:00:00.000Z',
  readOnly: false,
  ...over,
});

function markup(over: Partial<ArtifactNodeSurfaceProps> = {}): string {
  return renderToStaticMarkup(
    <ArtifactNodeSurface title={TITLE} state="reading" isSelected={false} {...over} />,
  );
}

describe('which state a node whose artifact is being read shows', () => {
  it('holds the pending state until the read for its own id lands', () => {
    expect(artifactReadState(A, null).state).toBe('reading');
    // A read for another id is not this node's answer.
    expect(artifactReadState(B, { id: A, summary: summary() }).state).toBe('reading');
  });

  it('calls only a resolved absence missing', () => {
    expect(artifactReadState(A, { id: A, summary: null }).state).toBe('missing');
  });

  it('builds the page URL from the id and the path the manifest named', () => {
    const resolved = artifactReadState(A, { id: A, summary: summary() });
    expect(resolved.state).toBe('resolved');
    expect(resolved.url).toBe(`studio-artifact://${A}/pages/index.html`);
  });
});

describe('what each state draws', () => {
  it('keeps the title centered between equally reserved controls', () => {
    const html = markup({isSelected: true, artifact: summary(), onRefresh: () => {}});
    expect(html).toContain('grid-template-columns:var(--spacing-6) minmax(0, 1fr) var(--spacing-6)');
    expect(html).toContain('text-align:center');
    expect(html.indexOf('canvas-artifact-refresh')).toBeLessThan(html.indexOf('artifact-title-button'));
    expect(html.indexOf('canvas-artifact-export')).toBeGreaterThan(html.indexOf('artifact-title-button'));
    expect(markup({onRefresh: () => {}})).not.toContain('canvas-artifact-refresh');
  });
  it('uses the shared square frame ring after the clipped surface, differing only in color', () => {
    for (const state of ['reading', 'resolved', 'missing'] as const) {
      const resting = markup({ state });
      expect(resting).toContain('calc(0.5px * 1) solid transparent');
      expect(resting.indexOf('data-testid="frame-ring"')).toBeGreaterThan(resting.indexOf('overflow:hidden'));
      expect(resting).not.toMatch(/outline:(?!none)/);
      expect(resting).not.toContain('border-radius:');
      for (const emphasis of [{ isSelected: true }, { isHovered: true }, { isFocused: true }]) {
        expect(markup({ state, ...emphasis })).toContain('calc(1px * 1.75) solid var(--color-accent)');
      }
    }
  });

  it('counter-scales ring width and inset exactly like an ordinary frame at every zoom', () => {
    for (const zoom of [0.25, 0.5, 1, 2, 4]) {
      const html = markup({ zoom });
      expect(html).toContain(`calc(0.5px * ${1 / zoom}) solid transparent`);
      expect(html).toContain(`inset:calc(-1 * calc(0.5px * ${1 / zoom}))`);
    }
  });

  it('scopes the node furniture to the artifact accent, not only its guest surface', () => {
    const html = renderToStaticMarkup(
      <ReactFlowProvider>
        <ArtifactNode
          id="artifact" type="artifact" data={{ artifactId: A, title: TITLE, name: '' }}
          selected={true} dragging={false} zIndex={1} isConnectable={false}
          positionAbsoluteX={0} positionAbsoluteY={0} draggable={false}
          selectable={true} deletable={true} width={320} height={200}
        />
      </ReactFlowProvider>,
    );
    expect(html).toMatch(/<div data-accent="artifact" style="position:relative/);
  });

  it('reserves a plain box while the read is in flight, with no guest and no removal', () => {
    const html = markup();

    expect(html).toContain('data-artifact-state="reading"');
    expect(html).not.toContain('<webview');
    // The whole point of three states: a project open must not offer to remove every node.
    expect(html).not.toContain('canvas-artifact-remove-node');
    expect(html).not.toContain('canvas-artifact-missing');
  });

  it('mounts the guest in the artifacts partition once resolved', () => {
    const html = markup({ state: 'resolved', url: `studio-artifact://${A}/pages/index.html` });

    expect(html).toContain('data-artifact-state="resolved"');
    expect(html).toContain('<webview');
    expect(html).toContain('partition="persist:studio-artifacts"');
    expect(html).toContain(`studio-artifact://${A}/pages/index.html`);
  });

  it('shows a handed-down cover only where there is a guest to cover', () => {
    const url = `studio-artifact://${A}/pages/index.html`;

    expect(markup({ state: 'resolved', url, cover: PICTURE })).toContain('data-testid="artifact-cover"');
    expect(markup({ state: 'reading', cover: PICTURE })).not.toContain(PICTURE);
    expect(markup({ state: 'missing', cover: PICTURE })).not.toContain(PICTURE);
  });

  it('says the artifact is gone and offers to remove the node, never the artifact', () => {
    const html = markup({ state: 'missing', onRemoveNode: () => undefined });

    expect(html).toContain('data-artifact-state="missing"');
    expect(html).toContain('canvas-artifact-missing');
    expect(html).toContain(TITLE);
    expect(html).toContain('canvas-artifact-remove-node');
    // The copy names the canvas, so it cannot be read as deleting the artifact.
    expect(html).toContain('Remove from canvas');
    expect(html).not.toContain('<webview');
  });

  it('offers no removal from missing when the canvas hands it no handler', () => {
    const html = markup({ state: 'missing' });

    expect(html).toContain('canvas-artifact-missing');
    expect(html).not.toContain('canvas-artifact-remove-node');
  });

  it('wears the artifact accent in every state, so the treatment follows its identity', () => {
    for (const state of ['reading', 'resolved', 'missing'] as const) {
      expect(markup({ state })).toContain('data-accent="artifact"');
    }
  });

  it('keeps its title like a frame keeps its URL bar: at working zoom, and when selected or focused far out', () => {
    expect(markup()).toContain('canvas-artifact-label');
    const farOut = { zoom: 0.1 };
    expect(markup(farOut)).not.toContain('canvas-artifact-label');
    expect(markup({ ...farOut, isSelected: true })).toContain('canvas-artifact-label');
    expect(markup({ ...farOut, isFocused: true })).toContain('canvas-artifact-label');
    expect(markup({ ...farOut, isHovered: true })).toContain('canvas-artifact-label');
  });

  it('puts a shield in front of the guest, which is the only host surface over it', () => {
    // A `<webview>` is native: without this the canvas gets no pointermove or pointerup over
    // the artifact, and a gesture crossing it sticks (ONL-1863).
    const url = `studio-artifact://${A}/pages/index.html`;

    expect(markup({ state: 'resolved', url, isShielded: true })).toContain(
      'canvas-artifact-shield',
    );
    expect(markup({ state: 'resolved', url })).not.toContain('canvas-artifact-shield');
  });

  it('shields nothing while there is no guest to shield', () => {
    expect(markup({ state: 'reading', isShielded: true })).not.toContain('canvas-artifact-shield');
    expect(markup({ state: 'missing', isShielded: true })).not.toContain('canvas-artifact-shield');
  });

  it('draws two artifacts that share a title identically, each from its own id', () => {
    // The id is what tells them apart; the title is free text and may repeat.
    const one = artifactReadState(A, { id: A, summary: summary({ title: 'Pricing' }) });
    const two = artifactReadState(B, { id: B, summary: summary({ id: B, title: 'Pricing' }) });

    expect(one.url).toBe(`studio-artifact://${A}/pages/index.html`);
    expect(two.url).toBe(`studio-artifact://${B}/pages/index.html`);
    expect(one.url).not.toBe(two.url);
  });
});

describe('the picture a node brings to a page it is reopening', () => {
  const records = new Map<string, ArtifactSummary | null>();
  const pictures = new Map<string, string>();
  /** What main kept, in memory or on disk: a relaunch starts with these and no remembered pictures at all. */
  const kept = new Map<string, string>();
  const previewCalls: ArtifactPreviewRequest[] = [];
  const heldCalls: ArtifactPreviewRequest[] = [];
  const paints = new Map<number, () => void>();
  const pictureKey = (request: ArtifactPreviewRequest): string => `${request.artifactId}|${request.pagePath}|${request.updatedAt}`;
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
  const flushPaints = (): void => {
    const jobs = [...paints.values()];
    paints.clear();
    for (const job of jobs) job();
  };
  let root: Root | undefined;
  let container: HTMLElement | undefined;
  let restore: (() => void)[] = [];

  function rig(): void {
    const bridge = window.studio;
    window.studio = {
      artifactRead: async ({ artifactId }: { artifactId: string }) => records.get(artifactId) ?? null,
      artifactPreview: async (request: ArtifactPreviewRequest): Promise<ArtifactPreviewResult> => {
        previewCalls.push(request);
        const image = pictures.get(pictureKey(request));
        return image === undefined ? { outcome: 'missing' } : { outcome: 'ready', image };
      },
      artifactPreviewHeld: async (request: ArtifactPreviewRequest): Promise<ArtifactPreviewResult> => {
        heldCalls.push(request);
        const image = kept.get(pictureKey(request));
        return image === undefined ? { outcome: 'missing' } : { outcome: 'ready', image };
      },
      artifactSnapshot: async () => null,
      telemetryEvent: () => {},
    } as unknown as StudioBridge;
    // happy-dom decodes nothing, so the demand layer's own `await image.decode()` never answers.
    const ownImage = (globalThis as { Image?: unknown }).Image;
    (globalThis as { Image?: unknown }).Image = class { src = ''; decode(): Promise<void> { return Promise.resolve(); } };
    let sequence = 0;
    const globals = {
      requestAnimationFrame: (callback: () => void) => { const id = ++sequence; paints.set(id, callback); return id; },
      cancelAnimationFrame: (id: number) => { paints.delete(id); },
      requestIdleCallback: () => ++sequence,
      cancelIdleCallback: () => {},
      IntersectionObserver: class { observe(): void {} disconnect(): void {} },
    };
    const descriptors = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => {
      window.studio = bridge;
      (globalThis as { Image?: unknown }).Image = ownImage;
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    });
  }

  async function remember(request: ArtifactPreviewRequest, image: string): Promise<void> {
    pictures.set(pictureKey(request), image);
    const stop = artifactPreviewDemand.watch(request, () => {});
    await tick();
    stop();
  }

  function node(artifactId: string): ReactNode {
    return (
      <ReactFlowProvider>
        <ArtifactNode
          id="artifact" type="artifact" data={{ artifactId, title: TITLE, name: '' }}
          selected={false} dragging={false} zIndex={1} isConnectable={false}
          positionAbsoluteX={0} positionAbsoluteY={0} draggable={false}
          selectable={true} deletable={true} width={480} height={640}
        />
      </ReactFlowProvider>
    );
  }

  async function mount(artifactId: string): Promise<HTMLElement> {
    const host = document.createElement('div');
    document.body.appendChild(host);
    container = host;
    await act(async () => {
      root = createRoot(host);
      root.render(node(artifactId));
    });
    return host;
  }

  const covered = (host: HTMLElement): string | null => host.querySelector('[data-testid="artifact-cover"]')?.getAttribute('src') ?? null;
  const fail = (errorCode: number, isMainFrame = true): Event => Object.assign(new Event('did-fail-load'), { errorCode, isMainFrame });

  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    root = undefined;
    container?.remove();
    container = undefined;
    for (const undo of restore.reverse()) undo();
    restore = [];
    records.clear();
    pictures.clear();
    kept.clear();
    previewCalls.length = 0;
    heldCalls.length = 0;
    paints.clear();
    for (const id of [A, B, C, D]) forgetArtifact(id);
    artifactPreviewDemand.forget(A);
    artifactPreviewDemand.forget(B);
    artifactPreviewDemand.forget(C);
    artifactPreviewDemand.forget(D);
    expect(takeComplaints()).toEqual([]);
  });

  it('paints the artifact’s last rendered picture on its first frame, before any guest loads', async () => {
    rig();
    records.set(A, summary());
    await remember({ artifactId: A, pagePath: 'pages/index.html', updatedAt: '2026-01-01T00:00:00.000Z' }, PICTURE);
    await resolveArtifact(A);

    const html = renderToStaticMarkup(node(A));
    expect(html).toContain('data-artifact-state="resolved"');
    expect(html).toContain('data-testid="artifact-cover"');
    expect(html).toContain(PICTURE);
  });

  it('paints no picture for a record that is gone, however well remembered the page is', async () => {
    rig();
    records.set(B, null);
    await remember({ artifactId: B, pagePath: 'pages/index.html', updatedAt: '2026-01-01T00:00:00.000Z' }, PICTURE);
    await resolveArtifact(B);

    const html = renderToStaticMarkup(node(B));
    expect(html).toContain('data-artifact-state="missing"');
    expect(html).not.toContain(PICTURE);
  });

  it('refuses a picture older than the artifact’s last edit until the new one lands', async () => {
    rig();
    records.set(C, summary({ id: C, updatedAt: 'edit-2' }));
    await remember({ artifactId: C, pagePath: 'pages/index.html', updatedAt: 'edit-1' }, STALE);
    await resolveArtifact(C);
    expect(renderToStaticMarkup(node(C))).not.toContain(STALE);

    await remember({ artifactId: C, pagePath: 'pages/index.html', updatedAt: 'edit-2' }, PICTURE);
    const html = renderToStaticMarkup(node(C));
    expect(html).toContain(PICTURE);
    expect(html).not.toContain(STALE);
  });

  it('covers a page it was never shown this run from the picture main kept, and renders nothing to get it', async () => {
    rig();
    const asked = { artifactId: D, pagePath: 'pages/index.html', updatedAt: 'd-cold' };
    records.set(D, summary({ id: D, updatedAt: 'd-cold' }));
    kept.set(pictureKey(asked), PICTURE);
    await resolveArtifact(D);
    // A genuine relaunch: nothing the renderer remembers, and no hover to have warmed it.
    expect(artifactPreviewDemand.poster(asked)).toBeUndefined();

    const host = await mount(D);
    await act(async () => { await tick(); });

    expect(covered(host)).toBe(PICTURE);
    expect(heldCalls).toEqual([asked]);
    expect(previewCalls).toEqual([]);
  });

  it('starts no render for a page main kept no picture for', async () => {
    rig();
    records.set(D, summary({ id: D, updatedAt: 'd-unkept' }));
    await resolveArtifact(D);

    const host = await mount(D);
    await act(async () => { await tick(); });

    expect(covered(host)).toBeNull();
    expect(heldCalls.map((request) => request.updatedAt)).toEqual(['d-unkept']);
    expect(previewCalls).toEqual([]);
  });

  it('takes a cover from a read that lands after it mounted, with nothing else to repaint it', async () => {
    rig();
    const asked = { artifactId: D, pagePath: 'pages/index.html', updatedAt: 'd-late' };
    records.set(D, summary({ id: D, updatedAt: 'd-late' }));
    await resolveArtifact(D);

    const host = await mount(D);
    await act(async () => { await tick(); });
    expect(covered(host)).toBeNull();

    // The rail warm's read, starting only once the node is already on screen.
    await act(async () => { await remember(asked, PICTURE); });

    expect(covered(host)).toBe(PICTURE);
  });

  it('swaps its cover for the edited page’s own, never the picture the edit retired', async () => {
    rig();
    const first = { artifactId: D, pagePath: 'pages/index.html', updatedAt: 'd-before' };
    records.set(D, summary({ id: D, updatedAt: 'd-before' }));
    kept.set(pictureKey(first), STALE);
    await resolveArtifact(D);

    const host = await mount(D);
    await act(async () => { await tick(); });
    expect(covered(host)).toBe(STALE);

    records.set(D, summary({ id: D, updatedAt: 'd-after' }));
    kept.set(pictureKey({ ...first, updatedAt: 'd-after' }), PICTURE);
    await act(async () => { forgetArtifact(D, 'content'); });
    await act(async () => { await tick(); });
    await act(async () => { await tick(); });

    expect(covered(host)).toBe(PICTURE);
    expect(previewCalls).toEqual([]);
  });

  it('asks for the next visit’s picture only once its own page has painted', async () => {
    rig();
    records.set(D, summary({ id: D, updatedAt: 'd-1' }));
    await resolveArtifact(D);
    previewCalls.length = 0;

    const host = await mount(D);
    // A cold `watch()` renders the page offscreen in main, so mounting must not issue one.
    expect(covered(host)).toBeNull();
    expect(previewCalls).toEqual([]);

    const guest = host.querySelector('webview')!;
    await act(async () => { guest.dispatchEvent(new Event('did-finish-load')); });
    await act(async () => { flushPaints(); });
    await act(async () => { flushPaints(); });
    expect(previewCalls).toEqual([{ artifactId: D, pagePath: 'pages/index.html', updatedAt: 'd-1' }]);
  });

  it('asks again only once the edited page has painted, never off the paint the edit retired', async () => {
    rig();
    records.set(D, summary({ id: D, updatedAt: 'd-1' }));
    await resolveArtifact(D);
    previewCalls.length = 0;

    const host = await mount(D);
    const guest = host.querySelector('webview')!;
    await act(async () => { guest.dispatchEvent(new Event('did-finish-load')); });
    await act(async () => { flushPaints(); });
    await act(async () => { flushPaints(); });
    expect(previewCalls.map((request) => request.updatedAt)).toEqual(['d-1']);

    records.set(D, summary({ id: D, updatedAt: 'd-2' }));
    await act(async () => { forgetArtifact(D, 'content'); });
    await act(async () => { await tick(); });
    expect(previewCalls.map((request) => request.updatedAt)).toEqual(['d-1']);

    const edited = host.querySelector('webview')!;
    await act(async () => { edited.dispatchEvent(new Event('did-finish-load')); });
    await act(async () => { flushPaints(); });
    await act(async () => { flushPaints(); });
    expect(previewCalls.map((request) => request.updatedAt)).toEqual(['d-1', 'd-2']);
  });

  it('retires both covers once its own page paints, the session snapshot on top until then', async () => {
    rig();
    records.set(A, summary());
    await remember({ artifactId: A, pagePath: 'pages/index.html', updatedAt: '2026-01-01T00:00:00.000Z' }, PICTURE);
    await resolveArtifact(A);
    await artifactSnapshots.capture(`artifact:studio-artifact://${A}/pages/index.html:2026-01-01T00:00:00.000Z`, () => true, async () => ({ image: 'data:image/png;base64,own-box', width: 480, height: 640 }));

    const host = await mount(A);
    expect(covered(host)).toBe(PICTURE);
    expect(host.querySelector('[data-testid="artifact-snapshot"]')).not.toBeNull();

    const guest = host.querySelector('webview')!;
    await act(async () => { guest.dispatchEvent(new Event('did-finish-load')); });
    await act(async () => { flushPaints(); });
    await act(async () => { flushPaints(); });
    expect(covered(host)).toBeNull();
    expect(host.querySelector('[data-testid="artifact-snapshot"]')).toBeNull();
  });

  it('drops the picture when the page itself stops loading, and keeps it through an aborted load or a subframe’s', async () => {
    rig();
    records.set(A, summary());
    await remember({ artifactId: A, pagePath: 'pages/index.html', updatedAt: '2026-01-01T00:00:00.000Z' }, PICTURE);
    await resolveArtifact(A);

    const host = await mount(A);
    const guest = host.querySelector('webview')!;
    await act(async () => { guest.dispatchEvent(fail(-3)); });
    expect(covered(host)).toBe(PICTURE);

    await act(async () => { guest.dispatchEvent(fail(-105, false)); });
    expect(covered(host)).toBe(PICTURE);

    await act(async () => { guest.dispatchEvent(fail(-105)); });
    expect(covered(host)).toBeNull();
    // Still the resolved node behind a failed guest: there is no fourth read state.
    expect(host.querySelector('[data-artifact-state]')?.getAttribute('data-artifact-state')).toBe('resolved');
  });

  it('retires only the cover on a failed load, leaving the node’s own last paint standing', async () => {
    rig();
    records.set(A, summary());
    await remember({ artifactId: A, pagePath: 'pages/index.html', updatedAt: '2026-01-01T00:00:00.000Z' }, PICTURE);
    await resolveArtifact(A);
    await artifactSnapshots.capture(`artifact:studio-artifact://${A}/pages/index.html:2026-01-01T00:00:00.000Z`, () => true, async () => ({ image: 'data:image/png;base64,own-box', width: 480, height: 640 }));

    const host = await mount(A);
    await act(async () => { host.querySelector('webview')!.dispatchEvent(fail(-105)); });

    expect(covered(host)).toBeNull();
    // The session snapshot is the node's own last paint of this very page, not a picture this
    // change introduced, and a failed reload leaves it exactly where it stood before (ONL-2791).
    expect(host.querySelector('[data-testid="artifact-snapshot"]')).not.toBeNull();
  });
});
