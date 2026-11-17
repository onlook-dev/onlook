import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import {
  attributeCwd,
  CONTAINER_RUNTIME_COMMANDS,
  identifyListener,
  isContainedIn,
  isContainerRuntime,
  resolveReportedFolder,
  verifiesFor,
} from './owner.js';

const instrument = process.platform === 'linux' ? '/usr/bin/lsof' : '/usr/sbin/lsof';
const hasInstrument = existsSync(instrument);
if (!hasInstrument) {
  console.warn(`[server owner] ${instrument} absent — skipping the socket-identity controls; the pure adjudication cases still run`);
}

async function listen(): Promise<{ port: number; close: () => Promise<void> }> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('did not bind');
  return {
    port: address.port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('identifyListener — the instrument', () => {
  it.skipIf(!hasInstrument)('resolves a real listening socket back to this very process', async () => {
    const server = await listen();
    try {
      const identity = await identifyListener(server.port);
      expect(identity?.pid).toBe(process.pid);
      expect(identity?.cwd).toBe(process.cwd());
      expect(typeof identity?.command).toBe('string');
      expect(identity?.command?.length ?? 0).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it.skipIf(!hasInstrument)('answers undefined once that same socket is gone', async () => {
    const server = await listen();
    await server.close();
    expect(await identifyListener(server.port)).toBeUndefined();
  });

  for (const firstHost of ['127.0.0.1', '::1']) {
    it.skipIf(!hasInstrument)(`refuses ambiguous listeners across loopback families with ${firstHost} first`, async () => {
      const folder = mkdtempSync(join(tmpdir(), 'owner-ambiguous-'));
      const children: ReturnType<typeof spawn>[] = [];
      const start = async (host: string, port: number, cwd: string): Promise<number> => {
        const child = spawn(process.execPath, ['-e', 'const http = require("node:http"); const server = http.createServer((_req, res) => res.end("ok")); server.listen({host: process.argv[1], port: Number(process.argv[2]), ipv6Only: true}, () => console.log(server.address().port));', host, String(port)], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        children.push(child);
        return new Promise((done, reject) => {
          child.once('error', reject);
          child.once('exit', () => reject(new Error('listener exited before binding')));
          child.stdout!.once('data', (data: Buffer) => done(Number(data.toString().trim())));
        });
      };
      try {
        const port = await start(firstHost, 0, process.cwd());
        await start(firstHost === '::1' ? '127.0.0.1' : '::1', port, folder);
        expect(await identifyListener(port)).toBeUndefined();
        expect(children.every((child) => child.exitCode === null)).toBe(true);
      } finally {
        await Promise.all(children.map((child) => new Promise<void>((done) => { child.once('close', () => done()); child.kill(); })));
        rmSync(folder, { recursive: true, force: true });
      }
    });
  }
});

describe('resolveReportedFolder — a model-supplied path entering the book (ONL-1995)', () => {
  const cwd = '/workspaces/repo-a';

  it('resolves a relative directory against the session’s own', () => {
    expect(resolveReportedFolder(cwd, 'apps/web')).toBe('/workspaces/repo-a/apps/web');
  });

  it('accepts an absolute directory inside the session’s', () => {
    expect(resolveReportedFolder(cwd, '/workspaces/repo-a/apps/web')).toBe(
      '/workspaces/repo-a/apps/web',
    );
  });

  it('falls back when nothing was reported', () => {
    expect(resolveReportedFolder(cwd, undefined)).toBe(cwd);
    expect(resolveReportedFolder(cwd, '   ')).toBe(cwd);
  });

  it('REFUSES a path outside the session’s directory, however it is spelled', () => {
    expect(resolveReportedFolder(cwd, '../repo-b')).toBe(cwd);
    expect(resolveReportedFolder(cwd, '/workspaces/repo-b')).toBe(cwd);
    expect(resolveReportedFolder(cwd, '/etc')).toBe(cwd);
  });

  it('refuses a sibling whose name merely STARTS with the session’s', () => {
    expect(resolveReportedFolder(cwd, '/workspaces/repo-a-other')).toBe(cwd);
  });
});

describe('isContainerRuntime — a stranger that is a container runtime (ONL-2359)', () => {
  it('recognises every runtime in the set', () => {
    for (const runtime of CONTAINER_RUNTIME_COMMANDS) {
      expect(isContainerRuntime(runtime)).toBe(true);
    }
  });

  it('matches the measured OrbStack name and a kernel-truncated Docker one', () => {
    expect(isContainerRuntime('OrbStack Helper')).toBe(true);
    expect(isContainerRuntime('com.docker.backe')).toBe(true);
  });

  it('never calls an ordinary process, a tunnel, or nothing at all a runtime', () => {
    expect(isContainerRuntime('node')).toBe(false);
    expect(isContainerRuntime('ssh')).toBe(false);
    expect(isContainerRuntime('python3.12')).toBe(false);
    expect(isContainerRuntime(undefined)).toBe(false);
  });
});

describe('isContainedIn', () => {
  it('accepts the directory itself and anything beneath it', () => {
    expect(isContainedIn('/repos/app', '/repos/app')).toBe(true);
    expect(isContainedIn('/repos/app/packages/web', '/repos/app')).toBe(true);
  });

  it('rejects a sibling whose name merely starts the same way', () => {
    expect(isContainedIn('/repos/app-legacy', '/repos/app')).toBe(false);
    expect(isContainedIn('/repos/application/src', '/repos/app')).toBe(false);
  });

  it('rejects a parent and an unrelated tree', () => {
    expect(isContainedIn('/repos', '/repos/app')).toBe(false);
    expect(isContainedIn('/elsewhere/app', '/repos/app')).toBe(false);
  });

  it('normalises before comparing', () => {
    expect(isContainedIn('/repos/app/./packages/../src', '/repos/app')).toBe(true);
    expect(isContainedIn('/repos/app/..', '/repos/app')).toBe(false);
  });
});

const symlinkRoot = mkdtempSync(join(tmpdir(), 'owner-symlink-'));
const physicalRoot = join(symlinkRoot, 'physical');
const linkedRoot = join(symlinkRoot, 'linked');
mkdirSync(join(physicalRoot, 'apps', 'web'), { recursive: true });
symlinkSync(physicalRoot, linkedRoot);
const physicalCanonical = realpathSync.native(physicalRoot);
if (realpathSync.native(linkedRoot) !== physicalCanonical || linkedRoot === physicalCanonical) {
  throw new Error('the symlink fixture is not a symlink — the realpath cases would prove nothing');
}

afterAll(() => {
  rmSync(symlinkRoot, { recursive: true, force: true });
});

describe('verifiesFor — does the listener verify the claim (ONL-1994)', () => {
  it('calls a listener inside the claimed folder ours', () => {
    expect(verifiesFor({ pid: 1, cwd: '/repos/app/web' }, '/repos/app')).toBe('ours');
  });

  it('calls a listener from a sibling folder foreign, whoever started it', () => {
    expect(verifiesFor({ pid: 1, cwd: '/workspaces/other-app' }, '/workspaces/app')).toBe('foreign');
    expect(verifiesFor({ pid: 1, cwd: '/workspaces/app-legacy' }, '/workspaces/app')).toBe('foreign');
  });

  it('calls everything it could not see unknown', () => {
    expect(verifiesFor(undefined, '/repos/app')).toBe('unknown');
    expect(verifiesFor({ pid: 1 }, '/repos/app')).toBe('unknown');
  });

  it('verifies across a symlinked folder spelling, both directions', () => {
    const listenerCwd = join(physicalCanonical, 'apps', 'web');
    expect(verifiesFor({ pid: 1, cwd: listenerCwd }, linkedRoot)).toBe('ours');
    expect(verifiesFor({ pid: 1, cwd: join(linkedRoot, 'apps', 'web') }, physicalRoot)).toBe('ours');
  });

  it('answers not-contained for a claimed folder that no longer exists', () => {
    expect(
      verifiesFor({ pid: 1, cwd: physicalCanonical }, join(symlinkRoot, 'never-created')),
    ).toBe('foreign');
  });
});

describe('attributeCwd — whose server is it (ONL-1994)', () => {
  const roots = { workspaceRoot: '/data/workspaces', sourceRepoRoot: '/Users/dana/repos/shop' };

  it('calls a listener inside a Studio project agent-started', () => {
    expect(attributeCwd('/data/workspaces/shop/main/apps/web', roots)).toBe('agent-started');
  });

  it("calls a listener inside the project's source repo the user's own", () => {
    expect(attributeCwd('/Users/dana/repos/shop/apps/web', roots)).toBe('users-own');
  });

  it('calls everything else — and everything unseen — unknown', () => {
    expect(attributeCwd('/Users/dana/repos/other-project', roots)).toBe('unknown');
    expect(attributeCwd(undefined, roots)).toBe('unknown');
    expect(attributeCwd('/Users/dana/repos/shop', { workspaceRoot: '/data/workspaces' })).toBe(
      'unknown',
    );
  });

  it('gives the workspace root the tie when the source repo nests inside it (ONL-2152)', () => {
    const nested = {
      workspaceRoot: '/data/workspaces',
      sourceRepoRoot: '/data/workspaces/blank-0000/source',
    };
    expect(attributeCwd('/data/workspaces/blank-0000/source', nested)).toBe('agent-started');
    expect(attributeCwd('/data/workspaces/blank-0000/amber-wren', nested)).toBe('agent-started');
  });

  it('attributes across a symlinked root spelling — the realpath rule again', () => {
    const listenerCwd = join(physicalCanonical, 'apps', 'web');
    expect(attributeCwd(listenerCwd, { workspaceRoot: linkedRoot })).toBe('agent-started');
    expect(attributeCwd(listenerCwd, { sourceRepoRoot: linkedRoot })).toBe('users-own');
  });
});
