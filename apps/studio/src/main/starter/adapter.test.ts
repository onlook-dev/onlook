import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'bun:test';
import { adapterForWorktree, chooseAdapter, isStudioServerFile, managerOnPath, RETIRED_STATIC_SERVER_SHA256, starterBriefingFor, starterModulePath } from './adapter.js';
import { REACT_ADAPTER, reactFiles } from './adapters/react.js';
import { STATIC_ADAPTER, STATIC_FILES, writeStaticServer } from './adapters/static.js';
import { STARTER_SERVER_FILE, writeScaffold } from './scaffold.js';

describe('isStudioServerFile', () => {
  test('both templates are Studio\'s; one edited byte is not — the host forks nothing else unattended', () => {
    const statics = STATIC_FILES[STARTER_SERVER_FILE] ?? '';
    const react = reactFiles()[STARTER_SERVER_FILE] ?? '';
    expect(isStudioServerFile(statics)).toBe(true);
    expect(isStudioServerFile(react)).toBe(true);
    expect(isStudioServerFile(reactFiles({ name: 'pnpm', version: '9.0.0' })[STARTER_SERVER_FILE] ?? '')).toBe(true);
    expect(isStudioServerFile(`${statics}\n`)).toBe(false);
    expect(isStudioServerFile(react.replace('logLevel', 'loglevel'))).toBe(false);
    expect(isStudioServerFile('')).toBe(false);
  });

  test('every static server.mjs a released build scaffolded stays Studio\'s after the template moves on, and every retired hash has its bytes in fixtures/', () => {
    const dir = join(import.meta.dir, 'fixtures');
    const names = readdirSync(dir).filter((name) => name.startsWith('static-server-'));
    const current = createHash('sha256').update(STATIC_FILES[STARTER_SERVER_FILE] ?? '').digest('hex');
    // A hash with no fixture would retire a template nothing can replay, so the count carries that direction.
    expect(names.length).toBe(RETIRED_STATIC_SERVER_SHA256.size);
    for (const name of names) {
      const retired = readFileSync(join(dir, name), 'utf8');
      const hash = createHash('sha256').update(retired).digest('hex');
      expect(RETIRED_STATIC_SERVER_SHA256.has(hash)).toBe(true);
      expect(hash).not.toBe(current);
      expect(isStudioServerFile(retired)).toBe(true);
      expect(isStudioServerFile(`${retired}\n`)).toBe(false);
    }
  });
  test('the static server template changed: projects scaffolded with the old one stop being recognised until its hash joins RETIRED_STATIC_SERVER_SHA256 and its bytes join fixtures/', () => {
    const current = createHash('sha256').update(STATIC_FILES[STARTER_SERVER_FILE] ?? '').digest('hex');
    expect(current).toBe('bf9e64899210e688599948b0914623043e4cb0cb17149000c6adf9ba0ba026d4');
  });
});

const onPath = (present: readonly string[]) => (path: string) => present.includes(path);

describe('chooseAdapter', () => {
  const env = async () => ({ PATH: '/opt/a:/opt/b' });
  const version = async (command: string) => (command === 'bun' ? '1.3.14' : undefined);

  test('static ships: with every manager on PATH and no override, the choice is static and no manager', async () => {
    const choice = await chooseAdapter({ env, isExecutable: onPath(['/opt/b/npm', '/opt/a/bun']), version, override: undefined });
    expect(choice.adapter.id).toBe('static');
    expect(choice.manager).toBeUndefined();
  });

  test('the react override prefers bun over npm when both are on PATH, and carries its version', async () => {
    const choice = await chooseAdapter({ env, isExecutable: onPath(['/opt/b/npm', '/opt/a/bun']), version, override: 'react' });
    expect(choice.adapter.id).toBe('react');
    expect(choice.manager).toEqual({ name: 'bun', version: '1.3.14' });
  });

  test('the react override with npm alone answers a bare manager when --version says nothing', async () => {
    const choice = await chooseAdapter({ env, isExecutable: onPath(['/opt/b/npm']), version, override: 'react' });
    expect(choice.adapter.id).toBe('react');
    expect(choice.manager).toEqual({ name: 'npm' });
  });


  test('a directory named after a manager is not an executable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'starter-path-'));
    try {
      mkdirSync(join(dir, 'bun'));
      expect(managerOnPath({ PATH: dir })).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the override forces static even with a manager present, and react even without one', async () => {
    const forcedStatic = await chooseAdapter({ env, isExecutable: onPath(['/opt/a/bun']), version, override: 'static' });
    expect(forcedStatic.adapter.id).toBe('static');
    const forcedReact = await chooseAdapter({ env, isExecutable: onPath([]), version, override: 'react' });
    expect(forcedReact.adapter.id).toBe('react');
    expect(forcedReact.manager).toBeUndefined();
  });
});

describe('adapterForWorktree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'starter-adapter-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('reads static, react, or none from the files only each adapter writes', () => {
    const none = join(dir, 'none');
    mkdirSync(none);
    expect(adapterForWorktree(none)).toBeUndefined();

    const isStatic = join(dir, 'static');
    mkdirSync(isStatic);
    writeScaffold(isStatic, STATIC_FILES);
    expect(adapterForWorktree(isStatic)?.id).toBe('static');

    const isReact = join(dir, 'react');
    mkdirSync(isReact);
    writeScaffold(isReact, reactFiles());
    expect(adapterForWorktree(isReact)?.id).toBe('react');
  });

  test('starterBriefingFor briefs a session by the adapter its worktree carries, and a bare worktree as static', () => {
    const isStatic = join(dir, 'brief-static');
    mkdirSync(isStatic);
    writeScaffold(isStatic, STATIC_FILES);
    expect(starterBriefingFor(isStatic, 4712)).toBe(STATIC_ADAPTER.briefing(4712));

    const isReact = join(dir, 'brief-react');
    mkdirSync(isReact);
    writeScaffold(isReact, reactFiles());
    expect(starterBriefingFor(isReact, 4712)).toBe(REACT_ADAPTER.briefing(4712));

    const bare = join(dir, 'brief-bare');
    mkdirSync(bare);
    expect(starterBriefingFor(bare, 4712)).toBe(STATIC_ADAPTER.briefing(4712));
  });

  test("a static worktree runs Studio's copy of the server; a react one runs its own, which resolves vite from beside it", () => {
    const isStatic = join(dir, 'module-static');
    mkdirSync(isStatic);
    writeScaffold(isStatic, STATIC_FILES);
    expect(starterModulePath(isStatic, () => '/studio/copy/server.mjs')).toBe('/studio/copy/server.mjs');

    const isReact = join(dir, 'module-react');
    mkdirSync(isReact);
    writeScaffold(isReact, reactFiles());
    expect(starterModulePath(isReact, () => '/studio/copy/server.mjs')).toBe(join(isReact, STARTER_SERVER_FILE));
  });

  test('the copy is rewritten from the template, over one that differs', () => {
    const copy = join(dir, 'copy');
    mkdirSync(copy);
    writeFileSync(join(copy, STARTER_SERVER_FILE), '// stale\n');
    const path = writeStaticServer(copy);
    expect(path).toBe(join(copy, STARTER_SERVER_FILE));
    expect(readFileSync(path, 'utf8')).toBe(STATIC_FILES[STARTER_SERVER_FILE]!);
  });

  test('a static project mid-conversion to Vite is still static', () => {
    const converting = join(dir, 'converting');
    mkdirSync(converting);
    writeScaffold(converting, STATIC_FILES);
    writeFileSync(join(converting, 'vite.config.ts'), 'export default {}\n');
    expect(adapterForWorktree(converting)?.id).toBe('static');
  });
});
