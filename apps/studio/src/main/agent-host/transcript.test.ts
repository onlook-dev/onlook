import { afterAll, afterEach, beforeEach, expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalPath } from '../lib/canonical-path.js';
import { clearTranscript, flushTranscripts, forgetProjectTranscripts, readAllTranscripts, readTranscript, reopenProjectTranscripts, resetTranscriptCache, transcriptRootsComplete, writeTranscript } from './transcript.js';

let root: string;
let project: string;
const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
});

beforeEach(() => {
  resetTranscriptCache();
  root = mkdtempSync(join(tmpdir(), 'studio-transcript-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  project = join(root, 'project');
  mkdirSync(project);
});

afterEach(() => resetTranscriptCache());

function rows(count: number): StudioEvent[] {
  return Array.from({ length: count }, (_, index) => ({ type: 'message.user', seq: index + 1, text: 'prompt' } as StudioEvent));
}

it('reopens both drawers without accepting a removed producer or losing a sibling', async () => {
  const sibling = join(root, 'sibling');
  mkdirSync(sibling);
  const stopped = rows(2);
  writeTranscript(project, 'claude', stopped);
  writeTranscript(sibling, 'claude', rows(4));
  forgetProjectTranscripts(project);
  reopenProjectTranscripts(project);
  writeTranscript(project, 'claude', rows(3));
  writeTranscript(project, 'appserver', rows(5));
  stopped.push(...rows(1));
  writeTranscript(project, 'claude', stopped);
  await flushTranscripts();
  expect(readTranscript(project, 'claude')).toHaveLength(3);
  expect(readTranscript(project, 'claude').at(-1)?.seq).toBe(3);
  expect(readTranscript(project, 'appserver')).toHaveLength(5);
  expect(readTranscript(sibling, 'claude')).toHaveLength(4);
  resetTranscriptCache();
  expect(readTranscript(project, 'claude')).toHaveLength(3);
  expect(readTranscript(project, 'claude').at(-1)?.seq).toBe(3);
  expect(readTranscript(project, 'appserver')).toHaveLength(5);
  expect(readTranscript(sibling, 'claude')).toHaveLength(4);
});

it('preserves both ends of a conversation beyond 4,000 events across synchronous reset', () => {
  writeTranscript(project, 'claude', rows(4_101));
  resetTranscriptCache();
  const saved = readTranscript(project, 'claude');
  expect(saved).toHaveLength(4_101);
  expect(saved[0]?.seq).toBe(1);
  expect(saved.at(-1)?.seq).toBe(4_101);
});

it('migrates old Projects and keeps both Harness drawers and unloaded image roots', () => {
  const other = join(root, 'unloaded');
  mkdirSync(other);
  writeFileSync(join(root, 'transcripts.json'), JSON.stringify({ version: 2, data: { byWorkspace: {
    [`${canonicalPath(project)}::claude`]: rows(2),
    [`${canonicalPath(project)}::appserver`]: rows(3),
    [`${canonicalPath(other)}::claude`]: rows(4),
  } } }));
  expect(readTranscript(project, 'claude')).toHaveLength(2);
  expect(readTranscript(project, 'appserver')).toHaveLength(3);
  expect(readAllTranscripts()[`${canonicalPath(other)}::claude`]).toHaveLength(4);
  clearTranscript(project, 'claude');
  resetTranscriptCache();
  expect(readTranscript(project, 'claude')).toEqual([]);
  expect(readTranscript(project, 'appserver')).toHaveLength(3);
});

it('leaves future shared source bytes unchanged on reads, saves, clear and reset', () => {
  const source = join(root, 'transcripts.json');
  const bytes = '{"version":99,"data":{"byWorkspace":{}}}\n';
  writeFileSync(source, bytes);
  expect(readTranscript(project, 'claude')).toEqual([]);
  expect(transcriptRootsComplete()).toBe(false);
  writeTranscript(project, 'claude', rows(2));
  clearTranscript(project, 'claude');
  resetTranscriptCache();
  expect(readFileSync(source, 'utf8')).toBe(bytes);
});
