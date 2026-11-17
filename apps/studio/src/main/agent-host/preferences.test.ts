import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const {
  catalogFor,
  defaultPreference,
  forgetAllowRules,
  forgetProjectPreferences,
  preferenceFor,
  rememberAllowRules,
  rememberCatalog,
  rememberDefault,
  rememberEffortChoice,
  rememberModelChoice,
  rememberPermissionMode,
  resetPreferencesCache,
  seedPreference,
  usableAllowRules,
} = await import('./preferences.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

let stateRoot: string;
let a: string;
let b: string;
let c: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'chat-preferences' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetPreferencesCache();
  // Real directories: keys canonicalise through the filesystem.
  a = join(stateRoot, 'a');
  b = join(stateRoot, 'b');
  c = join(stateRoot, 'c');
  for (const dir of [a, b, c]) mkdirSync(dir, { recursive: true });
});

function plant(data: unknown, version = 2): void {
  writeFileSync(
    join(stateRoot, 'chat-preferences.json'),
    `${JSON.stringify({ version, data })}\n`,
  );
}

it('forgets and seals both removed Project drawers without clearing defaults or sibling choices', () => {
  rememberDefault('claude', { model: 'default-model' });
  for (const harness of ['claude', 'appserver'] as const) {
    rememberModelChoice(a, harness, 'removed');
    rememberModelChoice(b, harness, 'kept');
  }
  forgetProjectPreferences(a);
  for (const harness of ['claude', 'appserver'] as const) {
    rememberModelChoice(a, harness, 'late');
    expect(seedPreference(a, harness)).toBeUndefined();
    expect(preferenceFor(a, harness)).toBeUndefined();
    expect(preferenceFor(b, harness)?.model).toBe('kept');
  }
  expect(defaultPreference('claude').model).toBe('default-model');
  resetPreferencesCache();
  expect(preferenceFor(a, 'claude')).toBeUndefined();
  expect(preferenceFor(b, 'claude')?.model).toBe('kept');
});

describe('preferenceFor', () => {
  it('answers nothing on a fresh install, and nothing for the other runtime', () => {
    expect(preferenceFor(a, 'claude')).toBeUndefined();
    rememberModelChoice(a, 'claude', 'opus');
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'opus' });
    expect(preferenceFor(a, 'appserver')).toBeUndefined();
  });

  it('never adopts a seed — a resumed conversation keeps its own model', () => {
    rememberModelChoice(a, 'claude', 'x');
    expect(preferenceFor(b, 'claude')).toBeUndefined();
    expect(preferenceFor(b, 'claude')).toBeUndefined();
  });
});

describe('seedPreference', () => {
  it('seeds a first session from the settings default and never re-seeds one that chose', () => {
    rememberDefault('claude', { model: 'y' });
    rememberModelChoice(a, 'claude', 'x');

    expect(seedPreference(a, 'claude')).toEqual({ model: 'x' });
    expect(seedPreference(c, 'claude')).toEqual({ model: 'y' });
    expect(preferenceFor(c, 'claude')).toEqual({ model: 'y' });

    rememberDefault('claude', { model: 'z' });
    expect(seedPreference(c, 'claude')).toEqual({ model: 'y' });
    expect(seedPreference(a, 'claude')).toEqual({ model: 'x' });
    expect(seedPreference(b, 'claude')).toEqual({ model: 'z' });
  });

  it('resolves whole records: a default-effort project is not re-seeded by a later default effort', () => {
    rememberDefault('claude', { model: 'x' });
    expect(seedPreference(b, 'claude')).toEqual({ model: 'x' });
    rememberEffortChoice(b, 'claude', 'max');

    rememberDefault('claude', { effort: 'high' });
    expect(seedPreference(b, 'claude')).toEqual({ model: 'x', effort: 'max' });
    expect(seedPreference(c, 'claude')).toEqual({ model: 'x', effort: 'high' });
  });

  it('answers nothing when no default has been set', () => {
    rememberModelChoice(a, 'claude', 'x');
    expect(seedPreference(b, 'claude')).toBeUndefined();
    expect(preferenceFor(b, 'claude')).toBeUndefined();
  });
});

describe('remembering a choice', () => {
  it('clearing the effort drops the field from the record', () => {
    rememberEffortChoice(a, 'claude', 'high');
    expect(preferenceFor(a, 'claude')).toEqual({ effort: 'high' });
    rememberEffortChoice(a, 'claude', null);
    expect(preferenceFor(a, 'claude')).toEqual({});
  });

  it('the permission mode is remembered per project and runtime, beside the model (ONL-2190)', () => {
    rememberPermissionMode(a, 'claude', 'plan');
    rememberModelChoice(a, 'claude', 'opus');
    expect(preferenceFor(a, 'claude')).toEqual({ permissionMode: 'plan', model: 'opus' });
    // A record written before the field existed reads `undefined`, so the backend's own default wins.
    expect(preferenceFor(b, 'claude')?.permissionMode).toBeUndefined();
    expect(preferenceFor(a, 'appserver')?.permissionMode).toBeUndefined();
  });

  it('an always-allow is kept per project, deduped, and survives a relaunch (ONL-2933)', () => {
    rememberAllowRules(a, 'claude', ['Bash(npm run build)']);
    rememberAllowRules(a, 'claude', ['Bash(npm run build)', 'Bash(touch probe.txt)', '']);
    resetPreferencesCache();

    expect(preferenceFor(a, 'claude')?.allowRules).toEqual([
      'Bash(npm run build)',
      'Bash(touch probe.txt)',
    ]);
    // A project that granted nothing carries no list, and the other runtime keeps its own.
    expect(preferenceFor(b, 'claude')?.allowRules).toBeUndefined();
    expect(preferenceFor(a, 'appserver')?.allowRules).toBeUndefined();

    // Nothing to remember leaves the record alone, so a tool-only grant writes no empty list.
    rememberAllowRules(b, 'claude', []);
    expect(preferenceFor(b, 'claude')).toBeUndefined();
  });

  it('writes nothing when every rule is already held, like the other remembered values', () => {
    rememberAllowRules(a, 'claude', ['Bash(npm run build)']);
    const written = statSync(join(stateRoot, 'chat-preferences.json')).mtimeMs;
    resetPreferencesCache();

    rememberAllowRules(a, 'claude', ['Bash(npm run build)']);

    expect(statSync(join(stateRoot, 'chat-preferences.json')).mtimeMs).toBe(written);
  });

  it('bounds the always-allow list, keeping the newest, because every spawn carries it', () => {
    rememberAllowRules(a, 'claude', Array.from({ length: 120 }, (_, i) => `Bash(cmd ${String(i)})`));
    const kept = preferenceFor(a, 'claude')?.allowRules ?? [];
    expect(kept).toHaveLength(100);
    expect(kept.at(-1)).toBe('Bash(cmd 119)');
  });

  it('drops what a hand-edited record could hold, because one bad rule sinks the settings block', () => {
    expect(usableAllowRules(['Bash(npm run build)'])).toEqual(['Bash(npm run build)']);
    expect(usableAllowRules(undefined)).toEqual([]);
    expect(usableAllowRules('Bash(npm run build)' as unknown as unknown[])).toEqual([]);
    expect(usableAllowRules([42, null, '', { toolName: 'Bash' }, 'Bash(ls)'])).toEqual(['Bash(ls)']);
    expect(usableAllowRules(Array.from({ length: 120 }, (_, i) => `Bash(cmd ${String(i)})`))).toHaveLength(
      100,
    );
  });

  it('forgets every always-allow this project holds, and leaves its other choices (ONL-2933)', () => {
    rememberAllowRules(a, 'claude', ['Bash(npm run build)']);
    rememberModelChoice(a, 'claude', 'sonnet');
    rememberAllowRules(b, 'claude', ['Bash(ls)']);

    forgetAllowRules(a, 'claude');
    resetPreferencesCache();

    expect(preferenceFor(a, 'claude')?.allowRules).toBeUndefined();
    expect(preferenceFor(a, 'claude')?.model).toBe('sonnet');
    // One project at a time, and a project that holds none is left alone rather than written.
    expect(preferenceFor(b, 'claude')?.allowRules).toEqual(['Bash(ls)']);
    const written = statSync(join(stateRoot, 'chat-preferences.json')).mtimeMs;
    forgetAllowRules(a, 'claude');
    expect(statSync(join(stateRoot, 'chat-preferences.json')).mtimeMs).toBe(written);
  });

  it('a removed Project takes its always-allows with it', () => {
    rememberAllowRules(a, 'claude', ['Bash(npm run build)']);
    forgetProjectPreferences(a);
    resetPreferencesCache();
    expect(preferenceFor(a, 'claude')).toBeUndefined();
  });

  it('a composer pick is this project only — the default and the next project are untouched', () => {
    rememberDefault('claude', { model: 'opus' });
    rememberModelChoice(a, 'claude', 'sonnet');
    rememberEffortChoice(a, 'claude', 'max');

    expect(defaultPreference('claude')).toEqual({ model: 'opus' });
    expect(seedPreference(b, 'claude')).toEqual({ model: 'opus' });
  });

  it('keeps the two runtimes apart — their model names are not interchangeable', () => {
    rememberModelChoice(a, 'claude', 'opus');
    rememberModelChoice(a, 'appserver', 'gpt');
    rememberDefault('claude', { model: 'opus' });
    rememberDefault('appserver', { model: 'gpt' });
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'opus' });
    expect(preferenceFor(a, 'appserver')).toEqual({ model: 'gpt' });
    expect(seedPreference(b, 'claude')).toEqual({ model: 'opus' });
    expect(seedPreference(b, 'appserver')).toEqual({ model: 'gpt' });
  });

  it('survives a cache drop — the values come back from disk', () => {
    rememberModelChoice(a, 'claude', 'opus');
    rememberEffortChoice(a, 'claude', 'high');
    resetPreferencesCache();
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'opus', effort: 'high' });
    const written = JSON.parse(readFileSync(join(stateRoot, 'chat-preferences.json'), 'utf8')) as {
      version: number;
    };
    expect(written.version).toBe(2);
  });

  it('reads a file from a newer build as a fresh install rather than guessing', () => {
    plant({ byWorkspace: {}, defaults: { claude: { model: 'future' } } }, 99);
    expect(preferenceFor(a, 'claude')).toBeUndefined();
    expect(defaultPreference('claude')).toEqual({});
  });

  it('tolerates a version-matched file with a hollow shape, on read and on write', () => {
    plant(null);
    expect(preferenceFor(a, 'claude')).toBeUndefined();
    expect(seedPreference(a, 'claude')).toBeUndefined();
    rememberModelChoice(a, 'claude', 'opus');
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'opus' });

    resetPreferencesCache();
    plant({ byWorkspace: { stray: { model: 'x' } } });
    expect(seedPreference(b, 'claude')).toBeUndefined();
    rememberEffortChoice(b, 'claude', 'high');
    expect(preferenceFor(b, 'claude')).toEqual({ effort: 'high' });
  });

  it('normalises a v2 file that is missing its catalog rather than crashing on it', () => {
    plant({ byWorkspace: {}, defaults: { claude: { model: 'x' } } });
    expect(catalogFor('claude')).toEqual([]);
    expect(defaultPreference('claude')).toEqual({ model: 'x' });
    rememberCatalog('claude', [{ value: 'm', displayName: 'M' }]);
    expect(catalogFor('claude')).toEqual([{ value: 'm', displayName: 'M' }]);
  });
});

describe('the settings default', () => {
  it('writing a default leaves a project that already has a record alone', () => {
    rememberModelChoice(a, 'claude', 'sonnet');
    rememberDefault('claude', { model: 'opus' });
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'sonnet' });
    expect(seedPreference(a, 'claude')).toEqual({ model: 'sonnet' });
  });

  it('patches field by field — an absent field is left alone, a null one is deleted', () => {
    rememberDefault('claude', { model: 'opus', effort: 'high' });
    rememberDefault('claude', { model: 'sonnet' });
    expect(defaultPreference('claude')).toEqual({ model: 'sonnet', effort: 'high' });

    rememberDefault('claude', { effort: null });
    expect(defaultPreference('claude')).toEqual({ model: 'sonnet' });
    expect(seedPreference(b, 'claude')).toEqual({ model: 'sonnet' });

    rememberDefault('claude', { model: null });
    expect(defaultPreference('claude')).toEqual({});
  });

  it('does not cross the runtimes', () => {
    rememberDefault('claude', { model: 'opus' });
    expect(defaultPreference('appserver')).toEqual({});
    rememberDefault('appserver', { model: 'gpt' });
    expect(defaultPreference('claude')).toEqual({ model: 'opus' });
  });
});

describe('the model catalog', () => {
  const one = [{ value: 'a', displayName: 'A' }];
  const two = [{ value: 'b', displayName: 'B' }];

  it('replaces, never appends, and reports whether anything moved', () => {
    expect(catalogFor('claude')).toEqual([]);
    expect(rememberCatalog('claude', one)).toBe(true);
    expect(catalogFor('claude')).toEqual(one);
    expect(rememberCatalog('claude', [{ value: 'a', displayName: 'A' }])).toBe(false);
    expect(rememberCatalog('claude', two)).toBe(true);
    expect(catalogFor('claude')).toEqual(two);
  });

  it('does not cross the runtimes, and survives a cache drop', () => {
    rememberCatalog('claude', one);
    expect(catalogFor('appserver')).toEqual([]);
    rememberCatalog('appserver', two);
    resetPreferencesCache();
    expect(catalogFor('claude')).toEqual(one);
    expect(catalogFor('appserver')).toEqual(two);
  });

  it('is not a preference — a catalog write leaves defaults and records alone', () => {
    rememberDefault('claude', { model: 'opus' });
    rememberModelChoice(a, 'claude', 'sonnet');
    rememberCatalog('claude', one);
    expect(defaultPreference('claude')).toEqual({ model: 'opus' });
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'sonnet' });
  });
});

describe('the v1 migration', () => {
  it("carries v1's latest into v2's defaults, so an existing user's new projects seed as before", () => {
    plant({ byWorkspace: { stray: { model: 'kept' } }, latest: { claude: { model: 'x' } } }, 1);

    expect(defaultPreference('claude')).toEqual({ model: 'x' });
    expect(seedPreference(a, 'claude')).toEqual({ model: 'x' });
    expect(preferenceFor(a, 'claude')).toEqual({ model: 'x' });
    expect(catalogFor('claude')).toEqual([]);

    resetPreferencesCache();
    const written = JSON.parse(readFileSync(join(stateRoot, 'chat-preferences.json'), 'utf8')) as {
      version: number;
      data: Record<string, unknown>;
    };
    expect(written.version).toBe(2);
    expect(written.data['latest']).toBeUndefined();
    expect(written.data['byWorkspace']).toHaveProperty('stray');
    expect(defaultPreference('claude')).toEqual({ model: 'x' });
  });

  it('carries an effort and both runtimes', () => {
    plant(
      { latest: { claude: { model: 'x', effort: 'high' }, appserver: { model: 'gpt' } } },
      1,
    );
    expect(defaultPreference('claude')).toEqual({ model: 'x', effort: 'high' });
    expect(defaultPreference('appserver')).toEqual({ model: 'gpt' });
  });

  it('reads a v1 file with nothing in it as a fresh install', () => {
    plant(null, 1);
    expect(defaultPreference('claude')).toEqual({});
    expect(seedPreference(a, 'claude')).toBeUndefined();
  });
});
