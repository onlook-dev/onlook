import { describe, expect, it } from 'bun:test';
import { discoverCardVisible } from './discoverCta.js';

const UNRESOLVED = { isPrimed: true, hasProject: true, isResolved: false, isResolvedInSession: false };

describe('when the discover card shows (ONL-2443)', () => {
  it('stays hidden before the stored answer is primed, whatever that answer turns out to be', () => {
    expect(discoverCardVisible({ ...UNRESOLVED, isPrimed: false })).toBe(false);
    expect(discoverCardVisible({ ...UNRESOLVED, isPrimed: false, isResolved: true })).toBe(false);
  });

  it('stays hidden on the empty first run, before the product has given anything', () => {
    expect(discoverCardVisible({ ...UNRESOLVED, hasProject: false })).toBe(false);
  });

  it('stays hidden once the user has starred or dismissed', () => {
    expect(discoverCardVisible({ ...UNRESOLVED, isResolved: true })).toBe(false);
  });

  it('leaves the rail on a click, without waiting for the write to land', () => {
    expect(discoverCardVisible({ ...UNRESOLVED, isResolvedInSession: true })).toBe(false);
  });

  it('shows once a project exists, the answer is primed and the user has not given one', () => {
    expect(discoverCardVisible(UNRESOLVED)).toBe(true);
  });
});
