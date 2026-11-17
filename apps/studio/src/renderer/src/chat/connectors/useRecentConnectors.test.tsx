import '../../testing/dom.js';
import { describe, expect, it, spyOn } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConnectorInventory } from '@studio/events';
import { CONNECTOR_HIGHLIGHT_MS, recentConnectors, useRecentConnectors, type RecentConnectors } from './useRecentConnectors.js';

const inventory = (...ids: string[]): ConnectorInventory => ({ servers: ids.map((id) => ({ id, name: id, state: 'connected' })) });
const initial = (): RecentConnectors => ({ scope: 'project', deadlines: new Map() });
const observe = (state: RecentConnectors, next: ConnectorInventory | undefined, now = 0, scope = 'project'): RecentConnectors => recentConnectors(state, { type: 'inventory', scope, inventory: next, now });

describe('new connector feedback', () => {
  it('baselines discovery and relaunch without highlighting existing tools', () => {
    const loading = observe(initial(), undefined);
    expect(observe(loading, inventory('docs')).deadlines.size).toBe(0);
    expect(observe(initial(), inventory('docs', 'search')).deadlines.size).toBe(0);
  });

  it('expires additions independently after 20 seconds without extending them on refresh', () => {
    const baseline = observe(initial(), inventory('existing'));
    const first = observe(baseline, inventory('existing', 'docs'), 100);
    const second = observe(first, inventory('existing', 'docs', 'search'), 1_000);
    const refreshed = observe(second, inventory('existing', 'docs', 'search'), 2_000);
    expect([...refreshed.deadlines]).toEqual([['docs', 20_100], ['search', 21_000]]);
    expect([...recentConnectors(refreshed, { type: 'expire', now: 20_100 }).deadlines.keys()]).toEqual(['search']);
    expect(recentConnectors(refreshed, { type: 'expire', now: 21_000 }).deadlines.size).toBe(0);
  });

  it('ignores unavailable inventories, drops removed tools, and resets between projects', () => {
    const added = observe(observe(initial(), inventory('old')), inventory('old', 'docs'), 100);
    const unavailable = observe(added, { servers: [], unavailable: true }, 200);
    expect(unavailable).toBe(added);
    expect([...observe(unavailable, inventory('old', 'docs'), 300).deadlines.keys()]).toEqual(['docs']);
    expect(observe(added, inventory('old'), 300).deadlines.size).toBe(0);
    expect(observe(added, inventory('elsewhere'), 300, 'other-project').deadlines.size).toBe(0);
  });

  it('does not acknowledge featured rows in Other tools', () => {
    const next = observe(observe(initial(), inventory()), { servers: [{ id: 'figma', name: 'Figma', state: 'connected', featured: 'figma' }] });
    expect(next.deadlines.size).toBe(0);
  });

  it('schedules one expiry, preserves feedback across menu renders and cleans up on unmount', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let now = 100;
    let expire: (() => void) | undefined;
    const clock = spyOn(Date, 'now').mockImplementation(() => now);
    const timers = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => { expire = callback; return 123; }) as typeof setTimeout);
    const cleared = spyOn(globalThis, 'clearTimeout');
    function Surface({ value, menuOpen = true }: { value: ConnectorInventory; menuOpen?: boolean }): React.JSX.Element {
      const recent = useRecentConnectors('project', value);
      return <div>{menuOpen ? [...recent].join(',') : ''}</div>;
    }
    const baseline = inventory('old');
    const added = inventory('old', 'docs');
    try {
      await act(async () => root.render(<Surface value={baseline} />));
      expect(timers).not.toHaveBeenCalled();
      await act(async () => root.render(<Surface value={added} />));
      expect(container.textContent).toBe('docs');
      expect(timers.mock.calls[0]?.[1]).toBe(CONNECTOR_HIGHLIGHT_MS);
      await act(async () => root.render(<Surface value={added} menuOpen={false} />));
      await act(async () => root.render(<Surface value={added} />));
      expect(container.textContent).toBe('docs');
      expect(timers).toHaveBeenCalledTimes(1);
      now += CONNECTOR_HIGHLIGHT_MS;
      await act(async () => expire?.());
      expect(container.textContent).toBe('');
      expect(cleared).toHaveBeenCalledWith(123);
    } finally {
      await act(async () => root.unmount());
      timers.mockRestore();
      cleared.mockRestore();
      clock.mockRestore();
    }
  });
});
