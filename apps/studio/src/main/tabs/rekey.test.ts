import { describe, expect, it } from 'bun:test';
import { rekeyed } from './rekey.js';

describe('a warmed tab takes the spare id (ONL-2318)', () => {
  it('replaces the id in place, keeping the order the user dragged', () => {
    const next = rekeyed({ order: ['tab-1', 'tab-2', 'tab-3'], activeId: undefined }, 'tab-2', 'tab-9');

    expect(next.order).toEqual(['tab-1', 'tab-9', 'tab-3']);
  });

  it('follows the active pointer, so the warmed tab stays forward', () => {
    const next = rekeyed({ order: ['tab-1', 'tab-2'], activeId: 'tab-2' }, 'tab-2', 'tab-9');

    expect(next.activeId).toBe('tab-9');
  });

  it('leaves an active pointer that names another tab alone', () => {
    const next = rekeyed({ order: ['tab-1', 'tab-2'], activeId: 'tab-1' }, 'tab-2', 'tab-9');

    expect(next.activeId).toBe('tab-1');
  });
});
