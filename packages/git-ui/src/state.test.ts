import { describe, expect, test } from 'bun:test';
import { PILL_FIXTURES } from './fixtures.js';
import { GIT_PILL_STATES, type GitPillState } from './state.js';

describe('GIT_PILL_STATES', () => {
  test('lists every pill state exactly once', () => {
    expect(Object.keys(PILL_FIXTURES).sort()).toEqual([...GIT_PILL_STATES].sort());
  });

  test('illegal shapes are type errors', () => {
    // @ts-expect-error — a trust state cannot carry a PR
    const trustWithPr: GitPillState = { id: 'local-only', pr: { number: 1, url: 'x' } };
    // @ts-expect-error — a readout can be stale but never working
    const workingReadout: GitPillState = { id: 'checks-running', pr: { number: 1, url: 'x' }, mode: 'working' };
    // @ts-expect-error — ready-to-merge needs its dropdown default
    const readyNoDefault: GitPillState = { id: 'ready-to-merge', pr: { number: 1, url: 'x' } };
    expect([trustWithPr, workingReadout, readyNoDefault].length).toBe(3);
  });
});
