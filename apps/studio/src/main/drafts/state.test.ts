import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import type { ImageRef } from '@studio/events';
import { workspaceHash } from '../lib/canonical-path.js';

const {
  draftImageIds,
  forgetComposerDraft,
  prependComposerDraft,
  readComposerDraft,
  resetComposerDraftsCache,
  writeComposerDraft,
} = await import('./state.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

let stateRoot: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'drafts' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetComposerDraftsCache();
});

const WS_A = '/tmp/ws-a';
const WS_B = '/tmp/ws-b';

it('forgets and seals only the removed Project, including queued and late composer writes', () => {
  writeComposerDraft(WS_A, { text: 'removed', images: [] });
  writeComposerDraft(WS_B, { text: 'kept', images: [] });
  forgetComposerDraft(WS_A);
  writeComposerDraft(WS_A, { text: 'late', images: [] });
  expect(readComposerDraft(WS_A)).toEqual({ text: '', images: [] });
  expect(readComposerDraft(WS_B).text).toBe('kept');
  resetComposerDraftsCache();
  expect(readComposerDraft(WS_A)).toEqual({ text: '', images: [] });
  expect(readComposerDraft(WS_B).text).toBe('kept');
});

it('persists an artifact reference without its page bytes or a display-name lookup', () => {
  const artifact = { kind: 'artifact' as const, artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Idea', pagePath: 'pages/cart.html' };
  writeComposerDraft(WS_A, { text: '', images: [], artifacts: [artifact] });
  resetComposerDraftsCache();
  expect(readComposerDraft(WS_A).artifacts).toEqual([artifact]);
  expect(readComposerDraft(WS_B).artifacts).toBeUndefined();
});

const ref = (id: string): ImageRef => ({ id, mediaType: 'image/png', width: 16, height: 9 });

function plant(byWorkspace: Record<string, unknown>): void {
  writeFileSync(
    join(stateRoot, 'composer-drafts.json'),
    `${JSON.stringify({ version: 1, data: { byWorkspace } })}\n`,
  );
}

describe('a draft across a relaunch', () => {
  it('round-trips text and image refs through disk', () => {
    const draft = { text: 'not sent yet', images: [ref('aaaaaaaaaaaa-1'), ref('aaaaaaaaaaaa-2')] };
    writeComposerDraft(WS_A, draft);
    resetComposerDraftsCache();
    expect(readComposerDraft(WS_A)).toEqual(draft);
  });

  it('keeps each project to its own draft', () => {
    writeComposerDraft(WS_A, { text: 'a', images: [] });
    writeComposerDraft(WS_B, { text: 'b', images: [] });
    resetComposerDraftsCache();
    expect(readComposerDraft(WS_A).text).toBe('a');
    expect(readComposerDraft(WS_B).text).toBe('b');
  });

  it('answers an unknown project with an empty draft, never a throw', () => {
    expect(readComposerDraft('/tmp/never-opened')).toEqual({ text: '', images: [] });
    expect(readComposerDraft('')).toEqual({ text: '', images: [] });
  });
});

describe('a malformed stored entry', () => {
  it('drops the entry and leaves its neighbour standing', () => {
    plant({
      [workspaceHash(WS_A)]: { text: 42, images: [] },
      [workspaceHash(WS_B)]: { text: 'still here', images: [] },
    });
    expect(readComposerDraft(WS_A)).toEqual({ text: '', images: [] });
    expect(readComposerDraft(WS_B)).toEqual({ text: 'still here', images: [] });
  });

  it('drops an unusable image ref and keeps the rest of the draft', () => {
    plant({
      [workspaceHash(WS_A)]: {
        text: 'kept',
        images: [{ id: 'good', mediaType: 'image/png' }, { id: 'no-type' }, 'not an object'],
      },
    });
    expect(readComposerDraft(WS_A)).toEqual({
      text: 'kept',
      images: [{ id: 'good', mediaType: 'image/png' }],
    });
  });
});

describe('clearing a draft', () => {
  it('removes the entry from disk, not just from the composer', () => {
    writeComposerDraft(WS_A, { text: 'a thought', images: [ref('aaaaaaaaaaaa-1')] });
    writeComposerDraft(WS_A, { text: '', images: [] });
    resetComposerDraftsCache();
    expect(readComposerDraft(WS_A)).toEqual({ text: '', images: [] });
    expect(draftImageIds().size).toBe(0);
  });
});

describe('a prompt handed to the draft on the way out (ONL-2294)', () => {
  it('lands ahead of what the composer already holds, keeping both', () => {
    writeComposerDraft(WS_A, { text: 'typing this now', images: [ref('aaaaaaaaaaaa-2')] });
    prependComposerDraft(WS_A, { text: 'waited in main', images: [ref('aaaaaaaaaaaa-1')] });
    expect(readComposerDraft(WS_A)).toEqual({
      text: 'waited in main\n\ntyping this now',
      images: [ref('aaaaaaaaaaaa-1'), ref('aaaaaaaaaaaa-2')],
    });
  });

  it('is the whole draft when the composer held nothing', () => {
    writeComposerDraft(WS_A, { text: '', images: [] });
    prependComposerDraft(WS_A, { text: 'waited in main', images: [] });
    expect(readComposerDraft(WS_A)).toEqual({ text: 'waited in main', images: [] });
  });

  it('leaves the stored draft alone when there is nothing to hand over', () => {
    writeComposerDraft(WS_A, { text: 'typing this now', images: [] });
    prependComposerDraft(WS_A, { text: '', images: [] });
    expect(readComposerDraft(WS_A)).toEqual({ text: 'typing this now', images: [] });
  });

  it('keeps the composer skill when a returned pen has no skill', () => {
    const skill = { kind: 'skill' as const, name: 'brand', description: 'Use the brand', agent: 'claude' as const };
    writeComposerDraft(WS_A, { text: 'typing this now', images: [], skills: [skill] });
    prependComposerDraft(WS_A, { text: 'waited in main', images: [], skills: [] });
    expect(readComposerDraft(WS_A)).toEqual({ text: 'waited in main\n\ntyping this now', images: [], skills: [skill] });
    const replacement = { ...skill, name: 'audit' };
    prependComposerDraft(WS_A, { text: '', images: [], skills: [replacement] });
    expect(readComposerDraft(WS_A).skills).toEqual([replacement]);
  });

  it('names an image the composer already holds once', () => {
    writeComposerDraft(WS_A, { text: 'a', images: [ref('aaaaaaaaaaaa-1')] });
    prependComposerDraft(WS_A, { text: 'b', images: [ref('aaaaaaaaaaaa-1')] });
    expect(readComposerDraft(WS_A).images).toEqual([ref('aaaaaaaaaaaa-1')]);
  });

  it('roots its images for the sweep that follows the session stop', () => {
    prependComposerDraft(WS_A, { text: '', images: [ref('aaaaaaaaaaaa-1')] });
    expect([...draftImageIds()]).toEqual(['aaaaaaaaaaaa-1']);
  });
});

describe('draftImageIds', () => {
  it('collects every stored project’s refs', () => {
    writeComposerDraft(WS_A, { text: 'a', images: [ref('aaaaaaaaaaaa-1')] });
    writeComposerDraft(WS_B, { text: 'b', images: [ref('bbbbbbbbbbbb-1')] });
    resetComposerDraftsCache();
    expect([...draftImageIds()].sort()).toEqual(['aaaaaaaaaaaa-1', 'bbbbbbbbbbbb-1']);
  });
});
