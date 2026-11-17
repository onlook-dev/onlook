import { describe, expect, it } from 'bun:test';
import { ClosedTabs, reopenPlan } from './reopen.js';

const always = (): boolean => true;

describe('closed tabs', () => {
  it('reopens the most recently closed tab first', () => {
    const closed = new ClosedTabs();
    closed.push({ workspacePath: '/a', index: 0 });
    closed.push({ workspacePath: '/b', index: 2 });
    expect(closed.take(always)).toEqual({ workspacePath: '/b', index: 2 });
    expect(closed.take(always)).toEqual({ workspacePath: '/a', index: 0 });
    expect(closed.take(always)).toBeUndefined();
  });

  it('skips a workspace that can no longer open and drops it', () => {
    const closed = new ClosedTabs();
    closed.push({ workspacePath: '/a', index: 0 });
    closed.push({ workspacePath: '/gone', index: 1 });
    expect(closed.take((path) => path !== '/gone')?.workspacePath).toBe('/a');
    expect(closed.take(always)).toBeUndefined();
  });

  it('keeps one entry per workspace and only the newest within the limit', () => {
    const closed = new ClosedTabs(2);
    closed.push({ workspacePath: '/a', index: 0 });
    closed.push({ workspacePath: '/b', index: 1 });
    closed.push({ workspacePath: '/a', index: 3 });
    closed.push({ workspacePath: '/c', index: 4 });
    expect(closed.take(always)?.workspacePath).toBe('/c');
    expect(closed.take(always)).toEqual({ workspacePath: '/a', index: 3 });
    expect(closed.take(always)).toBeUndefined();
  });

  it('answers whether any entry can reopen without spending one', () => {
    const closed = new ClosedTabs();
    expect(closed.has(always)).toBe(false);
    closed.push({ workspacePath: '/gone', index: 0 });
    expect(closed.has((path) => path !== '/gone')).toBe(false);
    expect(closed.has(always)).toBe(true);
    expect(closed.take(always)?.workspacePath).toBe('/gone');
  });
});

describe('what ⇧⌘T does with the newest closed tab', () => {
  const facts = (over: Partial<Parameters<typeof reopenPlan>[1]> = {}): Parameters<typeof reopenPlan>[1] => ({
    canReopen: () => true,
    openTabFor: () => undefined,
    isAtLimit: false,
    openCount: 2,
    ...over,
  });

  it('mints it back at its old place, clamped to the strip', () => {
    const closed = new ClosedTabs();
    closed.push({ workspacePath: '/a', index: 5 });
    expect(reopenPlan(closed, facts())).toEqual({ kind: 'mint', workspacePath: '/a', index: 2 });
  });

  it('activates the tab already holding that workspace', () => {
    const closed = new ClosedTabs();
    closed.push({ workspacePath: '/a', index: 0 });
    expect(reopenPlan(closed, facts({ openTabFor: () => 'tab-3' }))).toEqual({ kind: 'activate', tabId: 'tab-3' });
  });

  it('puts the entry back at the tab limit, so the next press still reaches it', () => {
    const closed = new ClosedTabs();
    closed.push({ workspacePath: '/a', index: 0 });
    expect(reopenPlan(closed, facts({ isAtLimit: true }))).toEqual({ kind: 'blocked' });
    expect(reopenPlan(closed, facts())).toEqual({ kind: 'mint', workspacePath: '/a', index: 0 });
  });

  it('does nothing when nothing can be reopened', () => {
    expect(reopenPlan(new ClosedTabs(), facts())).toEqual({ kind: 'none' });
  });
});
