import { mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import type { WindowRecord } from '@studio/events';
import { pathSpellings } from '../lib/canonical-path.js';

const { setLocation, readWindows, writeWindows, forgetProjectLocation, flushLocation, resetLocationCache } = await import('./state.js');

const savedState = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedState === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedState;
  cleanupTempFixtures();
});

const REPO_ID = 'github.com/fixture/react-project-v1';

let stateRoot: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'location' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetLocationCache();
});

const locationFile = (): string => join(stateRoot, 'location.json');

function writeStored(raw: string): void {
  writeFileSync(locationFile(), raw);
  resetLocationCache();
}

function storeVersion1(data: unknown): void {
  writeStored(JSON.stringify({ version: 1, data }));
}

const storedEnvelope = (): { version: number; data: unknown } =>
  JSON.parse(readFileSync(locationFile(), 'utf8')) as { version: number; data: unknown };

const quarantined = (): string[] => readdirSync(stateRoot).filter((name) => name.includes('.corrupt-'));

const tab = (name: string): { workspacePath: string; repoIdentity: string } => ({
  workspacePath: `/fixture/workspaces/${name}`,
  repoIdentity: `github.com/fixture/${name}`,
});

describe('migrating the v1 record to the windowed set (ONL-2208)', () => {
  it('wraps a v1 projects record and leaves it with no windows', () => {
    storeVersion1({ kind: 'projects' });

    expect(readWindows()).toEqual([]);
    expect(storedEnvelope()).toEqual({ version: 2, data: { current: { kind: 'projects' }, windows: [] } });
  });

  it('preserves a v1 project record verbatim', () => {
    storeVersion1({ kind: 'project', repoIdentity: REPO_ID, workspacePath: '/tmp/teal-skylark' });

    readWindows();

    expect(storedEnvelope().data).toEqual({
      current: { kind: 'project', repoIdentity: REPO_ID, workspacePath: '/tmp/teal-skylark' },
      windows: [],
    });
  });

  it('quarantines a v1 envelope with no shape rather than persisting it (ONL-2182)', () => {
    storeVersion1(null);

    expect(readWindows()).toEqual([]);
    expect(quarantined()).toHaveLength(1);
  });

  it('keeps a newer version unchanged, even one shaped like v1', () => {
    const bytes = JSON.stringify({ version: 3, data: { kind: 'projects' } });
    writeStored(bytes);

    expect(readWindows()).toEqual([]);
    expect(quarantined()).toHaveLength(0);
    expect(readFileSync(join(stateRoot, 'location.json'), 'utf8')).toBe(bytes);
  });

});

describe('the windowed ordered set', () => {
  it('round-trips tab order across a reread', () => {
    const record: WindowRecord = {
      tabs: [tab('one'), tab('two'), tab('three')],
      active: { kind: 'tab', workspacePath: tab('two').workspacePath },
    };
    writeWindows([record]);
    flushLocation();
    resetLocationCache();

    expect(readWindows()).toEqual([record]);
  });

  it('keeps an active state that names no open tab — home is not a member', () => {
    const record: WindowRecord = { tabs: [tab('one')], active: { kind: 'home' } };
    writeWindows([record]);
    flushLocation();
    resetLocationCache();

    expect(readWindows()[0]?.active).toEqual({ kind: 'home' });
  });

  it('keeps an active project absent from its own tab list', () => {
    const record: WindowRecord = {
      tabs: [tab('one')],
      active: { kind: 'tab', workspacePath: tab('gone').workspacePath },
    };
    writeWindows([record]);
    flushLocation();
    resetLocationCache();

    expect(readWindows()[0]?.active).toEqual({ kind: 'tab', workspacePath: tab('gone').workspacePath });
  });

  it('drops a malformed tab entry without dropping its window', () => {
    writeStored(
      JSON.stringify({
        version: 2,
        data: { current: { kind: 'projects' }, windows: [{ tabs: [tab('one'), { workspacePath: 7 }], active: null }] },
      }),
    );

    expect(readWindows()).toEqual([{ tabs: [tab('one')], active: { kind: 'home' } }]);
  });

  it('leaves the current location alone when the windows change', () => {
    setLocation({ kind: 'project', repoIdentity: REPO_ID });
    writeWindows([{ tabs: [tab('one')], active: { kind: 'home' } }]);
    flushLocation();
    resetLocationCache();

    expect(storedEnvelope().data).toMatchObject({ current: { kind: 'project', repoIdentity: REPO_ID } });
  });
});

describe('forgetting a Project location (ONL-2702)', () => {
  it('removes only its tabs and active references across windows, preserving the current sibling', () => {
    const removed = tab('removed');
    const kept = { ...tab('kept'), repoIdentity: removed.repoIdentity };
    const other = tab('other');
    const current = { kind: 'project' as const, ...kept };
    setLocation(current);
    writeWindows([
      { tabs: [other, removed, kept], active: { kind: 'tab', workspacePath: kept.workspacePath } },
      { tabs: [removed], active: { kind: 'tab', workspacePath: removed.workspacePath } },
      { tabs: [other], active: { kind: 'tab', workspacePath: removed.workspacePath } },
      { tabs: [kept], active: { kind: 'home' } },
    ]);

    forgetProjectLocation(removed.workspacePath);

    expect(storedEnvelope().data).toEqual({ current, windows: [
      { tabs: [other, kept], active: { kind: 'tab', workspacePath: kept.workspacePath } },
      { tabs: [], active: { kind: 'home' } },
      { tabs: [other], active: { kind: 'home' } },
      { tabs: [kept], active: { kind: 'home' } },
    ] });
  });

  it('clears the legacy current field even after the window projection has already dropped its tab', () => {
    const removed = tab('legacy');
    const kept = tab('kept');
    setLocation({ kind: 'project', ...removed });
    writeWindows([{ tabs: [kept], active: { kind: 'home' } }]);
    flushLocation();

    forgetProjectLocation(removed.workspacePath);

    expect(storedEnvelope().data).toEqual({
      current: { kind: 'projects' }, windows: [{ tabs: [kept], active: { kind: 'home' } }],
    });
  });

  it('flushes pending changes immediately and rejects late writers without sealing unrelated Projects', async () => {
    const removed = tab('pending');
    const kept = tab('kept');
    const staleWindow: WindowRecord = { tabs: [removed, kept], active: { kind: 'tab', workspacePath: removed.workspacePath } };
    setLocation({ kind: 'project', ...removed });
    writeWindows([staleWindow]);

    forgetProjectLocation(removed.workspacePath);

    const cleaned = { current: { kind: 'projects' }, windows: [{ tabs: [kept], active: { kind: 'home' } }] };
    expect(storedEnvelope().data).toEqual(cleaned);
    setLocation({ kind: 'project', ...removed });
    writeWindows([staleWindow]);
    await Bun.sleep(450);
    expect(storedEnvelope().data).toEqual(cleaned);
    const current = { kind: 'project' as const, ...kept };
    const keptWindow: WindowRecord = { tabs: [kept], active: { kind: 'tab', workspacePath: kept.workspacePath } };
    setLocation(current);
    writeWindows([keptWindow]);
    flushLocation();
    expect(storedEnvelope().data).toEqual({ current, windows: [keptWindow] });
  });

  it('uses pre-deletion spellings to remove canonical and lexical paths without prefix-matching a sibling', () => {
    const worktree = join(stateRoot, 'removed');
    mkdirSync(worktree);
    const alias = join(stateRoot, 'alias');
    symlinkSync(worktree, alias);
    const spellings = pathSpellings(alias);
    const canonical = { ...tab('canonical'), workspacePath: realpathSync(alias) };
    const lexical = { ...tab('lexical'), workspacePath: alias };
    const kept = { ...tab('kept'), workspacePath: `${alias}-kept` };
    setLocation({ kind: 'project', ...lexical });
    writeWindows([{ tabs: [lexical, canonical, kept], active: { kind: 'tab', workspacePath: `${alias}/.` } }]);
    flushLocation();
    rmSync(worktree, { recursive: true, force: true });

    forgetProjectLocation(alias, spellings);

    expect(storedEnvelope().data).toEqual({
      current: { kind: 'projects' }, windows: [{ tabs: [kept], active: { kind: 'home' } }],
    });
  });

  it('persists the removal across cache reset and allows a new Project to reuse that path', () => {
    const removed = tab('reused');
    setLocation({ kind: 'project', ...removed });
    writeWindows([{ tabs: [removed], active: { kind: 'home' } }]);
    forgetProjectLocation(removed.workspacePath);
    resetLocationCache();

    expect(readWindows()).toEqual([{ tabs: [], active: { kind: 'home' } }]);
    setLocation({ kind: 'project', ...removed });
    flushLocation();
    expect(storedEnvelope().data).toMatchObject({ current: { kind: 'project', ...removed } });
  });

  it('never overwrites future bytes, even when the older projection is cached and writers arrive late', () => {
    const removed = tab('future');
    setLocation({ kind: 'project', ...removed });
    flushLocation();
    const bytes = '{"version":99,"data":{"futureLocation":"untouched"}}\n';
    writeFileSync(locationFile(), bytes);

    forgetProjectLocation(removed.workspacePath);
    setLocation({ kind: 'project', ...removed });
    writeWindows([{ tabs: [removed], active: { kind: 'home' } }]);
    flushLocation();

    expect(readFileSync(locationFile(), 'utf8')).toBe(bytes);
    expect(quarantined()).toEqual([]);
  });

  it('forgets a migrated v1 current location immediately', () => {
    const removed = tab('migrated');
    storeVersion1({ kind: 'project', ...removed });

    forgetProjectLocation(removed.workspacePath);

    expect(storedEnvelope()).toEqual({ version: 2, data: { current: { kind: 'projects' }, windows: [] } });
  });
});
