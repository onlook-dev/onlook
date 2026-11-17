import { describe, expect, it } from 'bun:test';
import type { CodeSnapshot } from '@studio/events';
import { clashVerdict, showsBanner, type ClashFacts } from './clashVerdict.js';

const snap = (hash: string, mtimeMs = 1): CodeSnapshot => ({
  hash,
  size: 10,
  mtimeMs,
  eol: '\n',
  mode: 0o644,
  bom: false,
});

const facts = (over: Partial<ClashFacts>): ClashFacts => ({
  isDirty: false,
  held: snap('a'),
  onDisk: snap('a'),
  wasRefusedStale: false,
  ...over,
});

describe('what a file’s state means for its tab (ONL-2563)', () => {
  it('is clean when the snapshots agree', () => {
    expect(clashVerdict(facts({}))).toBe('clean');
    expect(clashVerdict(facts({ isDirty: true }))).toBe('clean');
  });

  /* A disk change on a CLEAN tab is not a clash: there is nothing of the
     designer's to lose, so it reloads and says nothing. */
  it('reloads a clean tab whose file changed on disk', () => {
    expect(clashVerdict(facts({ onDisk: snap('b') }))).toBe('reload');
  });

  it('raises the banner only when a dirty tab’s file changed', () => {
    expect(clashVerdict(facts({ isDirty: true, onDisk: snap('b') }))).toBe('banner');
  });

  it('marks a dirty tab missing when its file left the disk, rather than losing the text', () => {
    expect(clashVerdict(facts({ isDirty: true, onDisk: null }))).toBe('missing');
  });

  it('closes a clean tab whose file left the disk, because there is nothing to keep', () => {
    expect(clashVerdict(facts({ onDisk: null }))).toBe('closed');
  });

  it('is blocked after a save was refused as stale, whatever disk says', () => {
    expect(clashVerdict(facts({ isDirty: true, wasRefusedStale: true }))).toBe('blocked');
    expect(clashVerdict(facts({ wasRefusedStale: true, onDisk: snap('a') }))).toBe('blocked');
  });

  /* The hash alone decides. A rewrite restoring identical bytes moves the
     modification time, and calling that a clash would raise a banner against
     a file nobody changed. */
  it('does not call a moved modification time over identical bytes a change', () => {
    expect(clashVerdict(facts({ isDirty: true, onDisk: snap('a', 9999) }))).toBe('clean');
  });

  it('says nothing before the read has answered', () => {
    expect(clashVerdict(facts({ held: null, onDisk: snap('b') }))).toBe('clean');
  });
});

describe('which verdicts put a banner up', () => {
  it('is the dirty-and-changed one and the refused save, and nothing else', () => {
    expect(showsBanner('banner')).toBe(true);
    expect(showsBanner('blocked')).toBe(true);
    expect(showsBanner('clean')).toBe(false);
    expect(showsBanner('reload')).toBe(false);
    expect(showsBanner('missing')).toBe(false);
    expect(showsBanner('closed')).toBe(false);
  });
});
