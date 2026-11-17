import { describe, expect, it } from 'bun:test';
import type { CodeMapping } from '@studio/events';
import { tintLabel } from './tintLabel.js';

function mapping(over: Partial<CodeMapping> = {}): CodeMapping {
  return {
    path: 'src/Hero.jsx',
    line: 12,
    column: 3,
    via: 'owner-stack',
    definition: null,
    grade: 'exact',
    component: 'Hero',
    others: [],
    uses: 0,
    produced: 1,
    producedComplete: true,
    ...over,
  };
}

describe('what the panel says about the code behind a selection (ONL-2563)', () => {
  it('keeps partial reach honest through staleness without claiming a unique line', () => {
    for (const isStale of [false, true]) {
      expect(tintLabel({ mapping: mapping({ grade: 'likely', produced: 1, producedComplete: false }), isStale })).toMatchObject({ reachKey: 'code.tint.rowsUnknown', reachCount: 1 });
      expect(tintLabel({ mapping: mapping({ grade: 'likely', produced: 2, producedComplete: false }), isStale })).toMatchObject({ reachKey: 'code.tint.rowsPartial', reachCount: 2 });
    }
  });
  it('gives each grade its own key, and none falls through to another', () => {
    const keys = (['exact', 'likely', 'best-guess'] as const).map(
      (grade) => tintLabel({ mapping: mapping({ grade }), isStale: false }).sentenceKey,
    );
    expect(new Set(keys).size).toBe(3);
  });

  it('names a known component call site without claiming the element source', () => {
    expect(tintLabel({ mapping: mapping({ via: 'component-stack', grade: 'likely' }), isStale: false }))
      .toMatchObject({ sentenceKey: 'code.tint.component', claimsConfidence: true });
  });

  it('does not claim confidence in a component-name or DOM search result', () => {
    for (const via of ['name-search', 'element-search'] as const) {
      expect(tintLabel({ mapping: mapping({ via, grade: 'likely' }), isStale: false }).claimsConfidence).toBe(false);
    }
  });

  it('tints and names the component on an exact mapping', () => {
    expect(tintLabel({ mapping: mapping(), isStale: false })).toMatchObject({
      component: 'Hero',
      sentenceKey: 'code.tint.exact',
      claimsConfidence: true,
      isTinted: true,
    });
  });

  /* The lines stay lit because the designer is still editing them; only the
     claim about them goes. */
  it('stops claiming a confidence on a stale selection and keeps the tint', () => {
    const label = tintLabel({ mapping: mapping(), isStale: true });
    expect(label.claimsConfidence).toBe(false);
    expect(label.sentenceKey).toBe('code.tint.unconfirmed');
    expect(label.isTinted).toBe(true);
  });

  it('offers the other places only on a best guess that has some', () => {
    expect(
      tintLabel({ mapping: mapping({ grade: 'best-guess', others: [{ path: 'a', line: 1, column: 1, via: 'name-search' }] }), isStale: false })
        .showsCandidates,
    ).toBe(true);
    expect(tintLabel({ mapping: mapping({ grade: 'best-guess' }), isStale: false }).showsCandidates).toBe(false);
    expect(tintLabel({ mapping: mapping(), isStale: false }).showsCandidates).toBe(false);
  });

  it('stops offering other places once Studio cannot confirm the selection', () => {
    expect(
      tintLabel({
        mapping: mapping({ grade: 'best-guess', others: [{ path: 'a', line: 1, column: 1, via: 'name-search' }] }),
        isStale: true,
      }).showsCandidates,
    ).toBe(false);
  });

  it('warns how many places use a component', () => {
    expect(tintLabel({ mapping: mapping({ uses: 3 }), isStale: false })).toMatchObject({
      reachKey: 'code.tint.uses',
      reachCount: 3,
    });
  });

  it('says nothing about reach for a one-off element', () => {
    expect(tintLabel({ mapping: mapping(), isStale: false })).toMatchObject({
      reachKey: null,
      reachCount: 0,
    });
  });

  it('warns how many elements a list’s line produced, which outranks the use count', () => {
    expect(tintLabel({ mapping: mapping({ produced: 7, uses: 3 }), isStale: false })).toMatchObject({
      reachKey: 'code.tint.rows',
      reachCount: 7,
    });
  });

  it('verifies the across-instance Row source while retaining its shared reach warning', () => {
    const repeated = mapping({ component: 'Row', grade: 'exact', produced: 4 });
    expect(tintLabel({ mapping: repeated, isStale: false })).toMatchObject({ sentenceKey: 'code.tint.exact', reachKey: 'code.tint.rows', reachCount: 4 });
    expect(tintLabel({ mapping: repeated, isStale: true })).toMatchObject({ sentenceKey: 'code.tint.unconfirmed', reachKey: 'code.tint.rows', reachCount: 4 });
  });

  /* The reach warning is about the edit, not about the mapping, so losing
     confidence must not lose it (ONL-2563). */
  it('keeps the reach warning through staleness while the confidence goes', () => {
    const label = tintLabel({ mapping: mapping({ uses: 4 }), isStale: true });
    expect(label.reachKey).toBe('code.tint.uses');
    expect(label.reachCount).toBe(4);
    expect(label.claimsConfidence).toBe(false);
  });

  it('says nothing about uses when no component was resolved', () => {
    expect(tintLabel({ mapping: mapping({ component: null, uses: 5 }), isStale: false }).reachKey).toBeNull();
  });
});

describe('a selection Studio could not place', () => {
  /* Three different causes, one sentence: the designer can do the same thing
     about all of them, and naming the cause would say what the page contains. */
  it('words a decline with one sentence, no tint, no confidence and no candidates', () => {
    expect(tintLabel({ mapping: null, isStale: false })).toEqual({
      component: null,
      sentenceKey: 'code.tint.declined',
      claimsConfidence: false,
      reachKey: null,
      reachCount: 0,
      isTinted: false,
      showsCandidates: false,
    });
  });

  it('words a stale decline the same way', () => {
    expect(tintLabel({ mapping: null, isStale: true }).sentenceKey).toBe('code.tint.declined');
  });
});
