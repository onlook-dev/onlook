// Every egress target here is a sink this spec owns on loopback and reads back: the policy under
// test is the only thing that would stop a request to a host off the machine (ONL-2568).

import { createSocket } from 'node:dgram';
import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { ARTIFACT_SCHEME, ARTIFACTS_PARTITION } from '@studio/events';
import { cleanupTempFixtures, freePort, makeCopySourceDir, makeWorkspaceRoot } from '@studio/fixtures';
import { createArtifactStore } from '../../apps/studio/src/main/artifacts/store.js';
import { resetArtifactIndexCache } from '../../apps/studio/src/main/artifacts/state.js';
import { TESTID } from './contract.js';
import {
  addCodebaseFromFolder,
  closeStudio,
  connectClaude,
  editorPage,
  expectCanvasDocument,
  isTargetPresent,
  launchStudio,
  missingHint,
  openedExternal,
  recordOpenExternal,
  repoRoot,
  stubFolderPicker,
  type Target,
} from './launch.js';

const target = (process.env['STUDIO_TARGET'] ?? 'build') as Target;

/** An 8×8 opaque PNG, so a canvas read of it is a real read rather than a zero-size no-op. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVQoz2P8z8Dwn4GKgIlhVIPRMBpGw2gYDQBHvAMBuNcZkwAAAABJRU5ErkJggg==',
  'base64',
);

interface Probe {
  done?: boolean;
  script?: boolean;
  style?: boolean;
  sharedScript?: boolean;
  sharedStyle?: boolean;
  siblingScript?: boolean;
  siblingStyle?: boolean;
  ownImage?: boolean;
  siblingImage?: boolean;
  remoteImage?: boolean;
  /** Bytes the document carries itself: the control for the pixel denials. */
  controlImage?: boolean;
  font?: string;
  siblingFetch?: string;
  ownFetch?: string;
  siblingFrameDocument?: string;
  /** `never-loaded` | `draw-threw` | `tainted` | `read-threw` | `readable`. */
  controlPixels?: string;
  ownPixels?: string;
  siblingPixels?: string;
  iceCandidates?: number;
  opened?: string;
}

async function seedCodeFiles(stateRoot: string, id: string, name: string, value: string): Promise<void> {
  const saved = process.env['STUDIO_STATE_ROOT'];
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetArtifactIndexCache();
  try {
    const store = createArtifactStore();
    const bundle = await store.readFiles(id);
    if ('code' in bundle) throw new Error(bundle.reason);
    const directory = join(stateRoot, 'artifacts', id);
    const files = new Map(bundle.files.map((file) => [file.path, file]));
    for (const path of ['assets/pic.png', 'assets/font.woff2']) files.set(path, { path, bytes: readFileSync(join(directory, path)) });
    for (const [path, content] of [[`pages/${name}.js`, `window.__${name}Script=true;`], [`pages/${name}.css`, `body{--${name}-style:${value}}`]] as const) {
      files.set(path, { path, bytes: Buffer.from(content) });
    }
    expect(await store.writeFiles(id, { pages: bundle.pages, files: [...files.values()] })).toEqual({ ok: true });
  } finally {
    if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = saved;
    resetArtifactIndexCache();
  }
}

/** Any real woff2 in the checkout: the point is that a CORS-mandatory font reaches the handler. */
function findWoff2(root: string, depth = 0): string | undefined {
  if (depth > 4) return undefined;
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.woff2')) return join(root, entry.name);
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === '.git') continue;
    const found = findWoff2(join(root, entry.name), depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function probePage(own: string, sibling: string, sink: string, stun: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>probe</title>
<link rel="stylesheet" href="${own}/pages/owned.css" />
<script src="${own}/pages/owned.js"></script>
<link rel="stylesheet" href="${sibling}/pages/sibling.css" />
<script src="${sibling}/pages/sibling.js"></script><style>
@font-face { font-family: 'ProofFont'; src: url('${own}/assets/font.woff2') format('woff2'); }
body { margin: 0; padding: 16px; font-family: ProofFont, serif; }
h1 { color: rgb(0, 128, 0); font-size: 18px; margin: 0 0 8px; }
</style></head><body>
<h1 id="styled">own script, image and font</h1>
<img id="own" src="${own}/assets/pic.png" width="32" height="32" alt="" />
<img id="sibling" src="${sibling}/assets/pic.png" width="32" height="32" alt="" />
<img id="remote" src="${sink}/remote.png" width="8" height="8" alt="" />
<!-- The control for the pixel denials: bytes the document carries itself. -->
<img id="control" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVQoz2P8z8Dwn4GKgIlhVIPRMBpGw2gYDQBHvAMBuNcZkwAAAABJRU5ErkJggg==" width="8" height="8" alt="" />
<iframe id="sib" src="${sibling}/pages/index.html" width="48" height="32"></iframe>
<form id="away" method="post" action="${sink}/form"><input name="a" value="b" /></form>
<a id="blank" href="${sink}/blank" target="_blank">out</a>
<script>
(function () {
  var out = { done: false, script: true };
  window.__artifactProbe = out;
  function settled(el) {
    return new Promise(function (resolve) {
      if (el.complete) return resolve(el.naturalWidth > 0);
      el.addEventListener('load', function () { resolve(el.naturalWidth > 0); });
      el.addEventListener('error', function () { resolve(false); });
      setTimeout(function () { resolve(el.naturalWidth > 0); }, 5000);
    });
  }
  function ice() {
    return new Promise(function (resolve) {
      var found = 0;
      try {
        var pc = new RTCPeerConnection({ iceServers: [{ urls: '${stun}' }] });
        pc.onicecandidate = function (e) { if (e.candidate) found += 1; };
        pc.createDataChannel('probe');
        pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).catch(function () {});
      } catch (error) { return resolve(0); }
      setTimeout(function () { resolve(found); }, 4000);
    });
  }
  /* Five distinct answers, because only one of them is isolation: a broken image throws too,
     and an image that never arrived is not the same denial as a canvas refusing to be read. */
  function pixels(el) {
    if (!el.complete || el.naturalWidth === 0) return 'never-loaded';
    var c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    var ctx = c.getContext('2d');
    try { ctx.drawImage(el, 0, 0); } catch (error) { return 'draw-threw'; }
    try {
      ctx.getImageData(0, 0, 1, 1);
      return 'readable';
    } catch (error) {
      return error && error.name === 'SecurityError' ? 'tainted' : 'read-threw';
    }
  }
  Promise.all([
    settled(document.getElementById('own')),
    settled(document.getElementById('sibling')),
    settled(document.getElementById('remote')),
    settled(document.getElementById('control')),
    document.fonts.load('16px ProofFont').then(function (f) { return f.length > 0 ? 'loaded' : 'empty'; }).catch(function () { return 'rejected'; }),
    fetch('${sibling}/pages/index.html').then(function () { return 'served'; }).catch(function () { return 'refused'; }),
    fetch('${own}/pages/index.html').then(function () { return 'served'; }).catch(function () { return 'refused'; }),
    ice(),
  ]).then(function (all) {
    out.ownImage = all[0];
    out.siblingImage = all[1];
    out.remoteImage = all[2];
    out.controlImage = all[3];
    out.font = all[4];
    out.siblingFetch = all[5];
    out.ownFetch = all[6];
    out.iceCandidates = all[7];
    out.style = getComputedStyle(document.getElementById('styled')).color === 'rgb(0, 128, 0)';
    out.sharedScript = window.__ownedScript === true;
    out.sharedStyle = getComputedStyle(document.body).getPropertyValue('--owned-style').trim() === 'loaded';
    out.siblingScript = window.__siblingScript === true;
    out.siblingStyle = getComputedStyle(document.body).getPropertyValue('--sibling-style').trim() === 'leaked';
    out.siblingFrameDocument = document.getElementById('sib').contentDocument === null ? 'null' : 'reachable';
    // The control: the same canvas, the same call, on bytes the document carries itself.
    out.controlPixels = pixels(document.getElementById('control'));
    out.ownPixels = pixels(document.getElementById('own'));
    out.siblingPixels = pixels(document.getElementById('sibling'));
    out.opened = String(window.open('${sink}/open'));
    out.done = true;
    try { document.getElementById('blank').click(); } catch (error) {}
    try { document.getElementById('away').submit(); } catch (error) {}
  });
})();
</script></body></html>
`;
}

async function armArtifactTool(window: Page): Promise<void> {
  await window.getByTestId(TESTID.canvasTool).locator('[data-preview="select"] button').click();
  await window.keyboard.press('a');
  await expect
    .poll(() => window.getByTestId(TESTID.canvasToolbar).getAttribute('data-tool'), { timeout: 15_000 })
    .toBe('artifact');
}

/** Window coordinates: `canvasRegion` spans the rails too, so a fraction of it presses the sidebar. */
async function drawAt(window: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await window.mouse.move(from.x, from.y);
  await window.mouse.down();
  for (let step = 1; step <= 16; step += 1) {
    await window.mouse.move(from.x + ((to.x - from.x) * step) / 16, from.y + ((to.y - from.y) * step) / 16);
  }
  await window.mouse.up();
}

const artifactIds = (stateRoot: string): string[] => {
  try {
    return readdirSync(join(stateRoot, 'artifacts'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.includes('.corrupt-'))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
};

function plantAssets(stateRoot: string, id: string): void {
  const assets = join(stateRoot, 'artifacts', id, 'assets');
  mkdirSync(assets, { recursive: true });
  writeFileSync(join(assets, 'pic.png'), PNG, { mode: 0o600 });
  const font = findWoff2(join(repoRoot, 'apps/studio/out')) ?? findWoff2(join(repoRoot, 'out'));
  if (font === undefined) throw new Error('no woff2 in the checkout to serve as the artifact own font');
  writeFileSync(join(assets, 'font.woff2'), readFileSync(font), { mode: 0o600 });
}

test('an artifact runs its own script, image and font, and reaches nothing else', async () => {
  /* The steps below already wait longer than the tier's own minute (ONL-3182). */
  test.setTimeout(180_000);
  expect(isTargetPresent(target), missingHint(target)).toBe(true);

  const scratch = mkdtempSync(join(tmpdir(), 'studio-artifact-e2e-'));
  const stateRoot = join(scratch, 'state');
  mkdirSync(stateRoot, { recursive: true });
  const folder = makeCopySourceDir({ name: 'artifact-e2e' });

  const hits: string[] = [];
  const sinkPort = await freePort();
  const stunPort = await freePort();
  const sink: Server = createServer((request, response) => {
    hits.push(request.url ?? '');
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end('sink');
  });
  await new Promise<void>((resolve) => sink.listen(sinkPort, '127.0.0.1', resolve));
  let datagrams = 0;
  const stun = createSocket('udp4');
  stun.on('message', () => {
    datagrams += 1;
  });
  await new Promise<void>((resolve) => {
    stun.bind(stunPort, '127.0.0.1', resolve);
  });

  let app: ElectronApplication | undefined;
  try {
    app = await launchStudio(target, {
      STUDIO_STATE_ROOT: stateRoot,
      STUDIO_WORKSPACE_ROOT: makeWorkspaceRoot({ name: 'artifact-e2e' }),
      STUDIO_SETUP_PROOF: '1',
      STUDIO_FIRST_RUN: '1',
      STUDIO_AGENT_PROBE: 'ok',
      /* The probe alone leaves the agent unverified, and the connect step waits for the verdict (ONL-2541). */
      STUDIO_AGENT_VERIFY: 'ok',
    });
    const live = app;
    const window = await editorPage(live);
    await recordOpenExternal(live);
    await stubFolderPicker(live, folder.path);
    await connectClaude(window);
    await addCodebaseFromFolder(window);
    await expect(window.getByTestId(TESTID.canvasRegion)).toBeVisible({ timeout: 60_000 });
    await expectCanvasDocument(window);

    // Two sketches, drawn left to right: a drawn box is clamped up to a minimum, so each press
    // has to start clear of what is already there.
    await armArtifactTool(window);
    await drawAt(window, { x: 350, y: 120 }, { x: 660, y: 460 });
    await expect(window.getByTestId(TESTID.canvasArtifactNode).first()).toBeVisible({ timeout: 60_000 });
    await armArtifactTool(window);
    await drawAt(window, { x: 730, y: 120 }, { x: 870, y: 260 });
    await expect.poll(() => artifactIds(stateRoot).length, { timeout: 90_000 }).toBeGreaterThanOrEqual(2);

    const [probeId, siblingId] = artifactIds(stateRoot);
    expect(probeId).toBeDefined();
    expect(siblingId).toBeDefined();
    plantAssets(stateRoot, probeId as string);
    plantAssets(stateRoot, siblingId as string);
    await seedCodeFiles(stateRoot, probeId as string, 'owned', 'loaded');
    await seedCodeFiles(stateRoot, siblingId as string, 'sibling', 'leaked');
    writeFileSync(
      join(stateRoot, 'artifacts', probeId as string, 'pages', 'index.html'),
      probePage(
        `${ARTIFACT_SCHEME}://${String(probeId)}`,
        `${ARTIFACT_SCHEME}://${String(siblingId)}`,
        `http://127.0.0.1:${String(sinkPort)}`,
        `stun:127.0.0.1:${String(stunPort)}`,
      ),
      { mode: 0o600 },
    );

    // Both guests have to be attached before either is addressed: the element's `src` lands in
    // the DOM before Electron creates the `webContents` behind it.
    await expect
      .poll(
        () =>
          live.evaluate(({ webContents }, scheme) =>
            webContents
              .getAllWebContents()
              .filter((candidate) => candidate.getType() === 'webview')
              .filter((candidate) => !candidate.isLoadingMainFrame())
              .filter((candidate) => candidate.getURL().startsWith(`${scheme}://`)).length,
          ARTIFACT_SCHEME),
        { timeout: 60_000 },
      )
      .toBeGreaterThanOrEqual(2);

    // A query the gate ignores (it reads `pathname`), so the load cannot be answered from cache.
    await live.evaluate(async ({ webContents }, wanted) => {
      const guest = webContents
        .getAllWebContents()
        .find((candidate) => candidate.getType() === 'webview' && candidate.getURL().includes(wanted));
      if (!guest) throw new Error('no guest for the probe artifact');
      await guest.loadURL(`${guest.getURL().split('?')[0] ?? ''}?take=probe`);
    }, probeId as string);

    const readProbe = (): Promise<Probe | null> =>
      live.evaluate(async ({ webContents }, wanted) => {
        const guest = webContents
          .getAllWebContents()
          .find((candidate) => candidate.getType() === 'webview' && candidate.getURL().includes(wanted));
        if (!guest) return null;
        try {
          return JSON.parse(
            (await guest.executeJavaScript('JSON.stringify(window.__artifactProbe || {})')) as string,
          ) as Probe;
        } catch {
          return null;
        }
      }, probeId as string);

    await expect.poll(() => readProbe().then((seen) => seen?.done === true), { timeout: 90_000 }).toBe(true);
    const seen = (await readProbe()) as Probe;

    // Its own first: every denial below is a denial rather than a page that never ran.
    expect(seen.script).toBe(true);
    expect(seen.style).toBe(true);
    expect(seen.sharedScript).toBe(true);
    expect(seen.sharedStyle).toBe(true);
    expect(seen.ownImage).toBe(true);
    expect(seen.font).toBe('loaded');

    /* The control: the same canvas and the same call, on bytes the document carries. It reads
       back, so every refusal below is the origin policy and not a broken canvas. */
    expect(seen.controlImage).toBe(true);
    expect(seen.controlPixels).toBe('readable');
    expect(seen.siblingScript).toBe(false);
    expect(seen.siblingStyle).toBe(false);

    /* Another artifact's DOM and pixels. The handler authorises by the id in the URL and cannot
       see who asked, so a sibling's image DOES load and draw — what is refused is reading it
       back, because every subresource is cross-origin to this sandbox's opaque origin. The
       artifact's own image is refused the same way, which is the shape of the guarantee. */
    expect(seen.siblingFrameDocument).toBe('null');
    expect(seen.siblingImage).toBe(true);
    expect(seen.siblingPixels).toBe('tainted');
    expect(seen.ownPixels).toBe('tainted');

    // `connect-src 'none'`: not one fetch answers, this artifact's own page included.
    expect(seen.siblingFetch).toBe('refused');
    expect(seen.ownFetch).toBe('refused');

    // Every network destination, at sinks this spec owns.
    expect(seen.remoteImage).toBe(false);
    expect(seen.iceCandidates).toBe(0);
    expect(seen.opened).toBe('null');
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 3_000);
    });
    expect(hits).toEqual([]);
    expect(datagrams).toBe(0);
    expect(await openedExternal(live)).toEqual([]);

    // And the guests themselves: the artifacts session, and no bridge on the page.
    const guests = await live.evaluate(
      async ({ session, webContents }, input) => {
        const artifacts = session.fromPartition(input.partition);
        const all = webContents
          .getAllWebContents()
          .filter(
            (candidate) =>
              candidate.getType() === 'webview' && candidate.getURL().startsWith(`${input.scheme}://`),
          );
        return Promise.all(
          all.map(async (candidate) => ({
            artifactsSession: candidate.session === artifacts,
            bridge: String(await candidate.executeJavaScript('typeof window.studio')),
          })),
        );
      },
      { scheme: ARTIFACT_SCHEME, partition: ARTIFACTS_PARTITION },
    );
    expect(guests.length).toBeGreaterThanOrEqual(2);
    for (const guest of guests) {
      expect(guest.artifactsSession).toBe(true);
      expect(guest.bridge).toBe('undefined');
    }
  } finally {
    if (app) await closeStudio(app).catch(() => undefined);
    await new Promise<void>((resolve) => sink.close(() => resolve()));
    stun.close();
    cleanupTempFixtures();
  }
});
