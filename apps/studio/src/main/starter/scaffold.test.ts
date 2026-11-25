import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outcome } from '@studio/fixtures';
import { isFrameworkDefaultPort, pickStarterPort, STARTER_PORT_RANGE } from './port.js';
import { REACT_PINS, reactFiles } from './adapters/react.js';
import { STATIC_FILES } from './adapters/static.js';
import { STARTER_BACKSTOP_JS, STARTER_SERVER_FILE, writeScaffold } from './scaffold.js';

test("no Studio-internal path or product name reaches the user's files, from either adapter", () => {
  for (const content of [...Object.values(STATIC_FILES), ...Object.values(reactFiles({ name: 'bun', version: '1.3.14' }))]) {
    expect(content).not.toMatch(/apps\/studio|STUDIO_|onlook/i);
  }
});

describe('the react adapter', () => {
  const files = reactFiles({ name: 'bun', version: '1.3.14' });

  test('every pin is exact and node_modules never enters git', () => {
    const manifest = JSON.parse(files['package.json']!) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      packageManager?: string;
    };
    for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version).toBe(REACT_PINS[name as keyof typeof REACT_PINS]);
    }
    expect(manifest.packageManager).toBe('bun@1.3.14');
    expect(files['.gitignore']).toContain('node_modules');
  });

  test('packageManager is written only in versioned form', () => {
    const bare = JSON.parse(reactFiles({ name: 'pnpm' })['package.json']!) as { packageManager?: string };
    expect(bare.packageManager).toBeUndefined();
    const none = JSON.parse(reactFiles()['package.json']!) as { packageManager?: string };
    expect(none.packageManager).toBeUndefined();
  });

  test('the router plugin is registered before the React plugin', () => {
    const config = files['vite.config.ts']!;
    expect(config.indexOf('tanstackRouter(')).toBeGreaterThan(-1);
    expect(config.indexOf('tanstackRouter(')).toBeLessThan(config.indexOf('react()'));
  });

  test('server.mjs parses under Node and prints the ready line the runner parses', () => {
    const reactDir = mkdtempSync(join(tmpdir(), 'starter-react-'));
    try {
      writeScaffold(reactDir, files);
      // Node from PATH, not `process.execPath`: under Bun that is Bun.
      const check = spawnSync('node', ['--check', join(reactDir, STARTER_SERVER_FILE)], { encoding: 'utf8' });
      expect(check.stderr).toBe('');
      expect(check.status).toBe(0);
    } finally {
      rmSync(reactDir, { recursive: true, force: true });
    }
    expect(files[STARTER_SERVER_FILE]).toContain("'starter ready http://127.0.0.1:' + PORT");
  });
});

describe('pickStarterPort', () => {
  const allFree = async (): Promise<boolean> => true;

  test('never answers a framework default, even when preferred', async () => {
    for (const port of [3000, 5173, 8080, 4321, 8000]) {
      expect(isFrameworkDefaultPort(port)).toBe(true);
      expect(await pickStarterPort(port, allFree)).not.toBe(port);
    }
    const first = await pickStarterPort(undefined, allFree);
    expect(first).toBe(STARTER_PORT_RANGE.first);
    expect(isFrameworkDefaultPort(first)).toBe(false);
  });

  test('returns the preferred port when it is free, the next free one when it is not', async () => {
    expect(await pickStarterPort(4750, allFree)).toBe(4750);
    const busy = new Set([4750, STARTER_PORT_RANGE.first]);
    const isFree = async (port: number): Promise<boolean> => !busy.has(port);
    expect(await pickStarterPort(4750, isFree)).toBe(STARTER_PORT_RANGE.first + 1);
  });

  test('throws when nothing in the range is free', async () => {
    expect(await outcome(pickStarterPort(undefined, async () => false))).toThrow();
  });
});

function backstop() {
  const parentPort = new EventEmitter();
  let timeout: (() => void) | undefined;
  let parentError: string | undefined;
  const exits: number[] = [];
  const probes: number[] = [];
  const windows: number[] = [];
  const child = {
    ppid: 1234,
    parentPort,
    kill(pid: number, signal: number) {
      expect(signal).toBe(0);
      probes.push(pid);
      if (parentError) throw Object.assign(new Error('parent probe'), { code: parentError });
    },
    exit(code: number) { exits.push(code); },
  };
  runInNewContext(STARTER_BACKSTOP_JS, {
    process: child,
    setTimeout(callback: () => void, windowMs: number) { timeout = callback; windows.push(windowMs); return callback; },
    clearTimeout() {},
  });
  return {
    child, exits, probes, windows,
    expire() { timeout?.(); },
    failProbe(code: string) { parentError = code; },
    heartbeat(windowMs: number) { parentPort.emit('message', { data: { type: 'heartbeat', windowMs } }); },
  };
}

it('keeps the preview alive when main misses repeated heartbeat windows', () => {
  const guard = backstop();
  guard.heartbeat(5000);
  guard.expire();
  guard.expire();
  expect(guard.exits).toEqual([]);
  expect(guard.probes).toEqual([1234, 1234]);
  expect(guard.windows).toEqual([15000, 5000, 5000, 5000]);
});

it('keeps the preview alive before the first heartbeat and accepts a later background window', () => {
  const guard = backstop();
  guard.expire();
  guard.heartbeat(50_000);
  expect(guard.exits).toEqual([]);
  expect(guard.probes).toEqual([1234]);
  expect(guard.windows).toEqual([15000, 15000, 50_000]);
});

it('reaps the preview only after the original parent no longer exists', () => {
  const guard = backstop();
  guard.child.ppid = 1;
  guard.failProbe('ESRCH');
  guard.expire();
  expect(guard.probes).toEqual([1234]);
  expect(guard.exits).toEqual([3]);
});

it('does not mistake a denied parent probe for a dead parent', () => {
  const guard = backstop();
  guard.failProbe('EPERM');
  guard.expire();
  expect(guard.exits).toEqual([]);
  expect(guard.windows).toEqual([15000, 15000]);
});
