import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/** `tests/bridge.ts` and one probe alone: a hand-written bridge shape anywhere else cannot cover for it. */
function typecheckProbe(probe: string): { status: number | null; output: string } {
  const dir = mkdtempSync(join(tmpdir(), 'studio-bridge-types-'));
  try {
    writeFileSync(join(dir, 'probe.ts'), probe);
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        extends: join(repoRoot, 'tsconfig.base.json'),
        compilerOptions: {
          lib: ['ES2023', 'DOM'],
          types: [],
          paths: { '@studio/events': [join(repoRoot, 'packages/events/src/index.ts')] },
        },
        files: [join(repoRoot, 'tests/bridge.ts'), join(dir, 'probe.ts')],
      }),
    );
    const result = spawnSync(
      'node',
      [join(repoRoot, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', join(dir, 'tsconfig.json')],
      { cwd: repoRoot, encoding: 'utf8', timeout: 60_000 },
    );
    expect(result.error).toBeUndefined();
    return { status: result.status, output: `${result.stdout}${result.stderr}`.trim() };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** `any` satisfies every call below it, so the positive control has to refuse it by name. */
const REFUSE_ANY = [
  'type IsAny<T> = 0 extends (1 & T) ? true : false;',
  'export const studioTyped: false = false as IsAny<typeof globalThis.studio>;',
  'export const chromeTyped: false = false as IsAny<typeof globalThis.studioChrome>;',
].join('\n');

test('a driven page reaches both bridges, through globalThis and through window, neither of them any', () => {
  expect(
    typecheckProbe(
      `${REFUSE_ANY}\n` +
        'export const onGlobal = (): Promise<unknown[]> => Promise.all([globalThis.studio.agentSnapshot(), globalThis.studioChrome.tabsState()]);\n' +
        'export const onWindow = (): Promise<unknown[]> => Promise.all([window.studio.agentSnapshot(), window.studioChrome.tabsState()]);\n',
    ),
  ).toEqual({ status: 0, output: '' });
});

test('a StudioBridge method the specs call goes red when it is renamed or takes another argument', () => {
  const renamed = typecheckProbe(
    'export const read = (): Promise<unknown> => globalThis.studio.agentSnapshotRenamed();\n',
  );
  expect(renamed.status).toBe(1);
  expect(renamed.output).toContain("Property 'agentSnapshotRenamed' does not exist on type 'StudioBridge'");

  const widened = typecheckProbe(
    'export const announce = (): Promise<void> => globalThis.studio.notifyProjectSelected({ path: "/w" }, 1);\n',
  );
  expect(widened.status).toBe(1);
  expect(widened.output).toContain('Expected 1 arguments, but got 2');
});

test('a StudioChromeBridge method the band specs call goes red when it is renamed', () => {
  const renamed = typecheckProbe(
    'export const read = (): Promise<unknown> => globalThis.studioChrome.tabsStateRenamed();\n',
  );
  expect(renamed.status).toBe(1);
  expect(renamed.output).toContain("Property 'tabsStateRenamed' does not exist on type 'StudioChromeBridge'");
});
