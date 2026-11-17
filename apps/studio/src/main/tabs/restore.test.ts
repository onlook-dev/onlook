import { describe, expect, it } from 'bun:test';
import type { WindowRecord } from '@studio/events';
import { planRestore, type RestoreProbe } from './restore.js';

const tab = (name: string): { workspacePath: string; repoIdentity: string } => ({
  workspacePath: `/w/${name}`,
  repoIdentity: `github.com/fixture/${name}`,
});

const probe = (over: Partial<RestoreProbe> = {}): RestoreProbe => ({
  exists: () => true,
  isOpen: () => false,
  ...over,
});

const paths = (record: WindowRecord, p = probe()): string[] =>
  planRestore(record, p).tabs.map((entry) => entry.workspacePath);

describe('restoring the open set (ONL-2208)', () => {
  it('keeps the recorded order', () => {
    const record: WindowRecord = {
      tabs: [tab('one'), tab('two'), tab('three')],
      active: { kind: 'home' },
    };

    expect(paths(record)).toEqual(['/w/one', '/w/two', '/w/three']);
  });

  it('names the recorded active tab as the one to warm', () => {
    const record: WindowRecord = {
      tabs: [tab('one'), tab('two')],
      active: { kind: 'tab', workspacePath: '/w/two' },
    };

    expect(planRestore(record, probe()).activate).toBe('/w/two');
  });

  it('warms nothing when home was forward', () => {
    const record: WindowRecord = { tabs: [tab('one')], active: { kind: 'home' } };

    expect(planRestore(record, probe()).activate).toBeUndefined();
  });

  it('boots exactly as today on an empty record', () => {
    expect(planRestore(undefined, probe())).toEqual({ tabs: [] });
    expect(planRestore({ tabs: [], active: { kind: 'home' } }, probe())).toEqual({ tabs: [] });
  });
});

describe('a worktree that is gone', () => {
  it('drops from the set and leaves the others intact', () => {
    const record: WindowRecord = {
      tabs: [tab('one'), tab('gone'), tab('three')],
      active: { kind: 'home' },
    };
    const p = probe({ exists: (path) => path !== '/w/gone' });

    expect(paths(record, p)).toEqual(['/w/one', '/w/three']);
  });

  it('falls back to home when it was the active one, rather than stranding the window', () => {
    const record: WindowRecord = {
      tabs: [tab('one'), tab('gone')],
      active: { kind: 'tab', workspacePath: '/w/gone' },
    };
    const p = probe({ exists: (path) => path !== '/w/gone' });

    expect(planRestore(record, p).activate).toBeUndefined();
  });

  it('falls back to home for an active project that was never a member', () => {
    const record: WindowRecord = {
      tabs: [tab('one')],
      active: { kind: 'tab', workspacePath: '/w/never' },
    };

    expect(planRestore(record, probe()).activate).toBeUndefined();
  });
});

describe('what is already open', () => {
  it('is not minted twice — one tab per worktree', () => {
    const record: WindowRecord = { tabs: [tab('one'), tab('two')], active: { kind: 'home' } };
    const p = probe({ isOpen: (path) => path === '/w/one' });

    expect(paths(record, p)).toEqual(['/w/two']);
  });

  it('is still activatable when the record named it', () => {
    const record: WindowRecord = {
      tabs: [tab('one')],
      active: { kind: 'tab', workspacePath: '/w/one' },
    };
    const p = probe({ isOpen: (path) => path === '/w/one' });

    expect(planRestore(record, p)).toEqual({ tabs: [], activate: '/w/one' });
  });

  it('collapses a record that lists the same worktree twice', () => {
    const record: WindowRecord = { tabs: [tab('one'), tab('one')], active: { kind: 'home' } };

    expect(paths(record)).toEqual(['/w/one']);
  });
});
