import { describe, expect, it } from 'bun:test';
import { stamp } from './version.js';

// Stands in for the updater's `semver.gt`; agrees with it on every case here.
const sortsAbove = (a: string, b: string): boolean => Bun.semver.order(a, b) === 1;

describe('stamp', () => {
  it('composes <base>-beta.<count> verbatim', () => {
    expect(stamp('0.1.1', 476)).toBe('0.1.1-beta.476');
    expect(stamp('0.2.0', 1)).toBe('0.2.0-beta.1');
    expect(stamp('10.20.30', 99999)).toBe('10.20.30-beta.99999');
  });

  it('is monotonic in the commit count', () => {
    expect(sortsAbove(stamp('0.1.1', 476), stamp('0.1.1', 475))).toBe(true);
    expect(sortsAbove(stamp('0.1.1', 10), stamp('0.1.1', 9))).toBe(true);
    expect(sortsAbove(stamp('0.1.1', 100), stamp('0.1.1', 99))).toBe(true);
  });

  it('THE ONE THAT MATTERS: it sorts above every build that must auto-migrate', () => {
    // Versions the feeds once served, as literals: a fixture reading package.json would drift with the base.
    const MUST_AUTO_MIGRATE = ['0.0.8', '0.1.0'];
    for (const shipped of MUST_AUTO_MIGRATE) {
      expect(sortsAbove(stamp('0.1.1', 476), shipped)).toBe(true);
      expect(sortsAbove(stamp('0.1.1', 1), shipped)).toBe(true);
    }
  });

  it('does NOT reach the abandoned 0.2.0-beta line, deliberately (ONL-1964)', () => {
    // Every machine on that line was reinstalled by hand; going red here is a conversation, not a defect.
    expect(sortsAbove(stamp('0.1.1', 476), '0.2.0-beta.1')).toBe(false);
    expect(sortsAbove(stamp('0.1.1', 999999), '0.2.0-beta.1')).toBe(false);
  });

  it('refuses a base that already carries a prerelease', () => {
    for (const base of ['0.1.1-beta.1', '0.1.1-rc.1', '0.1.1-beta', 'v0.1.1', '0.1', '0.1.1.1', '']) {
      expect(() => stamp(base, 476)).toThrow();
    }
  });

  it('refuses a count that is not a positive integer', () => {
    // Catches an unparsed count (NaN sorts below every real build), not a shallow clone's small one.
    for (const count of [Number.NaN, 0, -1, 1.5]) {
      expect(() => stamp('0.1.1', count)).toThrow();
    }
  });
});
