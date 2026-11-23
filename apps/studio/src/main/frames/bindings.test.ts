import { expect, it } from 'bun:test';
import { normalizeDevUrl, type ArtifactNode, type BrowserNode, type CanvasDoc, type CanvasNode } from '@studio/events';
import { createFrameBindings } from './bindings.js';
import { createFrameAttachHandler } from '../canvas/frame-attach.js';
import { createImageTargetResolver } from '../canvas/image-target.js';

const artifactId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const browserUrl = 'https://example.test/design';
const artifactUrl = (pagePath: string): string => `studio-artifact://${artifactId}/${pagePath}`;

function browser(id = 'frame-a'): BrowserNode {
  return { id, pageId: 'page', name: 'Design', kind: 'browser', x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl: browserUrl } };
}

const docHolding = (held: BrowserNode): CanvasDoc =>
  ({ schemaVersion: 1, docId: 'doc', revision: 1, pages: {}, nodes: { [held.id]: held } });

function artifact(id: string, pagePath: string): ArtifactNode {
  return { ...browser(id), kind: 'artifact', content: { artifactId, title: 'Artifact', pagePath } };
}

function nativeGuest(owner: Electron.WebContents, id: number, session: Electron.Session, initialUrl = 'about:blank') {
  let destroyed = false;
  let url = initialUrl;
  return {
    id,
    hostWebContents: owner,
    session,
    getType: () => 'webview' as const,
    isDestroyed: () => destroyed,
    getURL: () => url,
    destroy: () => { destroyed = true; },
    navigate: (nextUrl: string) => { url = nextUrl; },
  };
}

function fixture() {
  let time = 0;
  let nextId = 10;
  const owner = { id: 7 } as Electron.WebContents;
  const session = {} as Electron.Session;
  const bindings = createFrameBindings(() => time);
  const issue = (node: CanvasNode, url = browserUrl): string => {
    const lease = bindings.issue(owner, 'doc', node, url);
    expect(lease).toStartWith('about:blank#studio-frame-attach=');
    if (lease === undefined) throw new Error('lease unavailable');
    return lease;
  };
  const prepare = (lease: string) => {
    const preferences: Electron.WebPreferences = {};
    const params: Record<string, string> = { src: lease };
    expect(bindings.prepare(owner, preferences, params)).toBe(true);
    return { preferences, params };
  };
  const born = (url = 'about:blank') => {
    const guest = nativeGuest(owner, nextId++, session, url);
    bindings.created(guest);
    return guest;
  };
  const finish = (guest: ReturnType<typeof born>, birthUrl: string, url = browserUrl) => {
    expect(bindings.navigating(guest, birthUrl)).toBeUndefined();
    expect(bindings.attached(owner, guest)).toBeUndefined();
    expect(bindings.loaded(guest, birthUrl)).toBe(url);
    expect(bindings.activate(guest, url)).toBe(true);
    bindings.navigating(guest, url);
    guest.navigate(url);
    bindings.navigated(guest, url);
  };
  const bind = (node: CanvasNode, url = browserUrl) => {
    const prepared = prepare(issue(node, url));
    const guest = born(prepared.params['src']);
    finish(guest, prepared.params['src']!, url);
    return guest;
  };
  const pending = (node: CanvasNode, url = browserUrl) => {
    const birthUrl = prepare(issue(node, url)).params['src']!;
    const guest = born(birthUrl);
    bindings.navigating(guest, birthUrl);
    expect(bindings.attached(owner, guest)).toBeUndefined();
    expect(bindings.loaded(guest, birthUrl)).toBe(url);
    return guest;
  };
  return { owner, session, bindings, issue, prepare, born, finish, bind, pending, advance: (milliseconds: number) => { time += milliseconds; } };
}

for (const creationOrder of ['created-first', 'prepared-first'] as const) {
  for (const order of [['navigating', 'attached', 'loaded'], ['attached', 'navigating', 'loaded'], ['navigating', 'loaded', 'attached']] as const) {
    it(`exports a port-only frame after canonical commit: ${creationOrder}, ${order.join(', ')}`, async () => {
      const test = fixture();
      const url = normalizeDevUrl('3000');
      expect(url).toBe('http://localhost:3000/');
      if (!url) throw new Error('Port input did not normalize');
      const node: BrowserNode = { ...browser(), content: { homeUrl: url! } };
      const snapshot = async () => ({ doc: { schemaVersion: 1 as const, docId: 'doc', revision: 1, pages: {}, nodes: { [node.id]: node } } });
      const handler = createFrameAttachHandler({
        admitted: () => true,
        workspace: () => '/project',
        snapshot,
        artifactUrl: async () => undefined,
        issue: (owner, docId, current, destination) => test.bindings.issue(owner, docId, current, destination),
      });
      const lease = await handler({ sender: test.owner }, { nodeId: node.id });
      expect(lease).not.toBeNull();
      const earlyGuest = creationOrder === 'created-first' ? test.born() : undefined;
      const prepared = test.prepare(lease!.url);
      const birthUrl = prepared.params['src']!;
      const guest = earlyGuest ?? test.born(birthUrl);
      expect(test.bindings.preparedDestination(test.owner, prepared.params)).toBe(url);
      expect(test.bindings.preparedDestination(test.owner, { ...prepared.params })).toBeUndefined();
      const captured: number[] = [];
      const exportedGuestReady = createImageTargetResolver({
        admitted: () => true,
        workspace: () => '/project',
        snapshot,
        boundGuest: (owner, docId, current, pageUrl) => test.bindings.guest(owner, docId, current, pageUrl) as typeof guest | undefined,
        session: () => test.session,
        artifact: async () => undefined,
        revision: () => 0,
        navigation: () => () => {},
        capture: async current => { captured.push(current.id); return new Uint8Array([1]); },
      });
      for (const [index, event] of order.entries()) {
        const result = event === 'attached' ? test.bindings.attached(test.owner, guest)
          : event === 'loaded' ? test.bindings.loaded(guest, birthUrl)
            : test.bindings.navigating(guest, birthUrl);
        expect(result).toBe(index === order.length - 1 ? url : undefined);
        expect(await exportedGuestReady({ sender: test.owner }, node.id)).toBeUndefined();
      }
      expect(test.bindings.destination(guest)).toBe(url);
      expect(test.bindings.activate(guest, url!)).toBe(true);
      expect(await exportedGuestReady({ sender: test.owner }, node.id)).toBeUndefined();
      test.bindings.navigating(guest, url!);
      expect(await exportedGuestReady({ sender: test.owner }, node.id)).toBeUndefined();
      guest.navigate(url!);
      test.bindings.navigated(guest, guest.getURL());
      expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
      expect(test.bindings.guest({ id: test.owner.id }, 'doc', node)).toBeUndefined();
      expect(test.bindings.guest(test.owner, 'doc', { ...node, content: { homeUrl: 'http://localhost:3000' } })).toBeUndefined();
      const target = await exportedGuestReady({ sender: test.owner }, node.id);
      expect(target).toBeDefined();
      expect(await target!.current()).toBe(true);
      await target!.capture('png');
      expect(captured).toEqual([guest.id]);
      target!.dispose?.();
    });
  }
}

for (const [legacyUrl, canonicalUrl] of [
  ['http://localhost:3000', 'http://localhost:3000/'],
  ['HTTP://LOCALHOST:80', 'http://localhost/'],
  ['HTTPS://EXAMPLE.TEST:443', 'https://example.test/'],
  [artifactUrl('pages/../pages/index.html'), artifactUrl('pages/index.html')],
] as const) {
  it(`canonicalizes registry issuance without changing node identity: ${legacyUrl}`, () => {
    const test = fixture();
    const node = legacyUrl.startsWith('studio-artifact:') ? artifact('artifact-a', 'pages/../pages/index.html') : { ...browser(), content: { homeUrl: legacyUrl } };
    const identity = JSON.stringify(node);
    const params = { src: test.issue(node, legacyUrl) };
    const policyUrls: string[] = [];
    expect(test.bindings.prepare(test.owner, {}, params, (_preferences, policyParams) => {
      policyUrls.push(policyParams['src']!);
    })).toBe(true);
    expect(policyUrls).toEqual([canonicalUrl]);
    expect(test.bindings.preparedDestination(test.owner, params)).toBe(canonicalUrl);
    const guest = test.born(params.src);
    test.finish(guest, params.src, canonicalUrl);
    expect(JSON.stringify(node)).toBe(identity);
    expect(test.bindings.guest(test.owner, 'doc', node, canonicalUrl)).toBe(guest);
  });
}

it('refuses malformed URLs and unsupported destination protocols before issuing a lease', () => {
  const test = fixture();
  for (const url of ['', 'not a URL', '/relative', 'http://', 'https://[invalid', 'http://localhost:65536', 'about:blank', 'file:///tmp/frame.html', 'ftp://localhost/frame', 'javascript:alert(1)', 'data:text/html,frame']) {
    expect(test.bindings.issue(test.owner, 'doc', browser(), url), url).toBeUndefined();
  }
});

for (const stage of ['start', 'commit'] as const) {
  for (const redirectedUrl of ['http://localhost:3000/redirect', 'http://localhost:3000/?query=1', 'http://localhost:3000/#fragment', 'http://localhost:3001/', 'http://other.test:3000/', 'http://localhost:3000']) {
    it(`refuses a nonexact initial ${stage} after canonical issuance: ${redirectedUrl}`, () => {
      const test = fixture();
      const node = { ...browser(), content: { homeUrl: 'http://localhost:3000' } };
      const canonicalUrl = 'http://localhost:3000/';
      const prepared = test.prepare(test.issue(node, node.content.homeUrl));
      const birthUrl = prepared.params['src']!;
      const guest = test.born(birthUrl);
      test.bindings.navigating(guest, birthUrl);
      test.bindings.attached(test.owner, guest);
      expect(test.bindings.loaded(guest, birthUrl)).toBe(canonicalUrl);
      expect(test.bindings.activate(guest, node.content.homeUrl)).toBe(false);
      expect(test.bindings.activate(guest, canonicalUrl)).toBe(true);
      test.bindings.navigating(guest, stage === 'start' ? redirectedUrl : canonicalUrl);
      test.bindings.navigated(guest, redirectedUrl);
      expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
      expect(test.bindings.destination(guest)).toBeUndefined();
      test.bindings.navigating(guest, canonicalUrl);
      test.bindings.navigated(guest, canonicalUrl);
      expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
      expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBeUndefined();
    });
  }
}

it('refreshes each browser from its own native navigation history and ignores retired guests', async () => {
  const test = fixture();
  let firstNode = browser('frame-a');
  const secondNode = browser('frame-b');
  const first = test.bind(firstNode);
  const second = test.bind(secondNode);
  const doc = (node: BrowserNode) => ({ schemaVersion: 1 as const, docId: 'doc', revision: 1, pages: {}, nodes: { [node.id]: node, [secondNode.id]: secondNode } });
  const editedHome = { ...firstNode, content: { homeUrl: 'https://example.test/new-home' } };
  test.bindings.committed(doc(firstNode), doc(editedHome), { type: 'set-home-url', id: firstNode.id, homeUrl: editedHome.content.homeUrl });
  firstNode = editedHome;
  expect(test.bindings.guest(test.owner, 'doc', firstNode)).toBe(first);
  expect(test.bindings.browserUrl(test.owner, 'doc', firstNode)).toBe(browserUrl);
  test.bindings.navigated(first, 'https://example.test/a#details');
  test.bindings.navigated(second, 'https://example.test/b');
  test.bindings.destroyed(first);
  const handler = createFrameAttachHandler({
    admitted: () => true,
    workspace: () => '/project',
    snapshot: async () => ({ doc: { schemaVersion: 1, docId: 'doc', revision: 1, pages: {}, nodes: { [firstNode.id]: firstNode, [secondNode.id]: secondNode } } }),
    artifactUrl: async () => undefined,
    browserUrl: (owner, docId, node) => test.bindings.browserUrl(owner, docId, node),
    issue: (owner, docId, node, url) => test.bindings.issue(owner, docId, node, url),
  });
  const lease = await handler({ sender: test.owner }, { nodeId: firstNode.id });
  expect(lease).not.toBeNull();
  const prepared = test.prepare(lease!.url);
  expect(prepared.params['src']).toStartWith('about:blank#studio-frame-born=');
  const replacement = test.born(prepared.params['src']);
  test.finish(replacement, prepared.params['src']!, 'https://example.test/a#details');
  test.bindings.navigated(first, 'https://example.test/retired');
  expect(test.bindings.browserUrl(test.owner, 'doc', firstNode)).toBe('https://example.test/a#details');
  expect(test.bindings.browserUrl(test.owner, 'doc', secondNode)).toBe('https://example.test/b');
  const edited = { ...firstNode, content: { homeUrl: 'https://example.test/other-home' } };
  expect(test.bindings.browserUrl(test.owner, 'doc', edited)).toBeUndefined();
  expect(test.bindings.browserUrl(test.owner, 'other-doc', firstNode)).toBeUndefined();
  test.bindings.forget(test.owner);
  test.bindings.navigated(replacement, 'https://example.test/forgotten');
  expect(test.bindings.browserUrl(test.owner, 'doc', firstNode)).toBeUndefined();
});

it('sends the next mount to the moved port, not to the route it remembers on the old one', async () => {
  const test = fixture();
  const onPort = (port: number, route = '/menu'): string => `http://localhost:${String(port)}${route}`;
  let node: BrowserNode = { ...browser(), content: { homeUrl: onPort(4700) } };
  const guest = test.bind(node, onPort(4700));
  expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBe(onPort(4700));

  const moved: BrowserNode = { ...node, content: { homeUrl: onPort(4701) } };
  test.bindings.committed(docHolding(node), docHolding(moved), { type: 'set-home-url', id: node.id, homeUrl: moved.content.homeUrl });
  node = moved;
  // The live guest keeps its binding; only where a fresh one would land has changed.
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
  expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBeUndefined();

  test.bindings.destroyed(guest);
  const handler = createFrameAttachHandler({
    admitted: () => true,
    workspace: () => '/project',
    snapshot: async () => ({ doc: docHolding(node) }),
    artifactUrl: async () => undefined,
    browserUrl: (owner, docId, held) => test.bindings.browserUrl(owner, docId, held),
    issue: (owner, docId, held, url) => test.bindings.issue(owner, docId, held, url),
  });
  const lease = await handler({ sender: test.owner }, { nodeId: node.id });
  if (!lease) throw new Error('the replacement mount was refused');
  const prepared = test.prepare(lease.url);
  const replacement = test.born(prepared.params['src']);
  test.finish(replacement, prepared.params['src']!, onPort(4701));
  expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBe(onPort(4701));
});

it('keeps the route it remembers when a home move stays on the same origin', () => {
  const test = fixture();
  const node = browser();
  const guest = test.bind(node);
  test.bindings.navigated(guest, 'https://example.test/design/colours');
  const edited: BrowserNode = { ...node, content: { homeUrl: 'https://example.test/other-home' } };
  test.bindings.committed(docHolding(node), docHolding(edited), { type: 'set-home-url', id: node.id, homeUrl: edited.content.homeUrl });
  expect(test.bindings.browserUrl(test.owner, 'doc', edited)).toBe('https://example.test/design/colours');
});

it('never revives a binding after main removes and recreates the same node id', () => {
  const test = fixture();
  const node = browser();
  const guest = test.bind(node);
  const before = { schemaVersion: 1 as const, docId: 'doc', revision: 1, pages: {}, nodes: { [node.id]: node } };
  const after = { ...before, nodes: {} };
  test.bindings.committed(before, after, { type: 'remove', id: node.id });
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  test.bindings.committed(after, before, { type: 'create', node: { ...node, provenance: undefined } });
  test.bindings.navigated(guest, 'https://example.test/retired');
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBeUndefined();
});

it('applies policies to the canonical destination before issuing a separate native birth challenge', () => {
  const test = fixture();
  const node = browser();
  const lease = test.issue(node);
  const preferences: Electron.WebPreferences = { additionalArguments: ['--studio-frame-attach=forged', '--renderer-value'] };
  const params = { src: lease };
  const policyUrls: string[] = [];
  expect(test.bindings.prepare(test.owner, preferences, params, (policyPreferences, policyParams) => {
    expect(policyPreferences).toBe(preferences);
    expect(policyPreferences.additionalArguments).toBeUndefined();
    policyUrls.push(policyParams['src']!);
    policyPreferences.partition = 'persist:studio-frames';
  })).toBe(true);
  expect(policyUrls).toEqual([browserUrl]);
  expect(params.src).toStartWith('about:blank#studio-frame-born=');
  expect(params.src).not.toBe(lease);
  expect(params.src.split('=')[1]).not.toBe(lease.split('=')[1]);
  expect(preferences.additionalArguments).toBeUndefined();
  expect(preferences.partition).toBe('persist:studio-frames');
  expect(test.bindings.preparedDestination(test.owner, params)).toBe(browserUrl);
  expect(test.bindings.preparedDestination(test.owner, { ...params })).toBeUndefined();
  expect(test.bindings.preparedDestination({ id: test.owner.id }, params)).toBeUndefined();
  const guest = test.born(params.src);
  test.finish(guest, params.src);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
});

for (const order of [['navigating', 'attached', 'loaded'], ['attached', 'navigating', 'loaded'], ['navigating', 'loaded', 'attached']] as const) {
  it(`joins native birth events in ${order.join(', ')} order before canonical commit`, () => {
    const test = fixture();
    const node = browser();
    const birthUrl = test.prepare(test.issue(node)).params['src']!;
    const guest = test.born(birthUrl);
    for (const [index, event] of order.entries()) {
      const result = event === 'attached' ? test.bindings.attached(test.owner, guest)
        : event === 'loaded' ? test.bindings.loaded(guest, birthUrl)
          : test.bindings.navigating(guest, birthUrl);
      expect(result).toBe(index === order.length - 1 ? browserUrl : undefined);
      expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
    }
    expect(test.bindings.loaded(guest, birthUrl)).toBeUndefined();
    expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
    expect(test.bindings.activate(guest, browserUrl)).toBe(true);
    test.bindings.navigating(guest, browserUrl);
    guest.navigate(browserUrl);
    test.bindings.navigated(guest, browserUrl);
    expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
  });
}

it('consumes the renderer lease at prepare and the birth challenge on the first native navigation', () => {
  const test = fixture();
  const node = browser();
  const lease = test.issue(node);
  const prepared = test.prepare(lease);
  const replayPreferences: Electron.WebPreferences = { additionalArguments: ['--studio-frame-attach=forged'] };
  expect(test.bindings.prepare(test.owner, replayPreferences, { src: lease })).toBe(false);
  expect(replayPreferences.additionalArguments).toBeUndefined();
  const birthUrl = prepared.params['src']!;
  const first = test.born(birthUrl);
  const replay = test.born(birthUrl);
  expect(test.bindings.navigating(first, birthUrl)).toBeUndefined();
  expect(test.bindings.navigating(replay, birthUrl)).toBeUndefined();
  expect(test.bindings.attached(test.owner, replay)).toBeUndefined();
  expect(test.bindings.loaded(replay, birthUrl)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  expect(test.bindings.attached(test.owner, first)).toBeUndefined();
  expect(test.bindings.loaded(first, birthUrl)).toBe(browserUrl);
  expect(test.bindings.activate(first, browserUrl)).toBe(true);
  test.bindings.navigating(first, browserUrl);
  test.bindings.navigated(first, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(first);
  expect(test.bindings.prepare(test.owner, {}, { src: lease })).toBe(false);
  test.bindings.destroyed(first);
  const laterReplay = test.born(birthUrl);
  test.bindings.navigating(laterReplay, birthUrl);
  test.bindings.attached(test.owner, laterReplay);
  expect(test.bindings.loaded(laterReplay, birthUrl)).toBeUndefined();
  test.bindings.navigated(laterReplay, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
});

it('does not launch until the exact bootstrap challenge finishes loading', () => {
  const test = fixture();
  const node = browser();
  const birthUrl = test.prepare(test.issue(node)).params['src']!;
  const guest = test.born(birthUrl);
  expect(test.bindings.loaded(guest, birthUrl)).toBeUndefined();
  test.bindings.navigating(guest, birthUrl);
  test.bindings.attached(test.owner, guest);
  expect(test.bindings.loaded(guest, browserUrl)).toBeUndefined();
  expect(test.bindings.loaded(guest, 'about:blank#studio-frame-born=other')).toBeUndefined();
  test.bindings.navigated(guest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  expect(test.bindings.loaded(guest, birthUrl)).toBe(browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  expect(test.bindings.activate(guest, browserUrl)).toBe(true);
  test.bindings.navigating(guest, browserUrl);
  test.bindings.navigated(guest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
});

for (const issued of [false, true]) {
  for (const url of [browserUrl, 'https://example.test/unrelated', 'about:blank']) {
    it(`invalidates a commit without an activation start ${issued ? 'after' : 'before'} issuance: ${url}`, () => {
      const test = fixture();
      const node = browser();
      const guest = test.pending(node);
      if (issued) expect(test.bindings.activate(guest, browserUrl)).toBe(true);
      test.bindings.navigated(guest, url);
      expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
      expect(test.bindings.destination(guest)).toBeUndefined();
      expect(test.bindings.activate(guest, browserUrl)).toBe(false);
      test.bindings.navigating(guest, browserUrl);
      test.bindings.navigated(guest, browserUrl);
      expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
      expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBeUndefined();
    });
  }
}

for (const stage of ['pending', 'issued', 'started'] as const) {
  it(`invalidates an unexpected initial navigation while ${stage}`, () => {
    const test = fixture();
    const node = browser();
    const guest = test.pending(node);
    if (stage !== 'pending') expect(test.bindings.activate(guest, browserUrl)).toBe(true);
    if (stage === 'started') test.bindings.navigating(guest, browserUrl);
    test.bindings.navigating(guest, stage === 'pending' ? browserUrl : 'https://example.test/redirect');
    expect(test.bindings.destination(guest)).toBeUndefined();
    expect(test.bindings.activate(guest, browserUrl)).toBe(false);
    test.bindings.navigating(guest, browserUrl);
    test.bindings.navigated(guest, browserUrl);
    expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  });

  it(`invalidates a failed canonical load while ${stage} without permitting resurrection`, () => {
    const test = fixture();
    const node = browser();
    const guest = test.pending(node);
    if (stage !== 'pending') expect(test.bindings.activate(guest, browserUrl)).toBe(true);
    if (stage === 'started') test.bindings.navigating(guest, browserUrl);
    test.bindings.failed(guest);
    expect(test.bindings.destination(guest)).toBeUndefined();
    expect(test.bindings.activate(guest, browserUrl)).toBe(false);
    test.bindings.navigating(guest, browserUrl);
    test.bindings.navigated(guest, browserUrl);
    expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
    const replacement = test.bind(node);
    test.bindings.failed(guest);
    expect(test.bindings.guest(test.owner, 'doc', node)).toBe(replacement);
  });
}

it('accepts one exact activation start and preserves established browser navigation and load failures', () => {
  const test = fixture();
  const node = browser();
  const guest = test.pending(node);
  expect(test.bindings.activate(guest, 'https://example.test/wrong')).toBe(false);
  expect(test.bindings.destination(guest)).toBe(browserUrl);
  expect(test.bindings.activate(guest, browserUrl)).toBe(true);
  expect(test.bindings.activate(guest, browserUrl)).toBe(false);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  test.bindings.navigating(guest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  test.bindings.navigated(guest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
  expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBe(browserUrl);
  expect(test.bindings.destination(guest)).toBeUndefined();
  expect(test.bindings.activate(guest, browserUrl)).toBe(false);
  test.advance(60_000);
  const nextUrl = 'https://example.test/another-page#details';
  test.bindings.navigating(guest, nextUrl);
  test.bindings.navigated(guest, nextUrl);
  test.bindings.failed(guest);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
  expect(test.bindings.browserUrl(test.owner, 'doc', node)).toBe(nextUrl);
});

for (const kind of ['browser', 'artifact'] as const) {
  it(`rejects a different ${kind} initial commit after the exact canonical start`, () => {
    const test = fixture();
    const node = kind === 'artifact' ? artifact('artifact-a', 'pages/index.html') : browser();
    const url = kind === 'artifact' ? artifactUrl('pages/index.html') : browserUrl;
    const otherUrl = kind === 'artifact' ? artifactUrl('pages/detail.html') : 'https://example.test/redirect';
    const guest = test.pending(node, url);
    expect(test.bindings.activate(guest, url)).toBe(true);
    test.bindings.navigating(guest, url);
    test.bindings.navigated(guest, otherUrl);
    expect(test.bindings.guest(test.owner, 'doc', node, url)).toBeUndefined();
    expect(test.bindings.destination(guest)).toBeUndefined();
    expect(test.bindings.activate(guest, url)).toBe(false);
    test.bindings.navigated(guest, url);
    expect(test.bindings.guest(test.owner, 'doc', node, url)).toBeUndefined();
  });
}

it('rejects a repeated canonical start before its first commit', () => {
  const test = fixture();
  const node = browser();
  const guest = test.pending(node);
  expect(test.bindings.activate(guest, browserUrl)).toBe(true);
  test.bindings.navigating(guest, browserUrl);
  test.bindings.navigating(guest, browserUrl);
  test.bindings.navigated(guest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  expect(test.bindings.destination(guest)).toBeUndefined();
});

for (const stage of ['activate', 'start', 'commit'] as const) {
  it(`rechecks pending claim expiry at canonical ${stage}`, () => {
    const test = fixture();
    const node = browser();
    const guest = test.pending(node);
    if (stage !== 'activate') expect(test.bindings.activate(guest, browserUrl)).toBe(true);
    if (stage === 'commit') test.bindings.navigating(guest, browserUrl);
    test.advance(30_000);
    if (stage === 'activate') expect(test.bindings.activate(guest, browserUrl)).toBe(false);
    else if (stage === 'start') test.bindings.navigating(guest, browserUrl);
    test.bindings.navigated(guest, browserUrl);
    expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  });
}

it('rejects guessed challenges and original renderer leases even after preparation', () => {
  const test = fixture();
  const node = browser();
  const lease = test.issue(node);
  const prepared = test.prepare(lease);
  for (const url of ['about:blank#studio-frame-born=guessed', `about:blank#studio-frame-born=${lease.split('=')[1]}`, lease]) {
    const guest = test.born(url);
    expect(test.bindings.navigating(guest, url)).toBeUndefined();
    expect(test.bindings.attached(test.owner, guest)).toBeUndefined();
    expect(test.bindings.loaded(guest, url)).toBeUndefined();
    expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  }
  const guest = test.born(prepared.params['src']);
  test.finish(guest, prepared.params['src']!);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
  expect(test.bindings.prepare(test.owner, {}, { src: 'about:blank#studio-frame-attach=unknown' })).toBe(false);
});

it('strips renderer arguments and applies policies without binding ordinary attachments', () => {
  const test = fixture();
  const node = browser();
  const preferences: Electron.WebPreferences = { additionalArguments: ['--studio-frame-attach=forged'] };
  const policyUrls: string[] = [];
  expect(test.bindings.prepare(test.owner, preferences, { src: browserUrl }, (_preferences, params) => {
    policyUrls.push(params['src']!);
  })).toBe(true);
  expect(policyUrls).toEqual([browserUrl]);
  expect(test.bindings.prepare(test.owner, preferences, { src: browserUrl })).toBe(true);
  expect(preferences.additionalArguments).toBeUndefined();
  const guest = test.born(browserUrl);
  test.bindings.navigating(guest, browserUrl);
  test.bindings.attached(test.owner, guest);
  test.bindings.loaded(guest, browserUrl);
  test.bindings.navigated(guest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
});

it('does not let a previously bound native object acquire a new challenge after destruction', () => {
  const test = fixture();
  const nodeA = browser('frame-a');
  const nodeB = browser('frame-b');
  const oldGuest = test.bind(nodeB);
  test.bindings.destroyed(oldGuest);
  const prepared = test.prepare(test.issue(nodeA));
  test.bindings.created(oldGuest);
  expect(test.bindings.navigating(oldGuest, prepared.params['src']!)).toBeUndefined();
  expect(test.bindings.attached(test.owner, oldGuest)).toBeUndefined();
  expect(test.bindings.loaded(oldGuest, prepared.params['src']!)).toBeUndefined();
  test.bindings.navigated(oldGuest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', nodeA)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', nodeB)).toBeUndefined();
  const freshGuest = test.born(prepared.params['src']);
  test.finish(freshGuest, prepared.params['src']!);
  expect(test.bindings.guest(test.owner, 'doc', nodeA)).toBe(freshGuest);
});

it('seals an ordinary first navigation and never accepts a later birth challenge', () => {
  const test = fixture();
  const node = browser();
  const existing = test.born();
  test.bindings.navigating(existing, browserUrl);
  const prepared = test.prepare(test.issue(node));
  test.bindings.created(existing);
  test.bindings.navigating(existing, prepared.params['src']!);
  test.bindings.attached(test.owner, existing);
  expect(test.bindings.loaded(existing, prepared.params['src']!)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  const uncreated = nativeGuest(test.owner, 99, test.session);
  test.bindings.navigating(uncreated, prepared.params['src']!);
  test.bindings.attached(test.owner, uncreated);
  expect(test.bindings.loaded(uncreated, prepared.params['src']!)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  const genuine = test.born(prepared.params['src']);
  test.finish(genuine, prepared.params['src']!);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(genuine);
});

it('rejects a second navigation before the challenge finishes and cannot replay it on a new guest', () => {
  const test = fixture();
  const node = browser();
  const birthUrl = test.prepare(test.issue(node)).params['src']!;
  const guest = test.born(birthUrl);
  test.bindings.navigating(guest, birthUrl);
  test.bindings.attached(test.owner, guest);
  test.bindings.navigating(guest, birthUrl);
  expect(test.bindings.loaded(guest, birthUrl)).toBeUndefined();
  const replay = test.born(birthUrl);
  test.bindings.navigating(replay, birthUrl);
  test.bindings.attached(test.owner, replay);
  expect(test.bindings.loaded(replay, birthUrl)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
});

for (const committed of [false, true]) {
  it(`fails closed on a second native attachment ${committed ? 'after' : 'before'} canonical commit`, () => {
    const test = fixture();
    const node = browser();
    const birthUrl = test.prepare(test.issue(node)).params['src']!;
    const guest = test.born(birthUrl);
    test.bindings.navigating(guest, birthUrl);
    test.bindings.attached(test.owner, guest);
    expect(test.bindings.loaded(guest, birthUrl)).toBe(browserUrl);
    if (committed) {
      expect(test.bindings.activate(guest, browserUrl)).toBe(true);
      test.bindings.navigating(guest, browserUrl);
      test.bindings.navigated(guest, browserUrl);
    }
    expect(test.bindings.attached(test.owner, guest)).toBeUndefined();
    test.bindings.created(guest);
    test.bindings.navigating(guest, birthUrl);
    test.bindings.attached(test.owner, guest);
    test.bindings.loaded(guest, birthUrl);
    test.bindings.navigated(guest, browserUrl);
    expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  });
}

it('correlates interleaved same-host, same-session, same-URL and same-sized guests by native provenance', () => {
  const test = fixture();
  const nodeA = browser('frame-a');
  const nodeB = browser('frame-b');
  const preparedA = test.prepare(test.issue(nodeA));
  const preparedB = test.prepare(test.issue(nodeB));
  const guestB = test.born(preparedB.params['src']);
  const guestA = test.born(preparedA.params['src']);
  test.bindings.attached(test.owner, guestA);
  test.bindings.navigating(guestB, preparedB.params['src']!);
  test.bindings.navigating(guestA, preparedA.params['src']!);
  expect(test.bindings.loaded(guestB, preparedB.params['src']!)).toBeUndefined();
  expect(test.bindings.attached(test.owner, guestB)).toBe(browserUrl);
  expect(test.bindings.loaded(guestA, preparedA.params['src']!)).toBe(browserUrl);
  expect(test.bindings.activate(guestB, browserUrl)).toBe(true);
  expect(test.bindings.activate(guestA, browserUrl)).toBe(true);
  test.bindings.navigating(guestA, browserUrl);
  test.bindings.navigating(guestB, browserUrl);
  guestA.navigate(browserUrl);
  guestB.navigate(browserUrl);
  test.bindings.navigated(guestB, browserUrl);
  test.bindings.navigated(guestA, browserUrl);
  expect(guestA.hostWebContents).toBe(guestB.hostWebContents);
  expect(guestA.session).toBe(guestB.session);
  expect(guestA.getURL()).toBe(guestB.getURL());
  expect([nodeA.width, nodeA.height]).toEqual([nodeB.width, nodeB.height]);
  expect(test.bindings.guest(test.owner, 'doc', nodeA)).toBe(guestA);
  expect(test.bindings.guest(test.owner, 'doc', nodeB)).toBe(guestB);
});

it('returns no binding for A even when another same-host guest is bound to B', () => {
  const test = fixture();
  const nodeA = browser('frame-a');
  const nodeB = browser('frame-b');
  const guestB = test.bind(nodeB);
  expect(test.bindings.guest(test.owner, 'doc', nodeA)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', nodeB)).toBe(guestB);
});

it('rejects a spoofed host object, wrong attachment host and wrong native owner', () => {
  const test = fixture();
  const node = browser();
  const lease = test.issue(node);
  const spoofedOwner = { id: test.owner.id } as Electron.WebContents;
  expect(test.bindings.prepare(spoofedOwner, {}, { src: lease })).toBe(false);
  const prepared = test.prepare(lease);
  const wrongHostGuest = nativeGuest(spoofedOwner, 20, test.session);
  test.bindings.created(wrongHostGuest);
  test.bindings.navigating(wrongHostGuest, prepared.params['src']!);
  test.bindings.attached(test.owner, wrongHostGuest);
  expect(test.bindings.loaded(wrongHostGuest, prepared.params['src']!)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  const fresh = test.prepare(test.issue(node));
  const guest = test.born(fresh.params['src']);
  test.bindings.navigating(guest, fresh.params['src']!);
  test.bindings.attached(spoofedOwner, guest);
  test.bindings.attached(test.owner, guest);
  expect(test.bindings.loaded(guest, fresh.params['src']!)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  const bound = test.bind(node);
  expect(test.bindings.guest(spoofedOwner, 'doc', node)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(bound);
});

it('requires the same document, node, kind, content and Canvas page identity', () => {
  const test = fixture();
  const node = browser();
  test.bind(node);
  expect(test.bindings.guest(test.owner, 'other-doc', node)).toBeUndefined();
  const mismatches: CanvasNode[] = [
    { ...node, id: 'other-node' },
    { ...node, pageId: 'other-page' },
    { ...node, content: { homeUrl: 'https://other.test/' } },
    artifact(node.id, 'pages/index.html'),
  ];
  for (const mismatch of mismatches) expect(test.bindings.guest(test.owner, 'doc', mismatch)).toBeUndefined();
});

it('keeps different manifest pages of the same Artifact bound to their own native guests', () => {
  const test = fixture();
  const nodeA = artifact('artifact-a', 'pages/index.html');
  const nodeB = artifact('artifact-b', 'pages/detail.html');
  const urlA = artifactUrl(nodeA.content.pagePath!);
  const urlB = artifactUrl(nodeB.content.pagePath!);
  const guestA = test.bind(nodeA, urlA);
  const guestB = test.bind(nodeB, urlB);
  expect(test.bindings.guest(test.owner, 'doc', nodeA, urlA)).toBe(guestA);
  expect(test.bindings.guest(test.owner, 'doc', nodeB, urlB)).toBe(guestB);
  expect(test.bindings.guest(test.owner, 'doc', nodeA)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', nodeA, urlB)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', { ...nodeA, content: { ...nodeA.content, pagePath: nodeB.content.pagePath } }, urlB)).toBeUndefined();
});

it('applies Artifact policies to its canonical page rather than either challenge', () => {
  const test = fixture();
  const node = artifact('artifact-a', 'pages/index.html');
  const url = artifactUrl(node.content.pagePath!);
  const lease = test.issue(node, url);
  const params = { src: lease };
  const preferences: Electron.WebPreferences = {};
  const policyUrls: string[] = [];
  expect(test.bindings.prepare(test.owner, preferences, params, (policyPreferences, policyParams) => {
    policyUrls.push(policyParams['src']!);
    policyPreferences.partition = 'persist:studio-artifacts';
  })).toBe(true);
  expect(policyUrls).toEqual([url]);
  expect(params.src).toStartWith('about:blank#studio-frame-born=');
  expect(preferences.partition).toBe('persist:studio-artifacts');
  const guest = test.born(params.src);
  test.finish(guest, params.src, url);
  expect(test.bindings.guest(test.owner, 'doc', node, url)).toBe(guest);
});

it('keeps identical manifest pages in distinct Artifact nodes bound to separate native guests', () => {
  const test = fixture();
  const nodeA = artifact('artifact-a', 'pages/index.html');
  const nodeB = artifact('artifact-b', 'pages/index.html');
  const url = artifactUrl(nodeA.content.pagePath!);
  const preparedA = test.prepare(test.issue(nodeA, url));
  const preparedB = test.prepare(test.issue(nodeB, url));
  expect(preparedA.params['src']).not.toBe(preparedB.params['src']);
  const guestB = test.born(preparedB.params['src']);
  const guestA = test.born(preparedA.params['src']);
  test.finish(guestA, preparedA.params['src']!, url);
  test.finish(guestB, preparedB.params['src']!, url);
  expect(guestA.getURL()).toBe(guestB.getURL());
  expect(test.bindings.guest(test.owner, 'doc', nodeA, url)).toBe(guestA);
  expect(test.bindings.guest(test.owner, 'doc', nodeB, url)).toBe(guestB);
});

it('retires destroyed guests, including a guest destroyed between creation and attachment', () => {
  const test = fixture();
  const node = browser();
  const guest = test.bind(node);
  guest.destroy();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  test.bindings.destroyed(guest);
  const prepared = test.prepare(test.issue(node));
  const pending = test.born(prepared.params['src']);
  test.bindings.destroyed(pending);
  test.bindings.navigating(pending, prepared.params['src']!);
  test.bindings.attached(test.owner, pending);
  expect(test.bindings.loaded(pending, prepared.params['src']!)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
});

it('expires leases at every native birth stage but not established bindings', () => {
  for (const stage of ['prepare', 'created', 'navigating', 'attached', 'loaded'] as const) {
    const test = fixture();
    const node = browser();
    const lease = test.issue(node);
    if (stage === 'prepare') {
      test.advance(30_000);
      expect(test.bindings.prepare(test.owner, {}, { src: lease })).toBe(false);
    } else {
      const prepared = test.prepare(lease);
      if (stage === 'created') test.advance(30_000);
      const guest = test.born(prepared.params['src']);
      if (stage === 'navigating') test.advance(30_000);
      test.bindings.navigating(guest, prepared.params['src']!);
      if (stage === 'attached') test.advance(30_000);
      expect(test.bindings.attached(test.owner, guest)).toBeUndefined();
      if (stage === 'loaded') test.advance(30_000);
      expect(test.bindings.loaded(guest, prepared.params['src']!)).toBeUndefined();
      test.bindings.navigated(guest, browserUrl);
    }
    expect(test.bindings.guest(test.owner, 'doc', node), stage).toBeUndefined();
  }
  const test = fixture();
  const node = browser();
  const guest = test.bind(node);
  test.advance(60_000);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(guest);
});

it('forgets both issued leases and established bindings for a departed owner', () => {
  const test = fixture();
  const node = browser();
  test.bind(node);
  const pending = test.issue(browser('pending'));
  test.bindings.forget(test.owner);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
  expect(test.bindings.prepare(test.owner, {}, { src: pending })).toBe(false);
});

it('cannot resurrect a forgotten owner through a created guest awaiting did-attach', () => {
  const test = fixture();
  const node = browser();
  const prepared = test.prepare(test.issue(node));
  const guest = test.born(prepared.params['src']);
  test.bindings.navigating(guest, prepared.params['src']!);
  test.bindings.forget(test.owner);
  test.bindings.attached(test.owner, guest);
  expect(test.bindings.loaded(guest, prepared.params['src']!)).toBeUndefined();
  expect(test.bindings.guest(test.owner, 'doc', node)).toBeUndefined();
});

it('does not let a superseded created claim overwrite the replacement native guest', () => {
  const test = fixture();
  const node = browser();
  const oldPrepared = test.prepare(test.issue(node));
  const oldGuest = test.born(oldPrepared.params['src']);
  test.bindings.navigating(oldGuest, oldPrepared.params['src']!);
  const replacement = test.bind(node);
  test.bindings.attached(test.owner, oldGuest);
  expect(test.bindings.loaded(oldGuest, oldPrepared.params['src']!)).toBeUndefined();
  test.bindings.navigated(oldGuest, browserUrl);
  expect(test.bindings.guest(test.owner, 'doc', node)).toBe(replacement);
});

it('rejects superseded leases before preparation and between preparation and native creation', () => {
  for (const stage of ['prepare', 'created'] as const) {
    const test = fixture();
    const node = browser();
    const lease = test.issue(node);
    const prepared = stage === 'created' ? test.prepare(lease) : undefined;
    const replacement = test.bind(node);
    if (prepared === undefined) expect(test.bindings.prepare(test.owner, {}, { src: lease })).toBe(false);
    else {
      const stale = test.born(prepared.params['src']);
      test.bindings.navigating(stale, prepared.params['src']!);
      test.bindings.attached(test.owner, stale);
      expect(test.bindings.loaded(stale, prepared.params['src']!)).toBeUndefined();
      test.bindings.navigated(stale, browserUrl);
    }
    expect(test.bindings.guest(test.owner, 'doc', node), stage).toBe(replacement);
  }
});
