import {expect, it} from 'bun:test';
import type {ArtifactSummary} from '@studio/events';
import {artifactReadableText, createArtifactSearchHandler, createArtifactTextSearch} from './search.js';

const record = (id: string, title: string, name = 'Document'): ArtifactSummary => ({id, title, readOnly: false, updatedAt: '2026-10-09T10:00:00Z', pagePath: 'pages/index.html', pages: [{path: 'pages/index.html', name}]});

it('indexes static text, entities and labels without executing or retaining plumbing, metadata or form values', () => {
  const html = '<!doctype html><head><title>MetadataSecret</title><script>const secret="</head>";SCRIPT_SECRET</script><style>STYLE_SECRET</style></head><body><h1>Lemon &amp; lime &#x1f34b;</h1><!-- COMMENT_SECRET --><label>Quantity</label><input value="INPUT_SECRET"><textarea>TEXTAREA_SECRET</textarea><select><option>SELECT_SECRET</option></select><template><script>"</template>";TEMPLATE_SCRIPT_SECRET</script>TEMPLATE_SECRET</template><div hidden><div>HIDDEN_SECRET</div>STILL_HIDDEN</div><p>Readable body</p></body>';
  const text = artifactReadableText(html);
  expect(text).toContain('lemon & lime 🍋');
  expect(text).toContain('quantity');
  expect(text).toContain('readable body');
  for (const secret of ['metadata', 'script_secret', 'style_secret', 'comment_secret', 'input_secret', 'textarea_secret', 'select_secret', 'template_secret', 'template_script_secret', 'hidden_secret', 'still_hidden']) expect(text).not.toContain(secret);
  expect(artifactReadableText('<p>Visible</p><script>never closes SECRET')).toBe('visible');
  expect(artifactReadableText('<p>' + 'x'.repeat(20000) + '</p>').length).toBeLessThanOrEqual(16384);
});

it('ranks exact, prefix, infix titles before page names and body without returning text', async () => {
  const records = [record('body', 'Newest'), record('page', 'Other', 'Lemon cart'), record('infix', 'A lemon'), record('prefix', 'Lemon market'), record('exact', 'Lemon')];
  const search = createArtifactTextSearch({list: async () => records, readPage: async () => '<h1>Lemon body text</h1>'});
  const result = await search.search('lemon', () => true);
  expect(result).toMatchObject({outcome: 'ready', matches: [{artifactId: 'body', rank: 4}, {artifactId: 'page', rank: 3}, {artifactId: 'infix', rank: 2}, {artifactId: 'prefix', rank: 1}, {artifactId: 'exact', rank: 0}]});
  expect(JSON.stringify(result)).not.toContain('body text');
});

it('coalesces indexing, reuses it across queries, and invalidates on same-timestamp changes and deletion', async () => {
  let reads = 0;
  let lists = 0;
  let html = '<p>Basket</p>';
  let records = [record('one', 'Idea')];
  const search = createArtifactTextSearch({list: async () => {lists += 1; return records;}, readPage: async (_id, _path, limit) => {expect(limit).toBeLessThanOrEqual(1024 * 1024); reads += 1; return html;}});
  await Promise.all([search.search('Basket', () => true), search.search('Idea', () => true)]);
  await search.search('Ba', () => true);
  expect({reads, lists}).toEqual({reads: 1, lists: 1});
  html = '<p>Changed</p>';
  search.invalidate();
  expect(await search.search('Basket', () => true)).toMatchObject({matches: []});
  expect(reads).toBe(2);
  records = [];
  search.invalidate();
  expect(await search.search('Changed', () => true)).toMatchObject({matches: []});
});

it('rejects late content/tab results and exposes bounded unavailable text as partial', async () => {
  let resolve!: (html: string | null) => void;
  let started!: () => void;
  const reading = new Promise<void>((done) => {started = done;});
  const search = createArtifactTextSearch({list: async () => [record('one', 'Idea')], readPage: () => new Promise((done) => {resolve = done; started();})});
  const pending = search.search('secret', () => true);
  await reading;
  search.invalidate();
  resolve('<p>secret</p>');
  expect(await pending).toEqual({outcome: 'stale'});
  const bounded = createArtifactTextSearch({list: async () => Array.from({length: 513}, (_, index) => record(String(index), 'Idea')), readPage: async () => null});
  expect(await bounded.search('Idea', () => true)).toMatchObject({outcome: 'ready', partial: true});
  expect(await bounded.search('Idea', () => false)).toEqual({outcome: 'stale'});
});

it('admits only current Studio main frames and bounded queries before indexing', async () => {
  const frame = {} as Electron.WebFrameMain;
  const sender = {isDestroyed: () => false, mainFrame: frame} as Electron.WebContents;
  let calls = 0;
  const handler = createArtifactSearchHandler({renderers: () => [sender], search: async () => {calls += 1; return {outcome: 'ready', matches: [], partial: false};}});
  for (const event of [{sender, senderFrame: null}, {sender: {...sender} as Electron.WebContents, senderFrame: frame}]) expect(await handler(event, {query: 'hi'})).toEqual({outcome: 'unavailable'});
  expect(await handler({sender, senderFrame: frame}, {query: 'x'.repeat(201)})).toEqual({outcome: 'unavailable'});
  expect(calls).toBe(0);
  expect(await handler({sender, senderFrame: frame}, {query: 'hi'})).toMatchObject({outcome: 'ready'});
});
it('does not read bodies for an empty query and yields cold indexing to the event loop in bounded batches', async () => {
  let reads = 0;
  let readsAtYield: number | undefined;
  const records = Array.from({length: 40}, (_, index) => record(String(index), 'Idea'));
  const search = createArtifactTextSearch({list: async () => records, readPage: async () => {reads += 1; return '<p>' + 'Useful '.repeat(1000) + '</p>';}});
  expect(await search.search(' ', () => true)).toMatchObject({outcome: 'ready', matches: records.map((row) => ({artifactId: row.id, rank: 0}))});
  expect(reads).toBe(0);
  const observation = setImmediate(() => {readsAtYield = reads;});
  try {
    await search.search('Useful', () => true);
    expect(reads).toBe(40);
    expect(readsAtYield).toBeDefined();
    expect(readsAtYield!).toBeLessThanOrEqual(4);
    expect(readsAtYield!).toBeLessThan(reads);
  } finally {clearImmediate(observation);}
});
