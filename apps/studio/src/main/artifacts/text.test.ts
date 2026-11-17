import { expect, it } from 'bun:test';
import { ARTIFACT_TEXT_MAX_LENGTH, artifactPageUrl, artifactRefusal, type ArtifactManifest } from '@studio/events';
import type { ArtifactFileBundle, ArtifactStore } from './adapter.js';
import { createArtifactTextHandlers, type ArtifactTextNode } from './text.js';
import { ARTIFACT_TEXT_WORLD } from './text-guest.js';

const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const path = 'pages/index.html';
const style = {fontFamily: 'Inter', fontSize: '16px', fontWeight: '400', lineHeight: '24px', letterSpacing: 'normal', textAlign: 'left', color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)'};
const selected = {domPath: 'html:nth-of-type(1)>body:nth-of-type(1)>p:nth-of-type(1)', text: 'Hello', rect: {x: 14, y: 24, width: 70, height: 24}, style};

function fixture() {
  const frame = {} as Electron.WebFrameMain;
  const sender = {id: 1, mainFrame: frame, isDestroyed: () => false} as Electron.WebContents;
  const event = {sender, senderFrame: frame as Electron.WebFrameMain | null};
  const session = {} as Electron.Session;
  let scope: string | undefined = 'workspace';
  let admitted = true;
  let bound = true;
  let revision = 0;
  let updatedAt = 'one';
  let readOnly = false;
  let current: ArtifactTextNode | undefined = {docId: 'doc', updatedAt, pagePath: path, node: {id: 'node', kind: 'artifact', pageId: 'page', name: '', x: 0, y: 0, width: 480, height: 640, order: 0, content: {artifactId: id, title: 'Idea', pagePath: path}}};
  let bundle: ArtifactFileBundle = {pages: [{path, name: 'Home'}], files: [{path, bytes: Buffer.from('<p>Hello</p>')}, {path: 'pages/design.css', bytes: Buffer.from('p { color: black }')}]};
  let raw: unknown = selected;
  let valid: unknown = true;
  let executions = 0;
  let disposals = 0;
  let writes = 0;
  let changed = 0;
  let fail = false;
  let readHook = () => {};
  let filesHook = () => {};
  let nodeHook = () => {};
  let executeHook = async () => {};
  const guest = {id: 2, isDestroyed: () => false, hostWebContents: sender, session, getURL: () => artifactPageUrl(id, path), getType: () => 'webview', executeJavaScriptInIsolatedWorld: async (world: number, scripts: {code: string}[]) => {
    expect(world).toBe(ARTIFACT_TEXT_WORLD);
    executions += 1;
    if (scripts[0]!.code.includes('const targets = globalThis.__studioArtifactTextTargets;')) disposals += 1;
    await executeHook();
    return scripts[0]!.code.includes('elementFromPoint') ? raw : valid;
  }} as unknown as Electron.WebContents;
  const store: Pick<ArtifactStore, 'read' | 'readFiles' | 'writeFiles'> = {
    read: async () => {
      readHook();
      const manifest: ArtifactManifest = {schemaVersion: 1, minReaderVersion: 1, id, title: 'Idea', createdAt: 'one', updatedAt, pages: bundle.pages, provenance: {madeIn: 'onlook'}};
      return {outcome: 'resolved', manifest, readOnly};
    },
    readFiles: async () => { filesHook(); return bundle; },
    writeFiles: async (_id, next, expected) => {
      expect(expected).toBe('one');
      if (expected !== updatedAt) return artifactRefusal('stale');
      if (fail) return artifactRefusal('unavailable');
      writes += 1;
      bundle = next;
      revision += 1;
      updatedAt = 'two';
      return {ok: true};
    },
  };
  const handlers = createArtifactTextHandlers({renderers: () => admitted ? [sender] : [], scope: () => scope, node: async () => {nodeHook(); return current;}, guest: () => guest, boundGuest: () => bound ? guest : undefined, session: () => session, revision: () => revision, store, projectNames: () => [], changed: () => {changed += 1;}});
  const request = {nodeId: 'node', guestId: 2, updatedAt: 'one', point: {x: 20, y: 30}};
  const prepare = () => handlers.prepare(event, request);
  const token = async () => {const result = await prepare(); expect(result.outcome).toBe('editable'); if (result.outcome !== 'editable') throw new Error(result.outcome); return result.target.token;};
  return {handlers, event, sender, guest, store, request, prepare, token, bundle: () => bundle, writes: () => writes, executions: () => executions, disposals: () => disposals, changed: () => changed,
    scope: (value: string | undefined) => {scope = value;}, admitted: (value: boolean) => {admitted = value;}, bound: (value: boolean) => {bound = value;},
    node: (value: ArtifactTextNode | undefined) => {current = value;}, current: () => current!, revision: () => {revision += 1;},
    updatedAt: () => {updatedAt = 'two';}, readOnly: () => {readOnly = true;}, raw: (value: unknown) => {raw = value;}, valid: (value: unknown) => {valid = value;},
    source: (value: string) => {bundle = {...bundle, files: bundle.files.map(file => file.path === path ? {...file, bytes: Buffer.from(value)} : file)};},
    fail: (value: boolean) => {fail = value;}, onRead: (hook: () => void) => {readHook = hook;}, onFiles: (hook: () => void) => {filesHook = hook;}, onNode: (hook: () => void) => {nodeHook = hook;}, onExecute: (hook: () => Promise<void>) => {executeHook = hook;},
  };
}

it('disconnects observers for rejected preparations, superseded tokens and stale saves', async () => {
  const rejected = fixture();
  rejected.source('<p>Hello</p><script>void 0</script>');
  expect(await rejected.prepare()).toEqual({outcome: 'unsupported'});
  expect(rejected.disposals()).toBe(1);
  const test = fixture();
  await test.token();
  const token = await test.token();
  expect(test.disposals()).toBe(1);
  test.revision();
  expect(await test.handlers.save(test.event, {token, newText: 'New'})).toEqual({outcome: 'stale'});
  expect(test.disposals()).toBe(2);
  expect(test.writes()).toBe(0);
});

it('prepares an opaque token and saves only the escaped literal with a guarded revision', async () => {
  const test = fixture();
  const result = await test.prepare();
  expect(result).toMatchObject({outcome: 'editable', target: {text: 'Hello', rect: selected.rect, style}});
  if (result.outcome !== 'editable') throw new Error(result.outcome);
  expect(result.target.token).toMatch(/^[a-f0-9-]{36}$/);
  const save = {token: result.target.token, newText: '<b>Safe & literal</b>'};
  expect(await test.handlers.save(test.event, save)).toEqual({outcome: 'saved'});
  expect(Buffer.from(test.bundle().files[0]!.bytes).toString()).toBe('<p>&lt;b&gt;Safe &amp; literal&lt;/b&gt;</p>');
  expect(Buffer.from(test.bundle().files[1]!.bytes).toString()).toBe('p { color: black }');
  expect(test.changed()).toBe(1);
  expect(await test.handlers.save(test.event, save)).toEqual({outcome: 'stale'});
  expect(test.writes()).toBe(1);
});

it('refuses unadmitted renderers and malformed requests without reading guests', async () => {
  for (const change of [
    (test: ReturnType<typeof fixture>) => {test.event.senderFrame = null;},
    (test: ReturnType<typeof fixture>) => {test.admitted(false);},
    (test: ReturnType<typeof fixture>) => {test.request.point.x = NaN;},
    (test: ReturnType<typeof fixture>) => {test.request.guestId = -1;},
    (test: ReturnType<typeof fixture>) => {test.request.nodeId = 'x'.repeat(129);},
  ]) {
    const test = fixture(); change(test);
    expect(await test.prepare()).toEqual({outcome: 'unavailable'});
    expect(test.executions()).toBe(0);
  }
});

it('refuses guests with the wrong host, type, URL, partition or node binding', async () => {
  for (const change of [
    (test: ReturnType<typeof fixture>) => {Object.assign(test.guest, {hostWebContents: {}});},
    (test: ReturnType<typeof fixture>) => {test.guest.getType = () => 'window';},
    (test: ReturnType<typeof fixture>) => {test.guest.getURL = () => 'about:blank';},
    (test: ReturnType<typeof fixture>) => {Object.assign(test.guest, {session: {}});},
    (test: ReturnType<typeof fixture>) => {test.bound(false);},
  ]) {
    const test = fixture(); change(test);
    expect(await test.prepare()).not.toHaveProperty('target');
    expect(test.executions()).toBe(0);
  }
});

it('rejects stale, read-only, dynamic and unbounded prepares', async () => {
  const readonly = fixture(); readonly.readOnly();
  expect(await readonly.prepare()).toEqual({outcome: 'readOnly'});
  const stale = fixture(); stale.request.updatedAt = 'old';
  expect(await stale.prepare()).toEqual({outcome: 'stale'});
  for (const value of [null, {...selected, text: 'x'.repeat(ARTIFACT_TEXT_MAX_LENGTH + 1)}, {...selected, rect: {...selected.rect, width: Infinity}}, {...selected, style: {...style, fontFamily: 'x'.repeat(513)}}, {...selected, domPath: 'x'.repeat(2049)}]) {
    const test = fixture(); test.raw(value);
    expect(await test.prepare()).toEqual({outcome: 'unsupported'});
  }
  for (const source of ['<p>Hello</p><script>document.querySelector("p").replaceWith(document.createElement("p"))</script>', '<p>Hello</p><a onclick="run()">Link</a>', '<p>Hello</p><a href="javascript:run()">Link</a>', '<p>/Users/example/private</p>']) {
    const test = fixture(); test.source(source);
    expect(await test.prepare()).toEqual({outcome: 'unsupported'});
    expect(test.writes()).toBe(0);
  }
});

it('rechecks admission, scope, node, guest and revision after asynchronous reads', async () => {
  const changes = [
    (test: ReturnType<typeof fixture>) => test.admitted(false),
    (test: ReturnType<typeof fixture>) => test.scope('other-workspace'),
    (test: ReturnType<typeof fixture>) => test.node(undefined),
    (test: ReturnType<typeof fixture>) => test.node({...test.current(), docId: 'another-doc'}),
    (test: ReturnType<typeof fixture>) => test.node({...test.current(), pagePath: 'pages/other.html'}),
    (test: ReturnType<typeof fixture>) => {test.guest.getURL = () => 'about:blank';},
    (test: ReturnType<typeof fixture>) => test.revision(),
    (test: ReturnType<typeof fixture>) => test.bound(false),
  ];
  for (const phase of ['read', 'files', 'execute'] as const) for (const change of changes) {
    const test = fixture();
    if (phase === 'read') test.onRead(() => change(test));
    if (phase === 'files') test.onFiles(() => change(test));
    if (phase === 'execute') test.onExecute(async () => change(test));
    expect(await test.prepare()).toEqual({outcome: 'stale'});
    expect(test.writes()).toBe(0);
  }
});

it('revalidates save authority at every asynchronous boundary and revokes stale tokens', async () => {
  for (const phase of ['read', 'files', 'execute'] as const) for (const change of [
    (test: ReturnType<typeof fixture>) => test.scope('other'),
    (test: ReturnType<typeof fixture>) => test.node(undefined),
    (test: ReturnType<typeof fixture>) => test.revision(),
    (test: ReturnType<typeof fixture>) => test.admitted(false),
    (test: ReturnType<typeof fixture>) => test.bound(false),
  ]) {
    const test = fixture(); const token = await test.token();
    if (phase === 'read') test.onRead(() => change(test));
    if (phase === 'files') test.onFiles(() => change(test));
    if (phase === 'execute') test.onExecute(async () => change(test));
    expect(await test.handlers.save(test.event, {token, newText: 'Next'})).toEqual({outcome: 'stale'});
    expect(test.writes()).toBe(0);
  }
});

it('rejects replaced DOM identity, source drift, newer readers and private or oversized saves', async () => {
  for (const change of [
    (test: ReturnType<typeof fixture>) => test.valid(false),
    (test: ReturnType<typeof fixture>) => test.source('<p>Other</p>'),
    (test: ReturnType<typeof fixture>) => test.updatedAt(),
  ]) {
    const test = fixture(); const token = await test.token(); change(test);
    expect(await test.handlers.save(test.event, {token, newText: 'Next'})).toEqual({outcome: 'stale'});
    expect(test.writes()).toBe(0);
  }
  const test = fixture(); const token = await test.token();
  for (const newText of ['/Users/example/private', 'x'.repeat(ARTIFACT_TEXT_MAX_LENGTH + 1), '\u0000', '\ud800']) {
    expect(await test.handlers.save(test.event, {token, newText})).toEqual({outcome: 'unsupported'});
  }
  test.readOnly();
  expect(await test.handlers.save(test.event, {token, newText: 'Next'})).toEqual({outcome: 'readOnly'});
  expect(test.writes()).toBe(0);
});

it('keeps a token retryable after transient write failure and suppresses overlapping saves', async () => {
  const test = fixture(); const token = await test.token();
  test.fail(true);
  expect(await test.handlers.save(test.event, {token, newText: 'Next'})).toEqual({outcome: 'unavailable'});
  test.fail(false);
  let release!: () => void;
  const pending = new Promise<void>(resolve => {release = resolve;});
  test.onExecute(() => pending);
  const first = test.handlers.save(test.event, {token, newText: 'Next'});
  expect(await test.handlers.save(test.event, {token, newText: 'Different'})).toEqual({outcome: 'unavailable'});
  release();
  expect(await first).toEqual({outcome: 'saved'});
  expect(test.writes()).toBe(1);
});

it('does not allow another renderer to save a token or leave a guest read pending forever', async () => {
  const test = fixture(); const token = await test.token();
  const other = {...test.sender, id: 3} as Electron.WebContents;
  expect(await test.handlers.save({sender: other, senderFrame: test.event.senderFrame}, {token, newText: 'Next'})).toEqual({outcome: 'unavailable'});
  test.onExecute(() => new Promise<void>(() => {}));
  expect(await test.handlers.save(test.event, {token, newText: 'Next'})).toEqual({outcome: 'unavailable'});
  expect(test.writes()).toBe(0);
});
