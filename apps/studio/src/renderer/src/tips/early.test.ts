import { describe, expect, it } from 'bun:test';
import { isEarlyTipAudience, isEstablishedBaseline, isTipSpent } from './early.js';

const early = (home?: string) => ({ home, everyProject: false, isEstablished: false });

describe('an early tip shows on the first project it reaches', () => {
  it('shows on a project when no project has it yet', () => {
    expect(isTipSpent([], '/a', early())).toBe(false);
  });

  it('keeps showing on its home project until used there', () => {
    expect(isTipSpent([], '/a', early('/a'))).toBe(false);
    expect(isTipSpent(['/a'], '/a', early('/a'))).toBe(true);
  });

  it('never shows on a second project, used or not', () => {
    expect(isTipSpent([], '/b', early('/a'))).toBe(true);
    expect(isTipSpent(['/a'], '/b', early())).toBe(true);
  });

  it('shows on every project until used there under the dev override', () => {
    const every = { home: '/a', everyProject: true, isEstablished: false };
    expect(isTipSpent(['/a'], '/b', every)).toBe(false);
    expect(isTipSpent(['/b'], '/b', every)).toBe(true);
  });
});

describe('a person who had projects before tip moments never sees an early tip (ONL-2960)', () => {
  const established = { home: undefined, everyProject: false, isEstablished: true };

  it('spends every early tip on every project, home or not', () => {
    expect(isTipSpent([], '/a', established)).toBe(true);
    expect(isTipSpent([], '/a', { ...established, home: '/a' })).toBe(true);
  });

  it('the dev override still shows them', () => {
    expect(isTipSpent([], '/a', { ...established, everyProject: true })).toBe(false);
  });

  it('reads one project at the stamp as established and none, or no stamp, as new', () => {
    expect(isEstablishedBaseline({ at: '2026-11-04T00:00:00.000Z', projects: 1 })).toBe(true);
    expect(isEstablishedBaseline({ at: '2026-11-04T00:00:00.000Z', projects: 0 })).toBe(false);
    expect(isEstablishedBaseline(undefined)).toBe(false);
  });
});

describe('who the early tips are for', () => {
  it('is someone new to Studio, and not someone who already had projects', () => {
    expect(isEarlyTipAudience({ everyProject: false, isEstablished: false })).toBe(true);
    expect(isEarlyTipAudience({ everyProject: false, isEstablished: true })).toBe(false);
  });

  it('is everyone with tips on every project', () => {
    expect(isEarlyTipAudience({ everyProject: true, isEstablished: true })).toBe(true);
  });
});
