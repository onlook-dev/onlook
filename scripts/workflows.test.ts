import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface Step {
  name?: string;
  uses?: string;
  if?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}
interface Job {
  permissions?: Record<string, string>;
  if?: string;
  needs?: string[];
  'runs-on'?: unknown;
  env?: Record<string, string>;
  steps?: Step[];
}
interface Workflow {
  permissions?: Record<string, string>;
  on: {
    pull_request?: unknown;
    push?: { branches: string[]; paths?: string[] };
    workflow_dispatch?: { inputs: Record<string, { type: string; default: unknown }> };
  };
  env?: Record<string, string>;
  jobs: Record<string, Job>;
}

const appRequire = createRequire(join(import.meta.dirname, '../apps/studio/package.json'));
const { load } = createRequire(appRequire.resolve('electron-builder'))('js-yaml') as { load(source: string): unknown };

function workflow(name: string): { source: string; parsed: Workflow } {
  const source = readFileSync(join(import.meta.dirname, '../.github/workflows', name), 'utf8');
  return { source, parsed: load(source) as Workflow };
}

test('CI checks main pull requests with stock Changesets and full history', () => {
  const steps = workflow('ci.yml').parsed.jobs['verify']?.steps ?? [];
  const checkout = steps.find((step) => step.uses?.startsWith('actions/checkout@'));
  expect(checkout?.with).toMatchObject({ 'fetch-depth': 0, 'persist-credentials': false });
  const check = steps.find((step) => step.name === 'Changeset check');
  expect(check?.if).toBe("github.event_name == 'pull_request' && github.base_ref == 'main'");
  expect(check?.run).toBe('bunx changeset status --since=origin/main');
});

test('editor Changesets tooling only collects entries with a pinned CLI', () => {
  const root = join(import.meta.dirname, '..');
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  expect(manifest.scripts['changeset']).toBe('changeset');
  expect(manifest.devDependencies['@changesets/cli']).toBe('2.31.0');
  expect(manifest.scripts['check:changesets']).toBeUndefined();
  expect(manifest.scripts['editor:version']).toBeUndefined();
  expect(manifest.scripts['verify']).not.toContain('check:changesets');
  expect(existsSync(join(root, 'scripts/editor-changesets.ts'))).toBe(false);
  expect(existsSync(join(root, 'scripts/editor-changesets.test.ts'))).toBe(false);
});

test('repository dependency installs use the committed lockfile and an exact Bun version', () => {
  const files = readdirSync(join(import.meta.dirname, '../.github/workflows')).filter((file) => /\.ya?ml$/.test(file));
  for (const file of files) {
    for (const job of Object.values(workflow(file).parsed.jobs)) {
      const steps = job.steps ?? [];
      const setup = steps.filter((step) => step.uses?.startsWith('oven-sh/setup-bun@'));
      expect(setup).toHaveLength(1);
      expect(setup[0]?.with?.['bun-version']).toMatch(/^\d+\.\d+\.\d+$/);
      for (const install of steps.filter((step) => step.run?.includes('bun install'))) {
        expect(install.run).toBe('bun install --frozen-lockfile');
      }
    }
  }
});

test('signing tools are exact local pins and packaging never downloads a missing builder', () => {
  const root = join(import.meta.dirname, '..');
  const app = JSON.parse(readFileSync(join(root, 'apps/studio/package.json'), 'utf8')) as {
    devDependencies: Record<string, string>;
  };
  for (const dependency of ['electron', 'electron-builder']) {
    expect(app.devDependencies[dependency]).toMatch(/^\d+\.\d+\.\d+$/);
  }
  const mac = readFileSync(join(root, 'scripts/cut-dmg.ts'), 'utf8');
  const windows = readFileSync(join(root, 'scripts/cut-windows.ts'), 'utf8');
  expect(mac).toContain("const builderBin = join(appDir, 'node_modules/.bin/electron-builder')");
  expect(mac).toContain('tryRun(builderBin, builderArgs, appDir, env)');
  expect(mac).not.toMatch(/\bbunx\b|\bnpx\b/);
  expect(windows).toContain("run(['x', '--no-install', 'electron-builder',");
});

test('the source build runs only on main pushes and manual runs', () => {
  const { source, parsed } = workflow('source-build.yml');
  expect(parsed.on.push?.branches).toEqual(['main']);
  expect(Object.hasOwn(parsed.on, 'workflow_dispatch')).toBe(true);
  expect(Object.hasOwn(parsed.on, 'pull_request')).toBe(false);
  expect(Object.keys(parsed.jobs)).toEqual(['source-build']);
  const sourceBuild = parsed.jobs['source-build'];
  expect(sourceBuild?.if).toBeUndefined();
  expect(sourceBuild?.env).toEqual({ STUDIO_CLOUD_BUILD: '0' });
  expect(sourceBuild?.steps).toEqual([
    { uses: 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262', with: { 'fetch-depth': 0, 'persist-credentials': false } },
    { uses: 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6', with: { 'bun-version': '1.4.2' } },
    { name: 'Install dependencies', run: 'bun install --frozen-lockfile' },
    { name: 'Build source app', run: 'bun run build' },
  ]);
  expect(source).not.toContain('STUDIO_WORKOS_CLIENT_ID');
  expect(source).not.toContain('STUDIO_CLOUD_URL');
});

test('workflow lint runs whenever a workflow or the linter pin changes', () => {
  const { parsed } = workflow('workflow-lint.yml');
  const paths = ['.github/workflows/**', 'scripts/check-workflows.ts'];
  expect(parsed.on.pull_request).toEqual({ paths });
  expect(parsed.on.push).toEqual({ branches: ['main'], paths });
  expect(parsed.jobs['workflow-lint']?.steps?.at(-1)).toEqual({ name: 'Lint workflows', run: 'bun run check:workflows' });
});

test('every Linux job that installs dependencies runs on the runner Verify pins', () => {
  const pinned = workflow('ci.yml').parsed.jobs['verify']?.['runs-on'];
  expect(pinned).toMatch(/^ubuntu-\d/);
  const installers = readdirSync(join(import.meta.dirname, '../.github/workflows'))
    .filter((file) => /\.ya?ml$/.test(file))
    .flatMap((file) =>
      Object.entries(workflow(file).parsed.jobs)
        .filter(([, job]) => (job.steps ?? []).some((step) => step.run?.includes('bun install --frozen-lockfile')))
        .map(([id, job]) => ({ job: `${file}#${id}`, runner: job['runs-on'] })),
    );
  expect(installers.filter(({ runner }) => typeof runner !== 'string' || runner.includes('${{'))).toEqual([]);
  const ubuntu = installers.filter(({ runner }) => String(runner).startsWith('ubuntu'));
  for (const job of ['ci.yml#verify', 'source-build.yml#source-build']) {
    expect(ubuntu.map((installer) => installer.job)).toContain(job);
  }
  expect(ubuntu.filter(({ runner }) => runner !== pinned)).toEqual([]);
});

test('Windows runtime checks run on every PR and main push', () => {
  const { parsed } = workflow('ci.yml');
  expect(Object.hasOwn(parsed.on, 'pull_request')).toBe(true);
  expect(parsed.on.push?.branches).toEqual(['main']);
  const windows = parsed.jobs['windows'];
  expect(windows?.if).toBeUndefined();
  const runtime = windows?.steps?.find((step) => step.run === 'bun run test:windows');
  expect(runtime).toBeDefined();
  expect(runtime?.if).toBeUndefined();
});

test('unsigned Windows packaging and upload require an explicit manual dispatch opt-in', () => {
  const { source, parsed } = workflow('ci.yml');
  expect(parsed.on.workflow_dispatch?.inputs['package']).toMatchObject({ type: 'boolean', default: false });
  const windows = parsed.jobs['windows'];
  const packaging = windows?.steps?.find((step) => step.run === 'bun run build:windows');
  const upload = windows?.steps?.find((step) => step.with?.name === 'windows-unsigned-review');
  expect(packaging).toBeDefined();
  expect(upload).toBeDefined();
  for (const step of [packaging, upload]) {
    expect(step?.if).toBe("${{ github.event_name == 'workflow_dispatch' && inputs.package }}");
  }
  expect(packaging?.env?.['ONLOOK_WINDOWS_ALLOW_UNSIGNED']).toBe('1');
  expect(source.match(/ONLOOK_WINDOWS_ALLOW_UNSIGNED/g)).toHaveLength(1);
  expect(parsed.env?.['ONLOOK_WINDOWS_ALLOW_UNSIGNED']).toBeUndefined();
  expect(windows?.env?.['ONLOOK_WINDOWS_ALLOW_UNSIGNED']).toBeUndefined();
});

test('Windows dependency downloads do not share a cross-run cache', () => {
  const steps = workflow('ci.yml').parsed.jobs['windows']?.steps ?? [];
  const cache = steps.find((step) => step.uses?.startsWith('actions/cache@'));
  expect(cache).toBeUndefined();
});
