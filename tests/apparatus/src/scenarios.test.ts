import { afterEach, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from './fixtures.js';
import { outcome } from './async.js';
import { closeScenario, FIXTURE_ANCHORS, markScenarioRoot } from './scenarios.js';
import { makeFixtureSite } from './site.js';

afterEach(cleanupTempFixtures);

function leftBehind(marked: boolean): string {
  const root = join(makeStateRoot({ name: 'scenario-root' }), 'scenario');
  mkdirSync(join(root, 'state'), { recursive: true });
  writeFileSync(join(root, 'studio.log'), 'the launch failed before the gate answered\n');
  if (marked) markScenarioRoot(root, 'blank-fresh');
  return root;
}

test('a root a scenario opened is cleared even when its launch failed before the app was recorded', async () => {
  const root = leftBehind(true);
  await closeScenario(root);
  expect(existsSync(root)).toBe(false);
});

test('a root no scenario opened is refused and left as it is', async () => {
  const root = leftBehind(false);
  expect(await outcome(closeScenario(root))).toThrow('not a scenario');
  expect(existsSync(join(root, 'studio.log'))).toBe(true);
});

const RECORDINGS = join(import.meta.dir, '../recordings');

function recordedEditTexts(): { file: string; text: string }[] {
  return readdirSync(RECORDINGS)
    .filter((file) => file.endsWith('.jsonl'))
    .flatMap((file) =>
      readFileSync(join(RECORDINGS, file), 'utf8')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line) as { type?: string; message?: { content?: unknown } })
        .filter((row) => row.type === 'assistant' && Array.isArray(row.message?.content))
        .flatMap((row) => row.message!.content as { type?: string; name?: string; input?: { old_string?: string; edits?: { old_string?: string }[] } }[])
        .filter((block) => block.type === 'tool_use' && (block.name === 'Edit' || block.name === 'MultiEdit'))
        .flatMap((block) => [block.input?.old_string, ...(block.input?.edits ?? []).map((edit) => edit.old_string)])
        .filter((text): text is string => typeof text === 'string')
        .map((text) => ({ file, text })),
    );
}

test('every text a recorded edit replaces is a listed fixture anchor and is in the fixture site', () => {
  const { path } = makeFixtureSite({ root: makeStateRoot({ name: 'anchors' }) });
  const site = readdirSync(path).filter((file) => file !== '.git').map((file) => readFileSync(join(path, file), 'utf8')).join('\n');
  const edits = recordedEditTexts();
  expect(edits.length).toBeGreaterThan(0);
  expect(edits.filter(({ text }) => !FIXTURE_ANCHORS.includes(text))).toEqual([]);
  expect(FIXTURE_ANCHORS.filter((anchor) => !site.includes(anchor))).toEqual([]);
});
