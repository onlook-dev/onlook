import { describe, expect, it } from 'bun:test';
import type { ServerEntryState } from '@studio/events';
import { newlyLiveServerPorts } from './useCanvasServerBook.js';

function entry(entryId: string, ports: Array<{ port: number; measured: 'live' | 'unverified' }>): ServerEntryState {
  return { entryId, ports } as ServerEntryState;
}

describe('canvas server-book bridge decisions', () => {
  it('reports only ports that transitioned into live', () => {
    const before = [entry('a', [{ port: 3000, measured: 'unverified' }, { port: 3001, measured: 'live' }])];
    const after = [entry('a', [{ port: 3000, measured: 'live' }, { port: 3001, measured: 'live' }])];
    expect(newlyLiveServerPorts(before, after)).toEqual([3000]);
  });

  it('treats a newly observed live entry as a transition', () => {
    expect(newlyLiveServerPorts([], [entry('b', [{ port: 4400, measured: 'live' }])])).toEqual([4400]);
  });
});
