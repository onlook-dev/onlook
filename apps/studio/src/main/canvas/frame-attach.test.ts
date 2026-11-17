import { expect, it } from 'bun:test';
import type { ArtifactNode, BrowserNode, CanvasNode, CanvasSnapshot } from '@studio/events';
import { createFrameAttachHandler } from './frame-attach.js';

const artifactId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

function browser(): BrowserNode {
  return { id: 'frame', pageId: 'page', name: 'Design', kind: 'browser', x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl: 'https://main.test/design' } };
}

function artifact(pagePath?: string): ArtifactNode {
  return { ...browser(), kind: 'artifact', content: { artifactId, title: 'Artifact', ...(pagePath === undefined ? {} : { pagePath }) } };
}

function snapshot(node: CanvasNode | undefined, docId = 'doc'): CanvasSnapshot {
  return { doc: { schemaVersion: 1, docId, revision: 1, pages: {}, nodes: node ? { [node.id]: node } : {} } };
}

function fixture(node: CanvasNode = browser()) {
  const sender = { id: 7 } as Electron.WebContents;
  const issued: { sender: Electron.WebContents; docId: string; node: CanvasNode; url: string }[] = [];
  const reads: string[] = [];
  const artifactReads: ArtifactNode[] = [];
  const state = {
    admitted: true,
    cwd: '/project' as string | undefined,
    snapshot: snapshot(node),
    manifestPages: ['pages/index.html', 'pages/detail.html'],
    artifactReadable: true,
    lease: 'about:blank#studio-frame-attach=main-issued' as string | undefined,
    duringSnapshot: (_read: number): void => {},
    duringArtifact: (): void => {},
  };
  const handler = createFrameAttachHandler({
    admitted: event => event.sender === sender && state.admitted,
    workspace: senderId => senderId === sender.id ? state.cwd : undefined,
    snapshot: async cwd => {
      reads.push(cwd);
      const current = state.snapshot;
      state.duringSnapshot(reads.length);
      return current;
    },
    artifactUrl: async current => {
      artifactReads.push(current);
      const pagePath = current.content.pagePath ?? state.manifestPages[0];
      const url = state.artifactReadable && pagePath !== undefined && state.manifestPages.includes(pagePath) ? `studio-artifact://${current.content.artifactId}/${pagePath}` : undefined;
      state.duringArtifact();
      return url;
    },
    issue: (owner, docId, current, url) => {
      issued.push({ sender: owner, docId, node: current, url });
      return state.lease;
    },
  });
  return { sender, state, handler, issued, reads, artifactReads };
}

it('derives the browser destination only from the main snapshot and returns only the opaque lease', async () => {
  const node = browser();
  const test = fixture(node);
  const request = { nodeId: node.id, url: 'https://forged.test/', homeUrl: 'https://forged.test/', docId: 'forged-doc', webContentsId: 99, width: 1, height: 1 };
  expect(await test.handler({ sender: test.sender }, request)).toEqual({ url: test.state.lease! });
  expect(test.issued).toEqual([{ sender: test.sender, docId: 'doc', node, url: node.content.homeUrl }]);
  expect(test.reads).toEqual(['/project', '/project']);
  expect(test.artifactReads).toEqual([]);
});

it('derives an exact Artifact page URL through the main manifest resolver, including the default page', async () => {
  for (const pagePath of [undefined, 'pages/detail.html']) {
    const node = artifact(pagePath);
    const test = fixture(node);
    const request = { nodeId: node.id, artifactId: 'forged', pagePath: 'pages/secret.html', url: 'https://forged.test/' };
    expect(await test.handler({ sender: test.sender }, request)).toEqual({ url: test.state.lease! });
    expect(test.artifactReads).toEqual([node]);
    expect(test.issued).toEqual([{ sender: test.sender, docId: 'doc', node, url: `studio-artifact://${artifactId}/${pagePath ?? 'pages/index.html'}` }]);
  }
});

it('does not issue a lease for an unresolved Artifact or a page absent from its manifest', async () => {
  for (const missing of ['artifact', 'page', 'default-page'] as const) {
    const test = fixture(artifact(missing === 'page' ? 'pages/secret.html' : undefined));
    if (missing === 'artifact') test.state.artifactReadable = false;
    if (missing === 'default-page') test.state.manifestPages = [];
    expect(await test.handler({ sender: test.sender }, { nodeId: 'frame' }), missing).toBeNull();
    expect(test.issued).toEqual([]);
  }
});

it('denies unadmitted senders and missing workspaces before reading a snapshot', async () => {
  for (const denied of ['admission', 'workspace', 'sender'] as const) {
    const test = fixture();
    if (denied === 'admission') test.state.admitted = false;
    if (denied === 'workspace') test.state.cwd = undefined;
    const sender = denied === 'sender' ? { id: test.sender.id } as Electron.WebContents : test.sender;
    expect(await test.handler({ sender }, { nodeId: 'frame' }), denied).toBeNull();
    expect(test.reads).toEqual([]);
    expect(test.issued).toEqual([]);
  }
});

it('rejects malformed requests, missing documents and nodes, and non-webview node kinds', async () => {
  for (const request of [null, {}, { nodeId: 7 }, { nodeId: 'a'.repeat(129) }]) {
    const test = fixture();
    expect(await test.handler({ sender: test.sender }, request as { nodeId: string })).toBeNull();
    expect(test.reads).toEqual([]);
    expect(test.issued).toEqual([]);
  }
  for (const missing of ['document', 'node', 'kind', 'url'] as const) {
    const test = fixture();
    if (missing === 'document') test.state.snapshot = { doc: null };
    if (missing === 'node') test.state.snapshot = snapshot(undefined);
    if (missing === 'kind') test.state.snapshot = snapshot({ ...browser(), kind: 'section', content: {} });
    if (missing === 'url') test.state.snapshot = snapshot({ ...browser(), content: { homeUrl: '' } });
    expect(await test.handler({ sender: test.sender }, { nodeId: 'frame' }), missing).toBeNull();
    expect(test.issued).toEqual([]);
  }
});

it('denies admission and workspace changes during the first snapshot or Artifact resolution', async () => {
  for (const stage of ['snapshot', 'artifact'] as const) {
    for (const denied of ['admission', 'workspace', 'closed-workspace'] as const) {
      const test = fixture(stage === 'artifact' ? artifact() : browser());
      const change = (): void => {
        if (denied === 'admission') test.state.admitted = false;
        else test.state.cwd = denied === 'workspace' ? '/other-project' : undefined;
      };
      if (stage === 'snapshot') test.state.duringSnapshot = change;
      else test.state.duringArtifact = change;
      expect(await test.handler({ sender: test.sender }, { nodeId: 'frame' }), `${stage}:${denied}`).toBeNull();
      expect(test.issued).toEqual([]);
    }
  }
});

it('denies a changed or removed authoritative document, node, viewport or Artifact page before issuance', async () => {
  for (const changed of ['document', 'node', 'kind', 'content', 'page', 'viewport', 'artifact-page'] as const) {
    const node = changed === 'artifact-page' ? artifact('pages/index.html') : browser();
    const test = fixture(node);
    test.state.duringSnapshot = read => {
      if (read !== 1) return;
      if (changed === 'document') test.state.snapshot = snapshot(node, 'replacement-doc');
      if (changed === 'node') test.state.snapshot = snapshot(undefined);
      if (changed === 'kind') test.state.snapshot = snapshot({ ...browser(), kind: 'section', content: {} });
      if (changed === 'content') test.state.snapshot = snapshot({ ...browser(), content: { homeUrl: 'https://other.test/' } });
      if (changed === 'page') test.state.snapshot = snapshot({ ...node, pageId: 'replacement-page' });
      if (changed === 'viewport') test.state.snapshot = snapshot({ ...node, width: 900 });
      if (changed === 'artifact-page') test.state.snapshot = snapshot(artifact('pages/detail.html'));
    };
    expect(await test.handler({ sender: test.sender }, { nodeId: node.id }), changed).toBeNull();
    expect(test.issued).toEqual([]);
  }
});

it('rechecks admission after the final awaited snapshot', async () => {
  const test = fixture();
  test.state.duringSnapshot = read => { if (read === 2) test.state.admitted = false; };
  expect(await test.handler({ sender: test.sender }, { nodeId: 'frame' })).toBeNull();
  expect(test.issued).toEqual([]);
});

it('rechecks workspace ownership after the final awaited snapshot', async () => {
  for (const cwd of ['/other-project', undefined]) {
    const test = fixture();
    test.state.duringSnapshot = read => { if (read === 2) test.state.cwd = cwd; };
    expect(await test.handler({ sender: test.sender }, { nodeId: 'frame' })).toBeNull();
    expect(test.issued).toEqual([]);
  }
});

it('returns unavailable when the main binding registry refuses issuance', async () => {
  const test = fixture();
  test.state.lease = undefined;
  expect(await test.handler({ sender: test.sender }, { nodeId: 'frame' })).toBeNull();
  expect(test.issued).toHaveLength(1);
});
