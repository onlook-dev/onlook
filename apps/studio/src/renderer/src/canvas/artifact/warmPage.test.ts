import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';
import type {
  ArtifactPreviewRequest,
  ArtifactSummary,
  CanvasDoc,
  CanvasNode,
} from '@studio/events';
import { createPreviewDemand } from './previewDemand.js';
import { createPageWarmer, PAGE_WARM_LIMIT } from './warmPage.js';

const PAGES: CanvasDoc['pages'] = {
  one: { id: 'one', name: 'One', order: 0 },
  two: { id: 'two', name: 'Two', order: 1 },
  three: { id: 'three', name: 'Three', order: 2 },
};

function artifactNode(name: string, pageId: string, pagePath?: string, order = 0): CanvasNode {
  return {
    id: `node-${name}`,
    pageId,
    name,
    x: 0,
    y: 0,
    width: 480,
    height: 640,
    order,
    kind: 'artifact',
    content: {
      artifactId: `art-${name}`,
      title: name,
      ...(pagePath === undefined ? {} : { pagePath }),
    },
  };
}

function browserNode(name: string, pageId: string): CanvasNode {
  return {
    id: `node-${name}`,
    pageId,
    name,
    x: 0,
    y: 0,
    width: 480,
    height: 640,
    order: 0,
    kind: 'browser',
    content: { homeUrl: 'http://localhost:3000/' },
  };
}

function docWith(nodes: CanvasNode[]): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'project',
    revision: 0,
    pages: PAGES,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function summaryOf(artifactId: string, over: Partial<ArtifactSummary> = {}): ArtifactSummary {
  return {
    id: artifactId,
    title: artifactId,
    pagePath: 'pages/index.html',
    pages: [
      { path: 'pages/index.html', name: 'Home' },
      { path: 'pages/about.html', name: 'About' },
    ],
    updatedAt: `${artifactId}-rev`,
    readOnly: false,
    ...over,
  };
}

/** The real demand layer, so its concurrency of 2 and its listener-less drop are in the test (ONL-2791). */
function harness(records: (artifactId: string) => ArtifactSummary | null = (id) => summaryOf(id)) {
  const asked: ArtifactPreviewRequest[] = [];
  const resolved: string[] = [];
  const demand = createPreviewDemand(async (request) => {
    asked.push(request);
    return { outcome: 'ready', image: 'data:image/png;base64,AAAA' };
  });
  let frames: (() => void)[] = [];
  const warmer = createPageWarmer({
    resolve: async (artifactId) => {
      resolved.push(artifactId);
      return records(artifactId);
    },
    watch: (request, listener) => demand.watch(request, listener),
    schedule: (flush) => {
      frames.push(flush);
    },
  });
  return {
    asked,
    resolved,
    warmer,
    pendingFrames: (): number => frames.length,
    tick: (): void => {
      const due = frames;
      frames = [];
      for (const flush of due) flush();
    },
  };
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 12; turn += 1) {
    await new Promise((done) => setTimeout(done, 0));
  }
}

describe('warming a Page from its rail row (ONL-2791)', () => {
  it('warms only the row a pointer sweep came to rest on, once per frame', async () => {
    const run = harness();
    const doc = docWith([
      artifactNode('a', 'one'),
      artifactNode('b', 'two'),
      artifactNode('c', 'three'),
    ]);
    run.warmer.post({ doc, pageId: 'one' });
    run.warmer.post({ doc, pageId: 'two' });
    run.warmer.post({ doc, pageId: 'three' });
    expect(run.pendingFrames()).toBe(1);
    run.tick();
    await settle();
    expect(run.resolved).toEqual(['art-c']);
    expect(run.asked.map((request) => request.artifactId)).toEqual(['art-c']);
  });

  it('withdraws a passed-over row’s queued reads, so the row rested on takes the next slot', async () => {
    const asked: ArtifactPreviewRequest[] = [];
    const gates: (() => void)[] = [];
    const demand = createPreviewDemand(async (request) => {
      asked.push(request);
      await new Promise<void>((open) => gates.push(open));
      return { outcome: 'ready', image: 'data:image/png;base64,AAAA' };
    });
    let frames: (() => void)[] = [];
    const warmer = createPageWarmer({
      resolve: async (artifactId) => summaryOf(artifactId),
      watch: (request, listener) => demand.watch(request, listener),
      schedule: (flush) => { frames.push(flush); },
    });
    const tick = (): void => {
      const due = frames;
      frames = [];
      for (const flush of due) flush();
    };
    const doc = docWith([
      artifactNode('a1', 'one', undefined, 0),
      artifactNode('a2', 'one', undefined, 1),
      artifactNode('a3', 'one', undefined, 2),
      artifactNode('b1', 'two', undefined, 0),
    ]);

    warmer.post({ doc, pageId: 'one' });
    tick();
    await settle();
    // The layer starts two at a time, so the third is still waiting its turn.
    expect(asked.map((request) => request.artifactId)).toEqual(['art-a1', 'art-a2']);

    warmer.post({ doc, pageId: 'two' });
    tick();
    await settle();
    expect(asked.map((request) => request.artifactId)).toEqual(['art-a1', 'art-a2']);

    for (const open of gates.splice(0)) open();
    await settle();
    expect(asked.map((request) => request.artifactId)).toEqual(['art-a1', 'art-a2', 'art-b1']);
  });

  it('asks for no record and no picture on a Page carrying no Artifacts', async () => {
    const run = harness();
    const doc = docWith([browserNode('shop', 'one'), artifactNode('a', 'two')]);
    run.warmer.post({ doc, pageId: 'one' });
    run.tick();
    await settle();
    expect(run.resolved).toEqual([]);
    expect(run.asked).toEqual([]);
  });

  it('stops at the cap, taking the first Artifacts in Canvas order', async () => {
    const run = harness();
    const names = Array.from({ length: PAGE_WARM_LIMIT + 3 }, (_, index) => `a${String(index)}`);
    const doc = docWith(names.map((name) => artifactNode(name, 'one')));
    run.warmer.post({ doc, pageId: 'one' });
    run.tick();
    await settle();
    expect(run.asked.map((request) => request.artifactId)).toEqual(
      names.slice(0, PAGE_WARM_LIMIT).map((name) => `art-${name}`),
    );
  });

  it('takes the cap from the node stack, not the document’s record order', async () => {
    const run = harness();
    const doc = docWith([
      artifactNode('late', 'one', undefined, 9),
      artifactNode('early', 'one', undefined, 1),
    ]);
    run.warmer.post({ doc, pageId: 'one' });
    run.tick();
    await settle();
    expect(run.asked.map((request) => request.artifactId)).toEqual(['art-early', 'art-late']);
  });

  it('carries the resolved record’s own updatedAt, and the node’s page path where it names one', async () => {
    const run = harness();
    const doc = docWith([
      artifactNode('a', 'one'),
      artifactNode('b', 'one', 'pages/about.html'),
    ]);
    run.warmer.post({ doc, pageId: 'one' });
    run.tick();
    await settle();
    expect(run.asked).toEqual([
      { artifactId: 'art-a', pagePath: 'pages/index.html', updatedAt: 'art-a-rev' },
      { artifactId: 'art-b', pagePath: 'pages/about.html', updatedAt: 'art-b-rev' },
    ]);
  });

  it('asks for no picture of a record that did not resolve', async () => {
    const run = harness((id) => (id === 'art-gone' ? null : summaryOf(id)));
    const doc = docWith([artifactNode('gone', 'one'), artifactNode('here', 'one')]);
    run.warmer.post({ doc, pageId: 'one' });
    run.tick();
    await settle();
    expect(run.resolved).toEqual(['art-gone', 'art-here']);
    expect(run.asked.map((request) => request.artifactId)).toEqual(['art-here']);
  });

  it('reads every Artifact on the Page, not just the two the demand layer starts at once', async () => {
    const run = harness();
    const names = ['a', 'b', 'c', 'd', 'e'];
    const doc = docWith(names.map((name) => artifactNode(name, 'one')));
    run.warmer.post({ doc, pageId: 'one' });
    run.tick();
    await settle();
    expect(run.asked.map((request) => request.artifactId)).toEqual(
      names.map((name) => `art-${name}`),
    );
  });

  it('reaches the record and the picture and nothing else — no guest, no webview', () => {
    const source = readFileSync(fileURLToPath(new URL('./warmPage.ts', import.meta.url)), 'utf8');
    const imports = new Set([...source.matchAll(/ from '([^']+)'/g)].map((match) => match[1]));
    expect([...imports].sort()).toEqual([
      '../frame/hoverCoalesce.js',
      './artifactCache.js',
      './previewDemand.js',
      '@studio/events',
    ]);
  });
});
