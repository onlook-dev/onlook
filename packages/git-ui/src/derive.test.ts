import { describe, expect, test } from 'bun:test';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import { cardStateFor, derivePillState, restOf } from './derive.js';
import {
  BEHIND_UPSTREAM_MEASUREMENT,
  BLOCKED_MEASUREMENT,
  MEASUREMENT_FIXTURES,
  READ_ONLY_PARENT_MEASUREMENT,
  measurement,
  row,
} from './measurement-fixtures.js';
import { GIT_PILL_STATES } from './state.js';

const D = GIT_PILL_SHIPPED_DEFAULTS;
const PUSH = { ...D, noPr: 'push' as const };

describe('derivePillState', () => {
  test('every pill state has a fixture that derives to itself', () => {
    for (const id of GIT_PILL_STATES) {
      const defaults = id === 'push' ? PUSH : D;
      expect(derivePillState(row(MEASUREMENT_FIXTURES[id]), defaults).id).toBe(id);
    }
  });

  test('no row is first paint; a stale row keeps its state and dims', () => {
    expect(derivePillState(undefined, D)).toEqual({ id: 'first-paint' });
    const stale = derivePillState(row(MEASUREMENT_FIXTURES['fix-checks'], { stale: true }), D);
    expect(stale.id).toBe('fix-checks');
    expect(stale.mode).toBe('stale');
  });

  test('UNKNOWN merge state is not a conflict: pending checks run, none is ready', () => {
    expect(derivePillState(row(measurement({}, { mergeStateStatus: 'UNKNOWN', checks: 'pending' })), D).id).toBe('checks-running');
    expect(derivePillState(row(measurement({}, { mergeStateStatus: 'UNKNOWN', checks: 'none' })), D).id).toBe('ready-to-merge');
  });

  test('inside an open PR: conflicts > failing checks > behind > dirty > pending > ready', () => {
    const all = { behind: 3, dirty: true, aheadOfUpstream: true };
    expect(derivePillState(row(measurement(all, { mergeStateStatus: 'DIRTY', checks: 'failing' })), D).id).toBe('resolve-conflicts');
    expect(derivePillState(row(measurement(all, { checks: 'failing' })), D).id).toBe('fix-checks');
    expect(derivePillState(row(measurement(all, { checks: 'pending' })), D).id).toBe('download-changes');
    expect(derivePillState(row(measurement({ dirty: true }, { checks: 'pending' })), D).id).toBe('upload-changes');
    expect(derivePillState(row(measurement({ aheadOfUpstream: true }, { checks: 'pending' })), D).id).toBe('upload-changes');
  });

  test('failing checks carry dirty, so the pill can still offer Upload (ONL-2388)', () => {
    expect(derivePillState(row(measurement({ dirty: true }, { checks: 'failing' })), D)).toMatchObject({ id: 'fix-checks', dirty: true });
    expect(derivePillState(row(measurement({ aheadOfUpstream: true }, { checks: 'failing' })), D)).toMatchObject({ id: 'fix-checks', dirty: true });
    expect(derivePillState(row(measurement({}, { checks: 'failing' })), D)).toMatchObject({ id: 'fix-checks', dirty: false });
  });

  test('draft with failing checks is Draft PR', () => {
    expect(derivePillState(row(measurement({}, { isDraft: true, checks: 'failing' })), D).id).toBe('draft-pr');
  });

  test('unborn, detached, and non-GitHub remotes are Local Only whatever gh says', () => {
    for (const patch of [{ head: 'unborn' as const }, { head: 'detached' as const }, { origin: 'other' as const }]) {
      expect(derivePillState(row(measurement({ ...patch, ghAuthed: false, access: 'denied' })), D).id).toBe('local-only');
    }
  });

  test('trust rungs: not authed beats denied; denied carries repo and account', () => {
    expect(derivePillState(row(measurement({ ghInstalled: false, access: 'denied' })), D).id).toBe('connect-github');
    expect(derivePillState(row(measurement({ access: 'denied' })), D)).toEqual({
      id: 'no-access',
      repo: 'onlook-dev/studio',
      account: 'wrenquill',
    });
  });

  test('no PR follows the user default and carries dirty', () => {
    expect(derivePillState(row(measurement({ dirty: true })), D)).toEqual({ id: 'create-pr', dirty: true });
    expect(derivePillState(row(measurement({})), PUSH)).toEqual({ id: 'push', dirty: false });
  });

  test('BLOCKED or a read-only viewer forces the dropdown to open-in-browser, whatever the default is', () => {
    const blocked = derivePillState(row(BLOCKED_MEASUREMENT), { ...D, ready: 'merge' });
    expect(blocked.id).toBe('ready-to-merge');
    expect(blocked.id === 'ready-to-merge' && blocked.dropdownDefault).toBe('open-in-browser');

    const readOnly = derivePillState(row(READ_ONLY_PARENT_MEASUREMENT), { ...D, ready: 'merge' });
    expect(readOnly.id).toBe('ready-to-merge');
    expect(readOnly.id === 'ready-to-merge' && readOnly.dropdownDefault).toBe('open-in-browser');
  });

  test('BLOCKED still yields to failing or pending checks', () => {
    expect(derivePillState(row(measurement({}, { mergeStateStatus: 'BLOCKED', checks: 'failing' })), D).id).toBe('fix-checks');
    expect(derivePillState(row(measurement({}, { mergeStateStatus: 'BLOCKED', checks: 'pending' })), D).id).toBe('checks-running');
  });

  test('a GitHub BEHIND routes to Download even when the local behind count is zero', () => {
    expect(derivePillState(row(BEHIND_UPSTREAM_MEASUREMENT), D).id).toBe('download-changes');
  });

  test('CLEAN with a merge default keeps the merge default', () => {
    const ready = derivePillState(row(measurement({}, { mergeStateStatus: 'CLEAN', checks: 'passing' })), { ...D, ready: 'merge' });
    expect(ready.id).toBe('ready-to-merge');
    expect(ready.id === 'ready-to-merge' && ready.dropdownDefault).toBe('merge');
  });

  test('UNSTABLE and HAS_HOOKS are not BLOCKED: they fall through to the existing branches', () => {
    expect(derivePillState(row(measurement({}, { mergeStateStatus: 'UNSTABLE', checks: 'failing' })), D).id).toBe('fix-checks');
    expect(derivePillState(row(measurement({}, { mergeStateStatus: 'UNSTABLE', checks: 'pending' })), D).id).toBe('checks-running');
    const unstableReady = derivePillState(row(measurement({}, { mergeStateStatus: 'UNSTABLE', checks: 'passing' })), { ...D, ready: 'merge' });
    expect(unstableReady.id === 'ready-to-merge' && unstableReady.dropdownDefault).toBe('merge');
    const hooksReady = derivePillState(row(measurement({}, { mergeStateStatus: 'HAS_HOOKS', checks: 'passing' })), { ...D, ready: 'merge' });
    expect(hooksReady.id === 'ready-to-merge' && hooksReady.dropdownDefault).toBe('merge');
  });
});

describe('cardStateFor', () => {
  test('the card table', () => {
    const expected = {
      'no-access': 'local-only',
      'connect-github': 'local-only',
      'local-only': 'local-only',
      'first-paint': 'none',
      merged: 'merged',
      'pr-closed': 'none',
      'draft-pr': 'none',
      'resolve-conflicts': 'conflicts',
      'fix-checks': 'checks-failed',
      'download-changes': 'updates-available',
      'upload-changes': 'not-uploaded',
      'checks-running': 'checks-running',
      'ready-to-merge': 'ready-to-merge',
      'create-pr': 'not-uploaded',
      push: 'not-uploaded',
    } as const;
    for (const id of GIT_PILL_STATES) {
      expect(cardStateFor(derivePillState(row(MEASUREMENT_FIXTURES[id]), id === 'push' ? PUSH : D))).toBe(expected[id]);
    }
    expect(cardStateFor(derivePillState(undefined, D))).toBe('none');
  });

  test('pre-PR: dirty or ahead reads Not Uploaded, clean reads nothing', () => {
    expect(cardStateFor(derivePillState(row(measurement({ dirty: true })), D))).toBe('not-uploaded');
    expect(cardStateFor(derivePillState(row(measurement({ aheadOfUpstream: true })), PUSH))).toBe('not-uploaded');
    expect(cardStateFor(derivePillState(row(measurement({})), D))).toBe('none');
    expect(cardStateFor(derivePillState(row(measurement({})), PUSH))).toBe('none');
  });
});

describe('restOf', () => {
  test('strips stale for the card, and leaves a resting pill as it is', () => {
    const stale = derivePillState(row(MEASUREMENT_FIXTURES['fix-checks'], { stale: true }), D);
    expect(restOf(stale).mode).toBeUndefined();
    expect(restOf(stale).id).toBe('fix-checks');
    const rest = derivePillState(row(MEASUREMENT_FIXTURES['ready-to-merge']), D);
    expect(restOf(rest)).toBe(rest);
  });
});
