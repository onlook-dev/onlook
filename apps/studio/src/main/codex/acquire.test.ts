import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it, jest } from 'bun:test';

import { acquireCodex, type DownloadProgress } from './acquire.js';

const VERSION = '9.9.9';
const TAG = 'darwin-arm64';
const TRIPLE = 'aarch64-apple-darwin';

const temps: string[] = [];
const servers: Server[] = [];

afterEach(() => {
  jest.useRealTimers();
  for (const server of servers.splice(0)) {
    // A stalled case holds a socket open; `close()` alone waits for it.
    server.closeAllConnections();
    server.close();
  }
  for (const dir of temps.splice(0)) {
    chmodSync(dir, 0o700);
    rmSync(dir, { recursive: true, force: true });
  }
});

function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `studio-${name}-`));
  temps.push(dir);
  return dir;
}

function makeTarball(options: { withHelper?: boolean } = {}): {
  path: string;
  bytes: Buffer;
  integrity: string;
  entries: string[];
} {
  const build = temp('codex-src');
  const pkg = join(build, 'package');
  const vendor = join(pkg, 'vendor', TRIPLE);
  mkdirSync(join(vendor, 'bin'), { recursive: true });
  mkdirSync(join(vendor, 'codex-path'), { recursive: true });
  mkdirSync(join(vendor, 'codex-resources', 'zsh', 'bin'), { recursive: true });

  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: '@openai/codex', version: `${VERSION}-${TAG}` }));
  writeFileSync(join(pkg, 'README.md'), 'stand-in for the published readme\n');
  writeFileSync(
    join(vendor, 'codex-package.json'),
    JSON.stringify({
      layoutVersion: 1,
      version: VERSION,
      target: TRIPLE,
      variant: 'codex',
      entrypoint: 'bin/codex',
      resourcesDir: 'codex-resources',
      pathDir: 'codex-path',
    }),
  );
  writeExecutable(join(vendor, 'bin', 'codex'));
  if (options.withHelper !== false) writeExecutable(join(vendor, 'bin', 'codex-code-mode-host'));
  writeExecutable(join(vendor, 'codex-path', 'rg'));
  writeExecutable(join(vendor, 'codex-resources', 'zsh', 'bin', 'zsh'));

  const path = join(build, 'codex.tgz');
  execFileSync('/usr/bin/tar', ['-czf', path, '-C', build, 'package']);
  const bytes = readFileSync(path);
  return {
    path,
    bytes,
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    entries: listFiles(pkg).map((file) => relative(pkg, file)).sort(),
  };
}

function writeExecutable(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '#!/bin/sh\nexit 0\n');
  chmodSync(path, 0o755);
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

interface Rig {
  base: string;
  hits: () => number;
}

function serveRegistry(options: {
  integrity?: string;
  body?: Buffer;
  truncateAfter?: number;
  stallAfter?: number;
  tarball?: { path: string; bytes: Buffer; integrity: string };
  fail?: boolean;
}): Rig {
  let hits = 0;
  const server = createServer((request, response) => {
    hits += 1;
    if (options.fail === true) {
      response.writeHead(500);
      response.end('nope');
      return;
    }
    if (request.url?.startsWith('/@openai/codex/') === true) {
      const port = (server.address() as { port: number }).port;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          dist: {
            tarball: `http://127.0.0.1:${String(port)}/somewhere/else/codex.tgz`,
            integrity: options.integrity ?? options.tarball?.integrity,
          },
        }),
      );
      return;
    }
    const body = options.body ?? options.tarball?.bytes ?? Buffer.alloc(0);
    response.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': String(body.byteLength),
    });
    if (options.truncateAfter !== undefined) {
      response.write(body.subarray(0, options.truncateAfter));
      response.destroy();
      return;
    }
    if (options.stallAfter !== undefined) {
      response.write(body.subarray(0, options.stallAfter));
      return;
    }
    response.end(body);
  });
  server.listen(0, '127.0.0.1');
  servers.push(server);
  const port = (server.address() as { port: number }).port;
  return { base: `http://127.0.0.1:${String(port)}`, hits: () => hits };
}

function acquire(
  cacheRoot: string,
  rig: Rig,
  extra: {
    onProgress?: (progress: DownloadProgress) => void;
    version?: string;
    stallTimeoutMs?: number;
    metadataTimeoutMs?: number;
    force?: boolean;
  } = {},
) {
  return acquireCodex({
    cacheRoot,
    version: extra.version ?? VERSION,
    platformTag: TAG,
    registryBase: rig.base,
    ...(extra.force === undefined ? {} : { force: extra.force }),
    ...(extra.onProgress ? { onProgress: extra.onProgress } : {}),
    ...(extra.stallTimeoutMs === undefined ? {} : { stallTimeoutMs: extra.stallTimeoutMs }),
    ...(extra.metadataTimeoutMs === undefined ? {} : { metadataTimeoutMs: extra.metadataTimeoutMs }),
  });
}

describe('acquireCodex', () => {
  it('replaces a healthy-looking cached binary when Download again requests a fresh copy', async () => {
    const rig = serveRegistry({ tarball: makeTarball() });
    const cacheRoot = temp('codex-reinstall');
    const first = await acquire(cacheRoot, rig);
    expect(first.outcome).toBe('ok');
    if (first.outcome !== 'ok') throw new Error('fixture install failed');
    writeFileSync(first.bin, '#!/bin/sh\nexit 99\n');
    const hits = rig.hits();
    const replaced = await acquire(cacheRoot, rig, { force: true });
    expect(replaced).toMatchObject({ outcome: 'ok', downloaded: true });
    expect(rig.hits()).toBeGreaterThan(hits);
    expect(readFileSync(first.bin, 'utf8')).not.toContain('exit 99');
  });

  it('downloads, verifies and unpacks a runtime we can drive', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');

    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') return;
    expect(result.downloaded).toBe(true);
    expect(existsSync(result.bin)).toBe(true);
    expect(existsSync(join(dirname(result.bin), 'codex-code-mode-host'))).toBe(true);
  });

  it('keeps the WHOLE tree — nothing is stripped', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');

    const result = await acquire(cacheRoot, rig);
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') return;

    const onDisk = listFiles(result.root).map((file) => relative(result.root, file)).sort();
    expect(onDisk).toEqual(tarball.entries);
  });

  it('downloads nothing when a healthy install is already there', async () => {
    const tarball = makeTarball();
    const seed = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');
    const first = await acquire(cacheRoot, seed);
    expect(first.outcome).toBe('ok');

    const refuses = serveRegistry({ fail: true });
    const second = await acquire(cacheRoot, refuses);

    expect(second.outcome).toBe('ok');
    if (second.outcome !== 'ok') return;
    expect(second.downloaded).toBe(false);
    expect(refuses.hits()).toBe(0);
  });

  it('replaces an existing install that is not healthy', async () => {
    const cacheRoot = temp('codex-cache');
    const broken = makeTarball({ withHelper: false });
    const rigBroken = serveRegistry({ tarball: broken });
    const root = join(cacheRoot, `codex-${VERSION}`);
    mkdirSync(join(root, 'vendor', TRIPLE, 'bin'), { recursive: true });
    writeFileSync(join(root, 'vendor', TRIPLE, 'codex-package.json'), readFileSync(join(dirname(broken.path), 'package', 'vendor', TRIPLE, 'codex-package.json')));
    writeExecutable(join(root, 'vendor', TRIPLE, 'bin', 'codex'));
    expect(rigBroken.hits()).toBe(0);

    const healthy = makeTarball();
    const rig = serveRegistry({ tarball: healthy });
    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') return;
    expect(result.downloaded).toBe(true);
    expect(existsSync(join(dirname(result.bin), 'codex-code-mode-host'))).toBe(true);
  });

  it('refuses a digest mismatch BEFORE unpacking anything', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball, integrity: 'sha512-notTheRightDigestAtAll==' });
    const cacheRoot = temp('codex-cache');

    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('failed');
    if (result.outcome === 'ok') return;
    expect(result.message).toContain('sha512-notTheRightDigestAtAll==');
    expect(result.message).toContain(tarball.integrity);
    expect(existsSync(join(cacheRoot, `codex-${VERSION}`))).toBe(false);
  });

  it('leaves no partial behind after a digest mismatch', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball, integrity: 'sha512-wrong==' });
    const cacheRoot = temp('codex-cache');

    await acquire(cacheRoot, rig);

    expect(readdirSync(cacheRoot)).toEqual([]);
  });

  it('fails a transfer that ends early, and installs nothing', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball, truncateAfter: 32 });
    const cacheRoot = temp('codex-cache');

    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('failed');
    expect(existsSync(join(cacheRoot, `codex-${VERSION}`))).toBe(false);
    expect(readdirSync(cacheRoot)).toEqual([]);
  });

  it('refuses an intact artifact missing the silent helper, and does not cache it', async () => {
    const tarball = makeTarball({ withHelper: false });
    const rig = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');

    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('broken');
    if (result.outcome === 'ok') return;
    expect(result.message).toContain('codex-code-mode-host');
    expect(existsSync(join(cacheRoot, `codex-${VERSION}`))).toBe(false);
  });

  it('keys the install by version and leaves other versions alone', async () => {
    const cacheRoot = temp('codex-cache');
    const rig = serveRegistry({ tarball: makeTarball() });
    const first = await acquire(cacheRoot, rig);
    expect(first.outcome).toBe('ok');
    if (first.outcome !== 'ok') return;
    expect(first.root.endsWith(`codex-${VERSION}`)).toBe(true);

    const other = serveRegistry({ tarball: makeTarball() });
    const second = await acquire(cacheRoot, other, { version: '8.8.8' });
    expect(second.outcome).toBe('ok');

    expect(existsSync(join(cacheRoot, `codex-${VERSION}`))).toBe(true);
    expect(existsSync(join(cacheRoot, 'codex-8.8.8'))).toBe(true);
  });

  it('reports real bytes, monotonically, ending at the served length', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');
    const seen: DownloadProgress[] = [];

    const result = await acquire(cacheRoot, rig, { onProgress: (p) => seen.push(p) });
    expect(result.outcome).toBe('ok');

    expect(seen.length).toBeGreaterThan(0);
    const last = seen[seen.length - 1];
    expect(last?.totalBytes).toBe(tarball.bytes.byteLength);
    expect(last?.receivedBytes).toBe(tarball.bytes.byteLength);
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]?.receivedBytes).toBeGreaterThanOrEqual(seen[i - 1]?.receivedBytes ?? 0);
    }
  });

  it('never touches the network on a platform with no published runtime', async () => {
    const rig = serveRegistry({ tarball: makeTarball() });
    const cacheRoot = temp('codex-cache');

    const result = await acquireCodex({
      cacheRoot,
      version: VERSION,
      platformTag: undefined,
      registryBase: rig.base,
    });

    expect(result.outcome).toBe('unsupported');
    expect(rig.hits()).toBe(0);
  });

  it('gives up on a transfer that stalls, and leaves nothing behind', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball, stallAfter: 64 });
    const cacheRoot = temp('codex-cache');
    let flowing: () => void = () => undefined;
    const firstBytes = new Promise<void>((resolve) => {
      flowing = resolve;
    });

    jest.useFakeTimers();
    const acquiring = acquire(cacheRoot, rig, { stallTimeoutMs: 200, onProgress: () => flowing() });
    await firstBytes;
    jest.advanceTimersByTime(200);
    jest.useRealTimers();

    expect(await acquiring).toMatchObject({ outcome: 'failed', failure: 'download', message: expect.stringContaining('stalled') });
    expect(readdirSync(cacheRoot)).toEqual([]);
  });

  it('gives up on registry metadata that never arrives', async () => {
    const cacheRoot = temp('codex-cache');
    jest.useFakeTimers();
    const acquiring = acquireCodex({
      cacheRoot,
      version: VERSION,
      platformTag: TAG,
      registryBase: 'http://registry.invalid',
      metadataTimeoutMs: 150,
      fetch: () => new Promise<Response>(() => undefined),
    });
    jest.advanceTimersByTime(150);
    jest.useRealTimers();

    expect(await acquiring).toMatchObject({ outcome: 'failed', failure: 'metadata' });
  });

  it('reports a cache root it cannot write to rather than rejecting', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');
    // Read and execute only: `mkdtemp` inside it fails.
    chmodSync(cacheRoot, 0o500);

    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('failed');
    if (result.outcome === 'ok') return;
    expect(result.message).toContain(cacheRoot);
  });

  it('sweeps staging trees a killed run left behind', async () => {
    const cacheRoot = temp('codex-cache');
    const orphan = join(cacheRoot, '.codex-staging-abandoned');
    mkdirSync(join(orphan, 'tree'), { recursive: true });
    writeFileSync(join(orphan, 'codex.tgz'), 'partial bytes');

    const rig = serveRegistry({ tarball: makeTarball() });
    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('ok');
    expect(existsSync(orphan)).toBe(false);
    expect(readdirSync(cacheRoot)).toEqual([`codex-${VERSION}`]);
  });

  it('follows the advertised tarball URL rather than rebuilding it', async () => {
    const tarball = makeTarball();
    const rig = serveRegistry({ tarball });
    const cacheRoot = temp('codex-cache');

    const result = await acquire(cacheRoot, rig);

    expect(result.outcome).toBe('ok');
    expect(rig.hits()).toBe(2);
  });
});
