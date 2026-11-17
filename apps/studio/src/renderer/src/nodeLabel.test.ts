import { describe, expect, it } from 'bun:test';

import { artifactTag, artifactTags } from './nodeLabel.js';

/** Two valid uuids whose first four characters are one string (ONL-2568). */
const SHARED_ONE = '3c49a1b2-1111-4111-8111-aaaaaaaaaaaa';
const SHARED_TWO = '3c49f7e8-2222-4222-8222-bbbbbbbbbbbb';
const APART_ONE = '3f9c1d20-1111-4111-8111-aaaaaaaaaaaa';
const APART_TWO = 'b71e4a55-2222-4222-8222-bbbbbbbbbbbb';

describe('the tag two sketches sharing a title wear (ONL-2568)', () => {
  it('stays four characters while four tell the set apart', () => {
    const tags = artifactTags([APART_ONE, APART_TWO]);

    expect(tags.get(APART_ONE)).toBe('3f9c');
    expect(tags.get(APART_TWO)).toBe('b71e');
  });

  it('grows past a shared prefix, which the four-character tag alone cannot', () => {
    expect(artifactTag(SHARED_ONE)).toBe(artifactTag(SHARED_TWO));

    const tags = artifactTags([SHARED_ONE, SHARED_TWO]);

    expect(tags.get(SHARED_ONE)).toBe('3c49a');
    expect(tags.get(SHARED_TWO)).toBe('3c49f');
  });

  it('grows only as far as the set needs, measured from the longest shared run', () => {
    const tags = artifactTags([
      '3c49a1b2-1111-4111-8111-aaaaaaaaaaaa',
      '3c49a1b3-2222-4222-8222-bbbbbbbbbbbb',
    ]);

    expect([...tags.values()].map((tag) => tag.length)).toEqual([8, 8]);
    expect(new Set(tags.values()).size).toBe(2);
  });

  it('falls back to the whole id when no prefix separates two ids at all', () => {
    const tags = artifactTags(['a-b-c', 'ab-c']);

    expect(tags.get('a-b-c')).toBe('a-b-c');
    expect(tags.get('ab-c')).toBe('ab-c');
  });

  it('answers one tag per identity, however many times an id is named', () => {
    const tags = artifactTags([SHARED_ONE, SHARED_ONE]);

    expect(tags.size).toBe(1);
    expect(tags.get(SHARED_ONE)).toBe('3c49');
  });
});
