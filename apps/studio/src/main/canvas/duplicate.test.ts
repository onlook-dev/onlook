import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { MAX_CANVAS_OPS_PER_REQUEST, type BrowserNode, type CanvasDoc, type CanvasOpEntry } from '@studio/events';
import { clearWorkspaceImages, readImage, registerImage, resetImagesStore } from '../images/store.js';
import { applyOp, emptyCanvasDoc } from './document.js';
import { cloneCanvasDocument, duplicateFrameRebindOps } from './duplicate.js';
import { placeFirstFrame } from '../workspace/create-project.js';

const previousRoot = process.env['STUDIO_STATE_ROOT'];
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'duplicate-canvas-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  resetImagesStore();
});

afterEach(() => {
  resetImagesStore();
  if (previousRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = previousRoot;
  rmSync(root, { recursive: true, force: true });
});

describe('Make a copy Canvas ownership (ONL-2515)', () => {
  it('drains all 1001 copied homes during first-frame placement and repeated setup is a no-op', async () => {
    let doc = emptyCanvasDoc('large-copy');
    doc.pages.page = { id: 'page', name: 'Page', order: 0 };
    for (let index = 0; index < 1001; index += 1) {
      const id = `frame-${index}`;
      doc.nodes[id] = {
        id, pageId: 'page', kind: 'browser', name: id, x: 0, y: 0, width: 640, height: 480, order: index,
        content: { homeUrl: 'about:blank', pendingHomeUrl: `http://localhost:4317/route/${index}?sort=new#details` },
      };
    }
    const external: BrowserNode = {
      id: 'external', pageId: 'page', kind: 'browser', name: 'Reference',
      x: 0, y: 0, width: 640, height: 480, order: 1001,
      content: { homeUrl: 'https://example.com/reference?q=one#section' },
    };
    doc.nodes.external = external;
    const batches: number[] = [];
    const entries: CanvasOpEntry[] = [];
    const apply: Parameters<typeof placeFirstFrame>[0] = async (resolve) => {
      const ops = resolve(doc);
      if ('reason' in ops) return { ok: false, reason: ops.reason };
      batches.push(ops.length);
      if (ops.length > MAX_CANVAS_OPS_PER_REQUEST) return { ok: false, reason: 'too many operations' };
      const committed: CanvasOpEntry[] = [];
      for (const op of ops) {
        const result = applyOp(doc, op, { author: 'system', at: '2026-10-14T12:00:00.000Z' });
        if (!result.ok) return result;
        doc = result.doc;
        committed.push(result.entry);
        entries.push(result.entry);
      }
      return { ok: true, doc, entries: committed };
    };
    const answer = await placeFirstFrame(apply, 5182);
    expect(answer.kind).toBe('placed');
    expect(batches.filter((size) => size > 0)).toEqual([1000, 1]);
    expect(entries).toHaveLength(1001);
    for (let index = 0; index < 1001; index += 1) {
      const frame = doc.nodes[`frame-${index}`];
      if (frame?.kind !== 'browser') throw new Error('expected rebound browser');
      expect(frame.content).toEqual({ homeUrl: `http://localhost:5182/route/${index}?sort=new#details` });
    }
    expect(doc.nodes.external).toEqual(external);
    expect((await placeFirstFrame(apply, 5182)).kind).toBe('already-shown');
    expect(entries).toHaveLength(1001);
  });

  it('keeps remote, blank, and legacy homes usable while holding only local or already-pending Frames', async () => {
    const source = emptyCanvasDoc('mixed-homes');
    source.pages.page = { id: 'page', name: 'Page', order: 0 };
    const box = { pageId: 'page', name: '', x: 0, y: 0, width: 640, height: 480, order: 0 };
    source.nodes = {
      local: { ...box, id: 'local', kind: 'browser', content: { homeUrl: 'http://localhost:4317/products' } },
      remote: { ...box, id: 'remote', kind: 'browser', content: { homeUrl: 'https://example.com/reference' } },
      blank: { ...box, id: 'blank', kind: 'browser', content: { homeUrl: 'about:blank' } },
      legacy: { ...box, id: 'legacy', kind: 'browser', content: { homeUrl: 'legacy home value' } },
      pending: { ...box, id: 'pending', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/pricing' } },
    };
    const { doc } = await cloneCanvasDocument(source, 'mixed-copy', join(root, 'mixed-copy'), 4317);
    const homes = Object.values(doc.nodes).map((node) => node.content);
    expect(homes).toEqual([
      { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products' },
      { homeUrl: 'https://example.com/reference' },
      { homeUrl: 'about:blank' },
      { homeUrl: 'legacy home value' },
      { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/pricing' },
    ]);
    expect(duplicateFrameRebindOps(doc, 5182)).toHaveLength(2);
  });

  it('rebinds only the source app port and preserves unrelated local Frames, including pending homes', async () => {
    const source = emptyCanvasDoc('multiple-local-ports');
    source.pages.page = { id: 'page', name: 'Page', order: 0 };
    const box = { pageId: 'page', name: '', x: 0, y: 0, width: 640, height: 480, order: 0 };
    source.nodes = {
      app: { ...box, id: 'app', kind: 'browser', content: { homeUrl: 'http://localhost:4317/products?sort=new#details' } },
      storybook: { ...box, id: 'storybook', kind: 'browser', content: { homeUrl: 'http://localhost:6006/?path=/story/button' } },
      pendingApp: { ...box, id: 'pendingApp', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://127.0.0.1:4317/pricing' } },
      pendingStorybook: { ...box, id: 'pendingStorybook', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:6006/?path=/story/input' } },
    };
    const before = structuredClone(source);
    let { doc } = await cloneCanvasDocument(source, 'multiple-local-ports-copy', join(root, 'multiple-local-ports-copy'), 4317);

    expect(source).toEqual(before);
    expect(Object.values(doc.nodes).map((node) => node.content)).toEqual([
      { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' },
      { homeUrl: 'http://localhost:6006/?path=/story/button' },
      { homeUrl: 'about:blank', pendingHomeUrl: 'http://127.0.0.1:4317/pricing' },
      { homeUrl: 'http://localhost:6006/?path=/story/input' },
    ]);
    const ops = duplicateFrameRebindOps(doc, 5182);
    expect(ops).toHaveLength(2);
    for (const op of ops) {
      const result = applyOp(doc, op, { author: 'system', at: '2026-10-14T12:00:00.000Z' });
      if (!result.ok) throw new Error(result.reason);
      doc = result.doc;
    }
    expect(Object.values(doc.nodes).map((node) => node.content)).toEqual([
      { homeUrl: 'http://localhost:5182/products?sort=new#details' },
      { homeUrl: 'http://localhost:6006/?path=/story/button' },
      { homeUrl: 'http://localhost:5182/pricing' },
      { homeUrl: 'http://localhost:6006/?path=/story/input' },
    ]);
    expect(duplicateFrameRebindOps(doc, 5182)).toEqual([]);
  });

  it('preserves local addresses when the source app port is unknown', async () => {
    const source = emptyCanvasDoc('unknown-source-port');
    source.pages.page = { id: 'page', name: 'Page', order: 0 };
    const box = { pageId: 'page', name: '', x: 0, y: 0, width: 640, height: 480, order: 0 };
    source.nodes = {
      app: { ...box, id: 'app', kind: 'browser', content: { homeUrl: 'http://localhost:4317/products' } },
      storybook: { ...box, id: 'storybook', kind: 'browser', content: { homeUrl: 'http://localhost:6006/?path=/story/button' } },
    };

    const { doc } = await cloneCanvasDocument(source, 'unknown-source-port-copy', join(root, 'unknown-source-port-copy'), undefined);

    expect(Object.values(doc.nodes).map((node) => node.content)).toEqual([
      { homeUrl: 'http://localhost:4317/products' },
      { homeUrl: 'http://localhost:6006/?path=/story/button' },
    ]);
    expect(duplicateFrameRebindOps(doc, 5182)).toEqual([]);
  });

  it('keeps parked app provenance through a copy of a copy with no known server port', async () => {
    const source = emptyCanvasDoc('unstarted-copy');
    source.pages.page = { id: 'page', name: 'Page', order: 0 };
    const box = { pageId: 'page', name: '', x: 0, y: 0, width: 640, height: 480, order: 0 };
    source.nodes = {
      app: { ...box, id: 'app', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' } },
      storybook: { ...box, id: 'storybook', kind: 'browser', content: { homeUrl: 'http://localhost:6006/?path=/story/button' } },
    };
    const before = structuredClone(source);
    const { doc: firstCopy } = await cloneCanvasDocument(source, 'first-copy', join(root, 'first-copy'), undefined);
    const firstCopyBefore = structuredClone(firstCopy);
    let { doc } = await cloneCanvasDocument(firstCopy, 'second-copy', join(root, 'second-copy'), undefined);

    expect(source).toEqual(before);
    expect(firstCopy).toEqual(firstCopyBefore);
    expect(Object.values(doc.nodes).map((node) => node.content)).toEqual([
      { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' },
      { homeUrl: 'http://localhost:6006/?path=/story/button' },
    ]);
    const ops = duplicateFrameRebindOps(doc, 5182);
    expect(ops).toHaveLength(1);
    for (const op of ops) {
      const result = applyOp(doc, op, { author: 'system', at: '2026-10-14T12:00:00.000Z' });
      if (!result.ok) throw new Error(result.reason);
      doc = result.doc;
    }
    expect(Object.values(doc.nodes).map((node) => node.content)).toEqual([
      { homeUrl: 'http://localhost:5182/products?sort=new#details' },
      { homeUrl: 'http://localhost:6006/?path=/story/button' },
    ]);
    expect(duplicateFrameRebindOps(doc, 5182)).toEqual([]);
  });

  it('preserves external and legacy malformed homes without throwing during destination binding', () => {
    const doc = emptyCanvasDoc('pending-document');
    const box = { pageId: 'page', name: '', x: 0, y: 0, width: 640, height: 480, order: 0 };
    doc.nodes = {
      local: { ...box, id: 'local', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' } },
      external: { ...box, id: 'external', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'https://example.com/products?q=one#section' } },
      legacy: { ...box, id: 'legacy', kind: 'browser', content: { homeUrl: 'about:blank', pendingHomeUrl: 'legacy home value' } },
    };
    expect(duplicateFrameRebindOps(doc, 5182)).toEqual([
      { type: 'set-home-url', id: 'local', homeUrl: 'http://localhost:5182/products?sort=new#details' },
      { type: 'set-home-url', id: 'external', homeUrl: 'https://example.com/products?q=one#section' },
      { type: 'set-home-url', id: 'legacy', homeUrl: 'legacy home value' },
    ]);
  });

  it('refuses an empty pending home at the existing document create boundary', () => {
    const doc = emptyCanvasDoc('pending-validation');
    doc.pages.page = { id: 'page', name: 'Page', order: 0 };
    const result = applyOp(doc, {
      type: 'create',
      node: { id: 'frame', pageId: 'page', kind: 'browser', name: '', x: 0, y: 0, width: 640, height: 480, order: 0, content: { homeUrl: 'about:blank', pendingHomeUrl: '' } },
    }, { author: 'user', at: '2026-10-14T12:00:00.000Z' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected pending-home refusal');
    expect(result.reason).toContain('pendingHomeUrl');
  });

  it('copies every page and node, keeps routes and artifacts, and owns independent image bytes', async () => {
    const sourceCwd = join(root, 'source');
    const destinationCwd = join(root, 'destination');
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const registered = registerImage(sourceCwd, bytes, { allowSvg: true });
    if (!registered.ok) throw new Error('expected fixture image registration');
    const source: CanvasDoc = emptyCanvasDoc('source-document');
    source.revision = 12;
    source.pages = {
      first: { id: 'first', name: 'Home', order: 0 },
      second: { id: 'second', name: 'Details', order: 1 },
    };
    const box = { name: '', x: 20, y: 30, width: 640, height: 480, order: 0 };
    source.nodes = {
      frame: { ...box, id: 'frame', pageId: 'first', kind: 'browser', content: { homeUrl: 'http://localhost:4317/products?sort=new#details' } },
      text: { ...box, id: 'text', pageId: 'second', kind: 'text', content: { text: 'Notes', size: 'medium' } },
      image: { ...box, id: 'image', pageId: 'second', kind: 'image', content: { imageId: registered.image.id, name: 'Sketch', originalWidth: 640, originalHeight: 480 } },
      artifact: { ...box, id: 'artifact', pageId: 'first', kind: 'artifact', content: { artifactId: 'independent-artifact', title: 'Guide', pagePath: '/guide.html' } },
    };
    const before = structuredClone(source);

    const { doc, pageIds } = await cloneCanvasDocument(source, 'destination-document', destinationCwd, 4317);

    expect(source).toEqual(before);
    expect(doc.docId).toBe('destination-document');
    expect(doc.revision).toBe(0);
    expect(Object.values(doc.pages).map((page) => page.name)).toEqual(['Home', 'Details']);
    expect(pageIds.first).toBeDefined();
    expect(pageIds.second).toBeDefined();
    expect(Object.values(doc.nodes)).toHaveLength(4);
    for (const node of Object.values(doc.nodes)) {
      expect(source.nodes[node.id]).toBeUndefined();
      expect(doc.pages[node.pageId]).toBeDefined();
      expect(node.x).toBe(20);
      expect(node.width).toBe(640);
    }
    const frame = Object.values(doc.nodes).find((node) => node.kind === 'browser');
    if (frame?.kind !== 'browser') throw new Error('expected cloned browser node');
    expect(frame.content).toEqual({ homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:4317/products?sort=new#details' });
    expect(duplicateFrameRebindOps(doc, 5182)).toEqual([
      { type: 'set-home-url', id: frame.id, homeUrl: 'http://localhost:5182/products?sort=new#details' },
    ]);
    const artifact = Object.values(doc.nodes).find((node) => node.kind === 'artifact');
    const originalArtifact = before.nodes.artifact;
    if (artifact?.kind !== 'artifact' || originalArtifact?.kind !== 'artifact') throw new Error('expected original and cloned artifact nodes');
    expect(artifact.content).toEqual(originalArtifact.content);
    const image = Object.values(doc.nodes).find((node) => node.kind === 'image');
    if (image?.kind !== 'image') throw new Error('expected cloned image node');
    expect(image.content.imageId).not.toBe(registered.image.id);
    clearWorkspaceImages(sourceCwd);
    expect(readImage(registered.image.id)).toBeNull();
    expect(readImage(image.content.imageId)?.bytes).toEqual(bytes);
  });
});
