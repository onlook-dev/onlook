import { describe, expect, it } from 'bun:test';
import type { TabsState, TabStatus, TabSummary } from '@studio/events';
import { updateDockBadge } from './dock-badge.js';
import { statusToRecord } from './status.js';

function tab(id: string, status?: TabStatus): TabSummary {
  return { id, name: id, purpose: 'project', ...(status === undefined ? {} : { status }) };
}

function state(tabs: TabSummary[], activeId = 'active'): TabsState {
  return { tabs, activeId, canCreate: true, isHome: false };
}

function badge(current: TabsState): string {
  let text = 'unchanged';
  updateDockBadge(current, { setBadge: (next) => { text = next; } });
  return text;
}

describe('Dock tab attention badge', () => {
  it('clears the badge with no tabs, idle tabs, or working tabs', () => {
    expect(badge(state([]))).toBe('');
    expect(badge(state([tab('active'), tab('working', 'working')]))).toBe('');
  });

  it('counts waiting and unseen finished tabs, not working or idle tabs', () => {
    expect(badge(state([tab('active'), tab('question', 'waiting'), tab('finished', 'done'), tab('another', 'done'), tab('busy', 'working')]))).toBe('3');
  });

  it('keeps an active waiting tab counted but excludes an active finished tab', () => {
    expect(badge(state([tab('active', 'waiting'), tab('finished', 'done')]))).toBe('2');
    expect(badge(state([tab('active', 'done'), tab('finished', 'done')]))).toBe('1');
  });

  it('shows the exact number above nine and counts tabs rather than workspaces', () => {
    const tabs = Array.from({ length: 12 }, (_, index) => ({ ...tab(`tab-${index}`, 'waiting'), workspacePath: '/shared' }));
    expect(badge(state(tabs))).toBe('12');
  });

  it('tracks visits, answers, and closure through to zero', () => {
    const calls: string[] = [];
    const dock = { setBadge: (text: string) => { calls.push(text); } };
    const finished = tab('finished', statusToRecord('done', false));
    const waiting = tab('waiting', 'waiting');
    updateDockBadge(state([tab('active'), finished, waiting]), dock);
    updateDockBadge(state([finished, waiting], 'finished'), dock);
    updateDockBadge(state([tab('finished'), waiting], 'waiting'), dock);
    updateDockBadge(state([tab('finished'), tab('waiting', 'working')], 'waiting'), dock);
    updateDockBadge(state([tab('finished', 'done'), tab('waiting', 'waiting')], 'active'), dock);
    updateDockBadge(state([tab('waiting', 'waiting')]), dock);
    updateDockBadge(state([]), dock);
    expect(calls).toEqual(['2', '1', '1', '', '2', '1', '']);
  });

  it('does not retain a prior badge when a fresh host publishes restored tabs', () => {
    const calls: string[] = [];
    const dock = { setBadge: (text: string) => { calls.push(text); } };
    updateDockBadge(state([tab('old', 'waiting')]), dock);
    updateDockBadge(state([tab('old')]), dock);
    expect(calls).toEqual(['1', '']);
  });

  it('does nothing on platforms without a Dock', () => {
    expect(() => updateDockBadge(state([tab('waiting', 'waiting')]), undefined)).not.toThrow();
  });

  it('clears when the last waiting project becomes the Projects view', () => {
    const calls: string[] = [];
    const dock = { setBadge: (text: string) => { calls.push(text); } };
    const waiting = tab('active', 'waiting');
    updateDockBadge(state([waiting]), dock);
    updateDockBadge(state([{ ...waiting, purpose: 'projects' }]), dock);
    expect(calls).toEqual(['1', '']);
    expect(badge(state([{ ...tab('closed', 'done'), purpose: 'projects' }]))).toBe('');
  });
});
