import { describe, expect, it } from 'bun:test';
import { boundCapabilities, CAPABILITY_NAMES, encodeCapabilities, NO_CAPABILITIES, parseCapabilities } from './capabilities.js';

describe('provider capabilities', () => {
  it('names nothing by default', () => {
    expect(Object.keys(NO_CAPABILITIES)).toEqual([...CAPABILITY_NAMES]);
    expect(Object.values(NO_CAPABILITIES).every((value) => value === false)).toBe(true);
  });

  it('counts only a literal true under a known name', () => {
    expect(boundCapabilities({ account: true, teams: 1, github: 'true', report: true, extra: true })).toEqual({ ...NO_CAPABILITIES, account: true, report: true });
    for (const declared of [undefined, null, 'account', 7, []]) expect(boundCapabilities(declared)).toEqual(NO_CAPABILITIES);
  });

  it('round-trips through the load query', () => {
    const some = { ...NO_CAPABILITIES, account: true, github: true, links: true };
    expect(encodeCapabilities(some)).toBe('account,github,links');
    expect(parseCapabilities(encodeCapabilities(some))).toEqual(some);
    expect(encodeCapabilities(NO_CAPABILITIES)).toBe('');
  });

  it('reads a missing or unknown value as nothing', () => {
    for (const raw of [null, '', 'ACCOUNT', 'account teams', 'bogus,,']) expect(parseCapabilities(raw)).toEqual(NO_CAPABILITIES);
    expect(parseCapabilities('bogus,teams')).toEqual({ ...NO_CAPABILITIES, teams: true });
  });
});
