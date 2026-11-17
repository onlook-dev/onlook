import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ClaudeBrowserPreparationError, createClaudeBrowsers } from './browsers.js';
import type { LoginChild, LoginSpawn, StartClaudeLoginOptions } from './login.js';

const roots: string[] = [];
const children: BrowserChild[] = [];
let previousOpen: string | undefined;

beforeEach(() => {
  previousOpen = process.env['STUDIO_CLAUDE_OPEN'];
  delete process.env['STUDIO_CLAUDE_OPEN'];
});

afterEach(() => {
  for (const child of children.splice(0)) child.emit('exit', 0, null);
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  if (previousOpen === undefined) delete process.env['STUDIO_CLAUDE_OPEN'];
  else process.env['STUDIO_CLAUDE_OPEN'] = previousOpen;
});

class BrowserChild extends EventEmitter implements LoginChild {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  kill(): boolean {
    return true;
  }
}

function rig(defaultName = 'Safari') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'claude-browser-test-')));
  roots.push(root);
  const paths: string[] = [];
  const add = (name: string, schemes = ['http', 'https'], folder = root): string => {
    const path = join(folder, `${name}.app`);
    mkdirSync(join(path, 'Contents'), { recursive: true });
    writeFileSync(join(path, 'Contents', 'Info.plist'), JSON.stringify({
      CFBundleIdentifier: `test.${name}`,
      CFBundleDisplayName: name,
      CFBundleURLTypes: [{ CFBundleURLSchemes: schemes }],
    }));
    paths.push(path);
    return path;
  };
  const opened: Array<{ path: string; url: string }> = [];
  let openerFails = false;
  const access = createClaudeBrowsers({
    platform: 'darwin',
    applicationPaths: () => paths,
    defaultApplicationName: () => defaultName,
    readApplication: (path) => JSON.parse(readFileSync(join(path, 'Contents', 'Info.plist'), 'utf8')),
    openApplication: async (path, url) => {
      if (openerFails) throw new Error('fixture opener failed');
      opened.push({ path, url });
    },
  });
  const child = new BrowserChild();
  children.push(child);
  const spawns: Parameters<LoginSpawn>[] = [];
  const options: StartClaudeLoginOptions = {
    bin: '/fixture/claude',
    env: { PATH: '/usr/bin', TMPDIR: '/fixture/unchanged', BROWSER: '/fixture/original' },
    spawn: (...args) => {
      spawns.push(args);
      queueMicrotask(() => child.stdout.write('visit: https://claude.com/oauth?state=fixture\n'));
      return child;
    },
    signal: () => undefined,
    killGraceMs: 1,
  };
  return { root, add, access, child, spawns, options, opened, failOpener: () => { openerFails = true; } };
}

describe('Claude browser inventory', () => {
  it('loads asynchronously once, shares pending discovery, and keeps list reads free of subprocess work', async () => {
    let queries = 0;
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const access = createClaudeBrowsers({
      platform: 'darwin',
      defaultApplicationName: () => 'Safari',
      applicationPaths: async () => {
        queries += 1;
        await pending;
        return [];
      },
    });
    expect(access.list()).toEqual([]);
    expect(queries).toBe(0);
    const first = access.load();
    expect(access.load()).toBe(first);
    expect(access.list()).toEqual([]);
    expect(queries).toBe(1);
    release();
    expect(await first).toEqual([]);
    expect(await access.load()).toEqual([]);
    expect(queries).toBe(1);
  });

  it('discovers installed HTTP browsers, uses OS names, and puts the default first without exposing paths', async () => {
    const fixture = rig();
    fixture.add('Chrome Canary', ['http', 'https'], join(fixture.root, 'Custom Location'));
    fixture.add('Safari');
    fixture.add('Mail', ['mailto']);
    fixture.add('Firefox', ['http', 'https'], join(fixture.root, 'Personal'));
    fixture.add('Broken');
    rmSync(join(fixture.root, 'Broken.app', 'Contents', 'Info.plist'));
    const browsers = await fixture.access.load();
    expect(browsers.map(({ name, isDefault }) => ({ name, isDefault }))).toEqual([
      { name: 'Safari', isDefault: true },
      { name: 'Chrome Canary', isDefault: false },
      { name: 'Firefox', isDefault: false },
    ]);
    expect(browsers.every((browser) => Object.keys(browser).sort().join() === 'id,isDefault,name')).toBe(true);
    expect(JSON.stringify(browsers)).not.toContain(fixture.root);
    expect(fixture.access.list()).toEqual(browsers);
  });

  it.each(['default', 'applications'] as const)('retries discovery after a transient %s lookup failure', async (lookup) => {
    const fixture = rig();
    const paths = [fixture.add('Safari'), fixture.add('Chrome')];
    let fail = true;
    let queries = 0;
    const access = createClaudeBrowsers({
      platform: 'darwin',
      defaultApplicationName: () => {
        if (lookup === 'default' && fail) throw new Error('fixture default lookup unavailable');
        return 'Safari';
      },
      applicationPaths: async () => {
        queries += 1;
        if (lookup === 'applications' && fail) throw new Error('fixture application lookup unavailable');
        return paths;
      },
      readApplication: (path) => JSON.parse(readFileSync(join(path, 'Contents', 'Info.plist'), 'utf8')),
    });
    const first = access.load();
    expect(access.load()).toBe(first);
    expect(await first).toEqual([]);
    expect(access.list()).toEqual([]);
    fail = false;
    const retried = access.load();
    expect(access.load()).toBe(retried);
    expect((await retried).map(({ name }) => name)).toEqual(['Safari', 'Chrome']);
    expect(queries).toBe(lookup === 'applications' ? 2 : 1);
    expect(await access.load()).toEqual(access.list());
    expect(queries).toBe(lookup === 'applications' ? 2 : 1);
  });

  it('returns default-only capability on Linux and Windows without probing applications', async () => {
    for (const platform of ['linux', 'win32'] as const) {
      const access = createClaudeBrowsers({ platform, defaultApplicationName: () => { throw new Error('must not probe'); } });
      expect(await access.load()).toEqual([]);
    }
  });

  it('fails closed when the OS default cannot be identified', async () => {
    const fixture = rig('Unknown');
    fixture.add('Chrome');
    expect(await fixture.access.load()).toEqual([]);
  });

  it('fails closed when LaunchServices cannot report installed applications', async () => {
    const access = createClaudeBrowsers({
      platform: 'darwin',
      defaultApplicationName: () => 'Safari',
      applicationPaths: () => { throw new Error('fixture LaunchServices unavailable'); },
    });
    expect(await access.load()).toEqual([]);
  });

  it('refuses arbitrary paths, shell fragments, unknown IDs, and applications removed after discovery', async () => {
    const fixture = rig();
    fixture.add('Safari');
    const path = fixture.add('Chrome');
    const browser = (await fixture.access.load()).find(({ name }) => name === 'Chrome')!;
    for (const id of [path, '../../evil', '$(touch /tmp/evil)', 'unknown']) {
      await expect(fixture.access.login(id, fixture.options)).rejects.toThrow();
    }
    rmSync(path, { recursive: true });
    await expect(fixture.access.login(browser.id, fixture.options)).rejects.toBeInstanceOf(ClaudeBrowserPreparationError);
    expect(fixture.access.list().some(({ id }) => id === browser.id)).toBe(false);
    expect(fixture.spawns).toEqual([]);
  });
});

describe('selected Claude browser login', () => {
  it('leaves the default browser environment intact, including an inherited BROWSER and TMPDIR', async () => {
    const fixture = rig();
    fixture.add('Safari');
    const browser = (await fixture.access.load())[0]!;
    const handle = await fixture.access.login(browser.id, fixture.options);
    expect(fixture.spawns[0]![2].env).toBe(fixture.options.env);
    expect(fixture.spawns[0]![2].env['BROWSER']).toBe('/fixture/original');
    expect(fixture.spawns[0]![2].env['TMPDIR']).toBe('/fixture/unchanged');
    expect(fixture.opened).toEqual([]);
    fixture.child.emit('exit', 0, null);
    expect(await handle.completed).toBe('exited');
  });

  it('sets only BROWSER, quotes the validated app path, and never opens the printed URL automatically', async () => {
    const fixture = rig();
    fixture.add('Safari');
    const path = fixture.add("Browser's $(fixture)");
    const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
    const handle = await fixture.access.login(browser.id, fixture.options);
    const env = fixture.spawns[0]![2].env;
    const launcher = env['BROWSER']!;
    expect(env).toEqual({ ...fixture.options.env, BROWSER: launcher });
    expect(fixture.options.env['BROWSER']).toBe('/fixture/original');
    expect(statSync(dirname(launcher)).mode & 0o777).toBe(0o700);
    expect(statSync(launcher).mode & 0o777).toBe(0o700);
    expect(readFileSync(launcher, 'utf8')).toBe(`#!/bin/sh\nexec /usr/bin/open -a '${path.replaceAll("'", "'\\''")}' "$@"\n`);
    expect(fixture.opened).toEqual([]);
    await handle.openPage();
    expect(fixture.opened).toEqual([{ path, url: handle.authUrl }]);
    fixture.child.emit('exit', 0, null);
    expect(await handle.completed).toBe('exited');
    expect(existsSync(dirname(launcher))).toBe(false);
  });

  it('keeps the launcher alive after cancellation settles until the child really exits', async () => {
    const fixture = rig();
    fixture.add('Safari');
    fixture.add('Chrome');
    const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
    const handle = await fixture.access.login(browser.id, fixture.options);
    const launcher = fixture.spawns[0]![2].env['BROWSER']!;
    handle.cancel();
    expect(await handle.completed).toBe('cancelled');
    expect(existsSync(launcher)).toBe(true);
    fixture.child.emit('exit', null, 'SIGTERM');
    expect(existsSync(dirname(launcher))).toBe(false);
  });

  it('keeps an abandoned login launcher until the child exits', async () => {
    const fixture = rig();
    fixture.add('Safari');
    fixture.add('Chrome');
    const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
    const handle = await fixture.access.login(browser.id, { ...fixture.options, abandonMs: 1 });
    const launcher = fixture.spawns[0]![2].env['BROWSER']!;
    expect(await handle.completed).toBe('abandoned');
    expect(existsSync(launcher)).toBe(true);
    fixture.child.emit('exit', null, 'SIGKILL');
    expect(existsSync(dirname(launcher))).toBe(false);
  });

  it('cleans a synchronous spawn failure and an asynchronous spawn error', async () => {
    const fixture = rig();
    fixture.add('Safari');
    fixture.add('Chrome');
    const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
    let launcher = '';
    await expect(fixture.access.login(browser.id, { ...fixture.options, spawn: (_bin, _args, options) => {
      launcher = options.env['BROWSER']!;
      throw new Error('fixture spawn failed');
    } })).rejects.toThrow();
    expect(existsSync(dirname(launcher))).toBe(false);
    const pending = fixture.access.login(browser.id, { ...fixture.options, spawn: (_bin, _args, options) => {
      launcher = options.env['BROWSER']!;
      queueMicrotask(() => fixture.child.emit('error', new Error('fixture ENOENT')));
      return fixture.child;
    } });
    await expect(pending).rejects.toThrow();
    expect(existsSync(dirname(launcher))).toBe(false);
  });

  it('retains the launcher on early startup rejection and removes it on the eventual child exit', async () => {
    const fixture = rig();
    fixture.add('Safari');
    fixture.add('Chrome');
    const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
    const pending = fixture.access.login(browser.id, { ...fixture.options, spawn: (...args) => {
      fixture.spawns.push(args);
      queueMicrotask(() => fixture.child.stdout.write('visit: https://untrusted.invalid/oauth\n'));
      return fixture.child;
    } });
    await expect(pending).rejects.toThrow();
    const launcher = fixture.spawns[0]![2].env['BROWSER']!;
    expect(existsSync(launcher)).toBe(true);
    fixture.child.emit('exit', 1, null);
    expect(existsSync(dirname(launcher))).toBe(false);
  });

  it('propagates reopen failure without leaking launcher lifetime and permits a fresh retry', async () => {
    const fixture = rig();
    fixture.add('Safari');
    fixture.add('Chrome');
    const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
    const first = await fixture.access.login(browser.id, fixture.options);
    const firstLauncher = fixture.spawns[0]![2].env['BROWSER']!;
    fixture.failOpener();
    await expect(first.openPage()).rejects.toThrow('fixture opener failed');
    expect(existsSync(firstLauncher)).toBe(true);
    fixture.child.emit('exit', 1, null);
    expect(existsSync(dirname(firstLauncher))).toBe(false);
    const second = await fixture.access.login(browser.id, fixture.options);
    const secondLauncher = fixture.spawns[1]![2].env['BROWSER']!;
    expect(secondLauncher).not.toBe(firstLauncher);
    second.cancel();
    fixture.child.emit('exit', null, 'SIGTERM');
    expect(existsSync(dirname(secondLauncher))).toBe(false);
  });

  it('STUDIO_CLAUDE_OPEN=0 suppresses both the CLI launcher and reopening', async () => {
    const previous = process.env['STUDIO_CLAUDE_OPEN'];
    process.env['STUDIO_CLAUDE_OPEN'] = '0';
    try {
      const fixture = rig();
      fixture.add('Safari');
      fixture.add('Chrome');
      const browser = (await fixture.access.load()).find(({ isDefault }) => !isDefault)!;
      const handle = await fixture.access.login(browser.id, fixture.options);
      expect(readFileSync(fixture.spawns[0]![2].env['BROWSER']!, 'utf8')).toBe('#!/bin/sh\nexit 0\n');
      await handle.openPage();
      expect(fixture.opened).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env['STUDIO_CLAUDE_OPEN'];
      else process.env['STUDIO_CLAUDE_OPEN'] = previous;
    }
  });
});
