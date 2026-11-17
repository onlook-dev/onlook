import { afterEach, beforeEach, expect, test } from 'bun:test';
import { build, type Rollup } from 'vite';
import { FLAGS, flagOn, rendererFlags, type FlagKey, type FlagResolver } from './index.js';

// Bun reads `import.meta.env` from the process environment, so a `.env` entry would otherwise bake a default into the unbuilt `flagOn`.
const ENV_KEYS = ['STUDIO_FLAGS', 'MAIN_VITE_FLAG_DEFAULTS'] as const;
const saved = ENV_KEYS.map((key) => process.env[key]);

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  ENV_KEYS.forEach((key, index) => {
    const value = saved[index];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

test('GitHub import leaves the renderer flag payload unchanged while off', () => {
  const off = rendererFlags();
  expect(Object.keys(off)).not.toContain('githubImport');
  process.env['STUDIO_FLAGS'] = 'github-import';
  expect(rendererFlags()).toStrictEqual({ ...off, githubImport: true });
});

test('website attribution linking defaults off and supports team-first provider targeting', async () => {
  expect(FLAGS['web-attribution-link'].default).toBe(false);
  expect(flagOn('web-attribution-link')).toBe(false);
  const flags = await builtFlags([]);
  expect(flags.flagOn('web-attribution-link')).toBe(false);
  flags.primeFlags((key) => key === 'web-attribution-link');
  expect(flags.flagOn('web-attribution-link')).toBe(true);
  process.env['STUDIO_FLAGS'] = '-web-attribution-link';
  expect(flags.flagOn('web-attribution-link')).toBe(false);
  const baked = await builtFlags(['web-attribution-link']);
  delete process.env['STUDIO_FLAGS'];
  expect(baked.flagOn('web-attribution-link')).toBe(true);
});

test('touched files defaults off and opts in through the renderer payload', async () => {
  expect(flagOn('touched-files')).toBe(false);
  expect(rendererFlags().touchedFiles).toBeUndefined();
  const flags = await builtFlags([]);
  flags.primeFlags((key) => key === 'touched-files');
  expect(flags.flagOn('touched-files')).toBe(true);
  process.env['STUDIO_FLAGS'] = 'touched-files';
  expect(rendererFlags().touchedFiles).toBe(true);
});

async function builtFlags(defaults: string[]): Promise<{ flagOn: (key: FlagKey) => boolean; primeFlags: (resolver: FlagResolver | undefined) => void }> {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    define: { 'import.meta.env.MAIN_VITE_FLAG_DEFAULTS': JSON.stringify(defaults.join(',')) },
    build: {
      ssr: true,
      write: false,
      minify: false,
      rollupOptions: {
        input: `${import.meta.dirname}/index.ts`,
        preserveEntrySignatures: 'strict',
        output: { format: 'es' },
      },
    },
  }) as Rollup.RollupOutput;
  const chunk = output.output.find((entry) => entry.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('Flag build produced no module');
  const source = `${chunk.code}\nvoid "${crypto.randomUUID()}";`;
  return await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as {
    flagOn: (key: FlagKey) => boolean;
    primeFlags: (resolver: FlagResolver | undefined) => void;
  };
}

async function builtFlagOn(defaults: string[]): Promise<(key: FlagKey) => boolean> {
  return (await builtFlags(defaults)).flagOn;
}

test('sections is off for every build until STUDIO_FLAGS names it (ONL-2661)', async () => {
  expect(flagOn('sections')).toBe(false);
  expect((await builtFlagOn([]))('sections')).toBe(false);
  process.env['STUDIO_FLAGS'] = 'sections';
  expect(flagOn('sections')).toBe(true);
});

test('connectors defaults off and follows the PostHog flag answer or explicit override', async () => {
  const flags = await builtFlags([]);
  expect(flags.flagOn('connectors')).toBe(false);
  flags.primeFlags((key) => key === 'connectors');
  expect(flags.flagOn('connectors')).toBe(true);
  const disabled = await builtFlags([]);
  disabled.primeFlags(() => false);
  expect(disabled.flagOn('connectors')).toBe(false);
  process.env['STUDIO_FLAGS'] = 'connectors';
  expect(disabled.flagOn('connectors')).toBe(true);
});

test('baked teams enables the flag without a runtime override', async () => {
  expect((await builtFlagOn(['teams']))('teams')).toBe(true);
});

test('runtime STUDIO_FLAGS forces teams on with nothing baked', async () => {
  const built = await builtFlagOn([]);
  process.env['STUDIO_FLAGS'] = ' other, teams, ';
  expect(flagOn('teams')).toBe(true);
  expect(built('teams')).toBe(true);
  process.env['STUDIO_FLAGS'] = 'other';
  expect(built('teams')).toBe(false);
});

test('an empty runtime override does not disable a baked default', async () => {
  process.env['STUDIO_FLAGS'] = '';
  expect((await builtFlagOn(['teams']))('teams')).toBe(true);
});

test('sections stays off in a build that bakes teams alone', async () => {
  expect(flagOn('sections')).toBe(false);
  expect((await builtFlagOn([]))('sections')).toBe(false);
  expect((await builtFlagOn(['teams']))('sections')).toBe(false);
});

test('lookup order is override then provider then build then compiled default', async () => {
  const flags = await builtFlags(['sections', 'teams']);
  flags.primeFlags(() => false);
  expect(flags.flagOn('teams')).toBe(false);
  process.env['STUDIO_FLAGS'] = 'teams';
  expect(flags.flagOn('teams')).toBe(true);
  expect(flags.flagOn('sections')).toBe(false);
  const enabled = await builtFlags([]);
  enabled.primeFlags(() => true);
  expect(enabled.flagOn('sections')).toBe(true);
});

test('unknown keys are ignored because only registry keys reach the provider', async () => {
  const flags = await builtFlags([]);
  const calls: string[] = [];
  const provider: Record<string, boolean> = { sections: true, unknown: true };
  flags.primeFlags((key) => { calls.push(key); return provider[key]; });
  expect(calls).toEqual(Object.keys(FLAGS));
  expect(calls).not.toContain('unknown');
  expect(flags.flagOn('sections')).toBe(true);
  expect(flags.flagOn('teams')).toBe(false);
});

test('no provider means no change to source or build defaults', async () => {
  for (const defaults of [[], ['teams'], ['sections', 'teams']]) {
    const flags = await builtFlags(defaults);
    flags.primeFlags(undefined);
    for (const key of Object.keys(FLAGS) as FlagKey[]) expect(flags.flagOn(key)).toBe(defaults.includes(key) || FLAGS[key].default);
    process.env['STUDIO_FLAGS'] = 'sections';
    expect(flags.flagOn('sections')).toBe(true);
    delete process.env['STUDIO_FLAGS'];
  }
});

test('undefined provider values fall through to build and compiled defaults', async () => {
  const flags = await builtFlags(['teams']);
  flags.primeFlags(() => undefined);
  expect(flags.flagOn('teams')).toBe(true);
  expect(flags.flagOn('sections')).toBe(false);
});

test('provider values resolve only once at boot and stay pinned for every read', async () => {
  const flags = await builtFlags([]);
  let value = true;
  let calls = 0;
  flags.primeFlags(() => { calls += 1; return value; });
  value = false;
  flags.primeFlags(() => { throw new Error('must not re-prime'); });
  for (let read = 0; read < 3; read += 1) expect(flags.flagOn('teams')).toBe(true);
  expect(calls).toBe(Object.keys(FLAGS).length);
});

test('invalid or throwing provider values leave defaults defined', async () => {
  const flags = await builtFlags(['teams']);
  flags.primeFlags((key) => {
    if (key === 'sections') return 'on' as unknown as boolean;
    if (key === 'teams') throw new Error('unavailable');
    return false;
  });
  expect(flags.flagOn('sections')).toBe(false);
  expect(flags.flagOn('teams')).toBe(true);
});

test('a -key entry in STUDIO_FLAGS forces a flag off over every other source', async () => {
  const flags = await builtFlags(['teams']);
  flags.primeFlags(() => true);
  process.env['STUDIO_FLAGS'] = 'sections, -teams';
  expect(flags.flagOn('teams')).toBe(false);
  expect(flags.flagOn('sections')).toBe(true);
  process.env['STUDIO_FLAGS'] = 'teams,-teams';
  expect(flags.flagOn('teams')).toBe(false);
});

test('every first-run moment is off for a build that bakes none, so a customer sees main (ONL-2901)', async () => {
  const moments: FlagKey[] = ['frame-covers', 'rail-foot', 'invite-tip', 'start-control', 'prompt-tip', 'blank-first-moment', 'machine-check'];
  const built = await builtFlagOn([]);
  for (const key of moments) expect(built(key)).toBe(false);
  const baked = await builtFlagOn(moments);
  for (const key of moments) expect(baked(key)).toBe(true);
});
