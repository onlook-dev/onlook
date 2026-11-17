import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('loads both live harness dependency graphs under Node without starting a turn', () => {
  const root = new URL('../', import.meta.url);
  const scripts = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).scripts as Record<string, string>;
  const preload = scripts['test:sdk']?.match(/--import (\S+)/)?.[1];
  expect(preload).toBeDefined();
  const modules = new Set<string>();
  for (const entry of ['tests/live/harness.live.ts', 'tests/live/resume.live.ts']) {
    const entryUrl = new URL(entry, root);
    for (const match of readFileSync(entryUrl, 'utf8').matchAll(/\bimport\(['"]([^'"]+)['"]\)/g)) {
      modules.add(new URL(match[1]!, entryUrl).href);
    }
  }
  expect(modules.size).toBeGreaterThan(0);
  const result = spawnSync('node', [
    '--import', preload!, '--input-type=module', '--eval',
    `for (const moduleUrl of ${JSON.stringify([...modules])}) await import(moduleUrl); console.log('live imports loaded');`,
  ], { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 15_000 });
  expect(result.error).toBeUndefined();
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
  expect(result.stdout.trim()).toBe('live imports loaded');
}, 20_000);

test('builds the tool list and prompt the live harness sends before its first turn, under Node', () => {
  const root = new URL('../', import.meta.url);
  const scripts = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).scripts as Record<string, string>;
  const preload = scripts['test:sdk']?.match(/--import (\S+)/)?.[1];
  expect(preload).toBeDefined();
  const tools = new URL('apps/studio/src/main/agent-host/studio-tools.ts', root).href;
  const fixture = new URL('tests/live/tool-fixture.ts', root).href;
  const result = spawnSync('node', [
    '--import', preload!, '--input-type=module', '--eval',
    `const { studioToolDefinitions } = await import(${JSON.stringify(tools)});
const { recordingSinks, toolsPrompt } = await import(${JSON.stringify(fixture)});
const names = studioToolDefinitions(recordingSinks().sinks).map((tool) => tool.name);
toolsPrompt(names);
console.log(names.length);`,
  ], { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 15_000 });
  expect(result.error).toBeUndefined();
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
  expect(Number(result.stdout.trim())).toBeGreaterThan(0);
}, 20_000);
