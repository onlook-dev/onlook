import { mkdirSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import {
  cleanupTempFixtures,
  makeMonorepoDir,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
  type MonorepoApp,
} from '@studio/fixtures';
import type { ListenerIdentity } from '../server/owner.js';
import { probePort } from '../server/probe.js';
import {
  appForReport,
  briefedApp,
  classifyListener,
  detectApps,
  detectionContextFor,
  enumerateApps,
  portFromScript,
  rememberReportedApp,
  type DetectDeps,
} from './detect.js';
import { appChoiceFor, rememberAppChoice, resetWorkspaceCache } from './store.js';

const servers: Server[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `detect-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  return root;
}

async function listen(): Promise<number> {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  return address.port;
}

const quiet: DetectDeps = {
  probePort: async () => false,
  identifyListener: async () => undefined,
  workspaceRoot: () => '/nonexistent/studio-workspaces',
};

function withListener(identity: ListenerIdentity | undefined, workspaceRoot: string): DetectDeps {
  return {
    probePort: (port) => probePort(port, { timeoutMs: 500 }),
    identifyListener: async () => identity,
    workspaceRoot: () => workspaceRoot,
  };
}

describe('enumerateApps', () => {
  it('lists both apps of a workspaces root with framework and port, and never the root', async () => {
    const mono = makeMonorepoDir({ name: 'two' });
    const apps = await enumerateApps(mono.path);
    expect(apps).toEqual([
      { name: 'admin', path: 'apps/admin', framework: 'Vite', port: 4000, portSource: 'project' },
      { name: 'web', path: 'apps/web', framework: 'Next.js', port: 3000, portSource: 'framework' },
    ]);
  });

  it('reads pnpm-workspace.yaml, and treats turbo.json alone as the conventional layout', async () => {
    const pnpm = makeMonorepoDir({ name: 'pnpm', manager: 'pnpm' });
    expect((await enumerateApps(pnpm.path)).map((app) => app.path)).toEqual(['apps/admin', 'apps/web']);
    const turbo = makeMonorepoDir({ name: 'turbo', manager: 'turbo' });
    expect((await enumerateApps(turbo.path)).map((app) => app.path)).toEqual(['apps/admin', 'apps/web']);
  });

  it('a single-package repository is one app at `.`', async () => {
    const single = makeMonorepoDir({
      name: 'single',
      apps: [{ dir: '.', name: 'solo', dev: 'next dev', dependencies: { next: '15.0.0' } }],
    });
    expect(await enumerateApps(single.path)).toEqual([
      { name: 'solo', path: '.', framework: 'Next.js', port: 3000, portSource: 'framework' },
    ]);
  });

  it('a package with no dev script is not an app; a folder with no manifest enumerates none', async () => {
    const none = makeMonorepoDir({
      name: 'no-dev',
      apps: [
        { dir: 'apps/web', dev: 'next dev' },
        { dir: 'apps/lib', dependencies: { react: '19.0.0' } },
      ],
    });
    expect((await enumerateApps(none.path)).map((app) => app.path)).toEqual(['apps/web']);
    expect(await enumerateApps(makeDirWithFiles({ name: 'empty' }))).toEqual([]);
    expect(await enumerateApps(join(none.path, 'nowhere'))).toEqual([]);
  });

  it('resolves the port from the dev script, then the env file, then the framework default', async () => {
    const apps: MonorepoApp[] = [
      { dir: 'apps/flag', dev: 'next dev -p 4000', dependencies: { next: '15.0.0' } },
      { dir: 'apps/env', dev: 'next dev', dependencies: { next: '15.0.0' }, env: { file: '.env', port: 5000 } },
      { dir: 'apps/both', dev: 'vite --port=4100', dependencies: { vite: '6.0.0' }, env: { file: '.env.local', port: 5100 } },
      { dir: 'apps/default', dev: 'astro dev', dependencies: { astro: '5.0.0' } },
      { dir: 'apps/remix-vite', dev: 'vite dev', dependencies: { '@remix-run/react': '2.15.0', vite: '6.0.0' } },
      { dir: 'apps/remix-classic', dev: 'remix dev', dependencies: { '@remix-run/react': '2.15.0' } },
      { dir: 'apps/unknown', dev: 'node server.js' },
    ];
    const mono = makeMonorepoDir({ name: 'ports', apps });
    const ports = Object.fromEntries((await enumerateApps(mono.path)).map((app) => [app.path, app.port]));
    expect(ports).toEqual({
      'apps/flag': 4000,
      'apps/env': 5000,
      'apps/both': 4100,
      'apps/default': 4321,
      'apps/remix-vite': 5173,
      'apps/remix-classic': 3000,
      'apps/unknown': 3000,
    });
  });

  it('briefs a port the project sets as its own, a framework default as the default, and a guessed port not at all', async () => {
    const mono = makeMonorepoDir({
      name: 'port-sources',
      apps: [
        { dir: 'apps/flag', dev: 'next dev -p 4000', dependencies: { next: '15.0.0' } },
        { dir: 'apps/env', dev: 'node server.js', env: { file: '.env', port: 5000 } },
        { dir: 'apps/default', dev: 'astro dev', dependencies: { astro: '5.0.0' } },
        { dir: 'apps/unknown', dev: 'node server.js' },
      ],
    });
    const briefed = Object.fromEntries(
      (await enumerateApps(mono.path)).map(briefedApp).map(({ path, port, frameworkPort }) => [path, { port, frameworkPort }]),
    );
    expect(briefed).toEqual({
      'apps/flag': { port: 4000, frameworkPort: undefined },
      'apps/env': { port: 5000, frameworkPort: undefined },
      'apps/default': { port: undefined, frameworkPort: 4321 },
      'apps/unknown': { port: undefined, frameworkPort: undefined },
    });
  });

  it('portFromScript reads the four spellings and nothing that merely resembles them', () => {
    expect(portFromScript('next dev -p 4000')).toBe(4000);
    expect(portFromScript('vite --port 5000')).toBe(5000);
    expect(portFromScript('vite --port=5001')).toBe(5001);
    expect(portFromScript('PORT=5002 node server.js')).toBe(5002);
    expect(portFromScript('cross-env PORT=5003 next dev')).toBe(5003);
    expect(portFromScript('next dev --profile')).toBeUndefined();
    expect(portFromScript('next dev -p 70000')).toBeUndefined();
    expect(portFromScript('node scripts/dev.js --port-file x')).toBeUndefined();
  });
});

describe('busy, conflict, excluded', () => {
  it('a listener whose cwd is inside the user’s source folder is busy', async () => {
    const source = makeDirWithFiles({ name: 'source' });
    const port = await listen();
    const mono = makeMonorepoDir({ name: 'busy', apps: [{ dir: 'apps/web', dev: `next dev -p ${String(port)}` }] });
    const nested = join(source, 'apps', 'web');
    mkdirSync(nested, { recursive: true });

    const detection = await detectApps(mono.path, source, withListener({ pid: 1, cwd: nested }, '/nonexistent/root'));

    expect(detection.busy).toEqual([{ port, cwd: nested, path: 'apps/web' }]);
    expect(detection.conflicts).toEqual([]);
  });

  it('a listener from another folder on that port is a conflict, never a candidate', async () => {
    const source = makeDirWithFiles({ name: 'source-b' });
    const elsewhere = makeDirWithFiles({ name: 'elsewhere' });
    const port = await listen();
    const mono = makeMonorepoDir({ name: 'conflict', apps: [{ dir: 'apps/web', dev: `next dev -p ${String(port)}` }] });

    const detection = await detectApps(mono.path, source, withListener({ pid: 1, cwd: elsewhere }, '/nonexistent/root'));

    expect(detection.busy).toEqual([]);
    expect(detection.conflicts).toEqual([{ port }]);
  });

  it('an unreadable cwd is a conflict, and so is a listener inside any Studio project', async () => {
    const source = makeDirWithFiles({ name: 'source-c' });
    const root = makeWorkspaceRoot({ name: 'detect-excluded' });
    const otherWorktree = join(root, 'github-com-fixture-mono', 'amber-kestrel');
    mkdirSync(otherWorktree, { recursive: true });
    const port = await listen();
    const mono = makeMonorepoDir({ name: 'excluded', apps: [{ dir: 'apps/web', dev: `next dev -p ${String(port)}` }] });

    const unreadable = await detectApps(mono.path, source, withListener({ pid: 1 }, root));
    expect(unreadable.busy).toEqual([]);
    expect(unreadable.conflicts).toEqual([{ port }]);

    const studio = await detectApps(mono.path, source, withListener({ pid: 1, cwd: otherWorktree }, root));
    expect(studio.busy).toEqual([]);
    expect(studio.conflicts).toEqual([{ port }]);
  });

  it('a port nobody answers on is neither — the premise the listener cases stand on', async () => {
    const source = makeDirWithFiles({ name: 'source-d' });
    const port = await listen();
    const held = makeMonorepoDir({ name: 'held', apps: [{ dir: 'apps/web', dev: `next dev -p ${String(port)}` }] });
    const deps = withListener({ pid: 1, cwd: source }, '/nonexistent/root');
    expect((await detectApps(held.path, source, deps)).busy).toHaveLength(1);

    await new Promise<void>((resolve) => servers.splice(0).forEach((server) => server.close(() => resolve())));
    const released = await detectApps(held.path, source, deps);
    expect(released.busy).toEqual([]);
    expect(released.conflicts).toEqual([]);
  });

  it('classifyListener: the workspace root wins over the source folder, as in attribution', () => {
    const root = makeWorkspaceRoot({ name: 'detect-tie' });
    const inside = join(root, 'bucket', 'source');
    mkdirSync(inside, { recursive: true });
    expect(classifyListener({ pid: 1, cwd: inside }, { sourcePath: inside, workspaceRoot: root })).toBe('conflict');
    expect(classifyListener(undefined, { sourcePath: inside, workspaceRoot: root })).toBe('conflict');
  });
});

describe('detectionContextFor and the remembered app', () => {
  it('two apps and nothing remembered: Claude is asked the app question, codex is not', async () => {
    useOwnWorkspaceRoot('ask');
    const mono = makeMonorepoDir({ name: 'ctx-ask' });
    const target = { worktree: mono.path, sourcePath: mono.path, repoIdentity: 'github.com/fixture/mono' };

    const claude = await detectionContextFor({ ...target, harness: 'claude' }, quiet);
    expect(claude.asks).toEqual(['app']);
    expect(claude.context).toBeDefined();

    const codex = await detectionContextFor({ ...target, harness: 'codex' }, quiet);
    expect(codex.asks).toEqual([]);
    expect(codex.context).toBeDefined();
  });

  it('a remembered path that still exists suppresses the ask; one that is gone is forgotten and the ask returns', async () => {
    useOwnWorkspaceRoot('remembered');
    const mono = makeMonorepoDir({ name: 'ctx-remembered' });
    const target = { worktree: mono.path, sourcePath: mono.path, repoIdentity: 'github.com/fixture/mono', harness: 'claude' as const };
    rememberAppChoice(target.repoIdentity, 'apps/web');

    const kept = await detectionContextFor(target, quiet);
    expect(kept.asks).toEqual([]);
    expect(appChoiceFor(target.repoIdentity)).toBe('apps/web');

    rmSync(join(mono.path, 'apps', 'web'), { recursive: true, force: true });
    const forgotten = await detectionContextFor(target, quiet);
    expect(appChoiceFor(target.repoIdentity)).toBeUndefined();
    expect(forgotten.asks).toEqual(['plan']);

    const two = makeMonorepoDir({ name: 'ctx-remembered-two' });
    rememberAppChoice(target.repoIdentity, 'apps/nowhere');
    const again = await detectionContextFor({ ...target, worktree: two.path, sourcePath: two.path }, quiet);
    expect(again.asks).toEqual(['app']);
    expect(appChoiceFor(target.repoIdentity)).toBeUndefined();
  });

  it('a single app with a free port carries a context and no ask', async () => {
    useOwnWorkspaceRoot('single');
    const single = makeMonorepoDir({ name: 'ctx-single', apps: [{ dir: '.', dev: 'next dev', dependencies: { next: '15.0.0' } }] });
    const outcome = await detectionContextFor(
      { worktree: single.path, sourcePath: single.path, repoIdentity: 'github.com/fixture/solo', harness: 'claude' },
      quiet,
    );
    expect(outcome.asks).toEqual([]);
    expect(outcome.context).toBeDefined();
  });
});

describe('detectionContextFor and an unusual start (ONL-2960)', () => {
  it('a monorepo whose one dev package is an Electron app asks for a plan', async () => {
    useOwnWorkspaceRoot('unusual');
    const mono = makeMonorepoDir({
      name: 'ctx-electron',
      apps: [{ dir: 'apps/studio', dev: 'electron-vite dev', dependencies: { electron: '43.0.0', 'electron-vite': '4.0.0', vite: '7.0.0' } }],
    });
    const target = { worktree: mono.path, sourcePath: mono.path, repoIdentity: 'github.com/fixture/desk', harness: 'claude' as const };

    const proposed = await detectionContextFor(target, quiet);
    expect(proposed.asks).toEqual(['plan']);
    expect(proposed.unusual).toEqual(['monorepo', 'electron']);
    expect(proposed.context).toContain('Electron');
  });

  it('a repository with no package script asks for a plan instead of saying nothing', async () => {
    useOwnWorkspaceRoot('no-dev');
    const outcome = await detectionContextFor(
      { worktree: makeDirWithFiles({ name: 'ctx-no-dev' }), sourcePath: '/nowhere', repoIdentity: 'y', harness: 'claude' },
      quiet,
    );
    expect(outcome.asks).toEqual(['plan']);
    expect(outcome.context).toContain('AskUserQuestion');
  });
});

describe('the report remembers the app', () => {
  const apps = [
    { name: 'admin', path: 'apps/admin', port: 4000 },
    { name: 'web', path: 'apps/web', port: 3000 },
  ];

  it('by cwd inside an app, by port for a root cwd, and nothing otherwise', () => {
    const mono = makeMonorepoDir({ name: 'report' });
    expect(appForReport(apps, mono.path, join(mono.path, 'apps', 'web'), undefined)?.path).toBe('apps/web');
    expect(appForReport(apps, mono.path, join(mono.path, 'apps', 'web', 'src'), 3000)?.path).toBe('apps/web');
    expect(appForReport(apps, mono.path, mono.path, 4000)?.path).toBe('apps/admin');
    expect(appForReport(apps, mono.path, mono.path, undefined)).toBeUndefined();
    expect(appForReport(apps, mono.path, mono.path, 9999)).toBeUndefined();
    expect(appForReport(apps, mono.path, join(mono.path, 'packages', 'ui'), 3000)).toBeUndefined();
    const shared = apps.map((app) => ({ ...app, port: 3000 }));
    expect(appForReport(shared, mono.path, mono.path, 3000)).toBeUndefined();
    expect(appForReport([{ name: 'solo', path: '.', port: 3000 }], mono.path, mono.path, undefined)?.path).toBe('.');
  });

  it('rememberReportedApp writes the store from a real enumeration, and writes nothing it cannot place', async () => {
    useOwnWorkspaceRoot('report-store');
    const mono = makeMonorepoDir({ name: 'report-store' });
    const repoIdentity = 'github.com/fixture/mono';

    await rememberReportedApp({ worktree: mono.path, repoIdentity, folder: mono.path, port: 9999 });
    expect(appChoiceFor(repoIdentity)).toBeUndefined();

    await rememberReportedApp({ worktree: mono.path, repoIdentity, folder: join(mono.path, 'apps', 'web'), port: 3000 });
    expect(appChoiceFor(repoIdentity)).toBe('apps/web');

    await rememberReportedApp({ worktree: mono.path, repoIdentity, folder: mono.path, port: 4000 });
    expect(appChoiceFor(repoIdentity)).toBe('apps/admin');
  });
});
