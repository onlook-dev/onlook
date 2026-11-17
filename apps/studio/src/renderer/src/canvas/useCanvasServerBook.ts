import { useEffect } from 'react';
import type { ServerEntryState } from '@studio/events';
import { useServerStore } from '../server/store.js';
import { useCanvasStore } from './store.js';

export function newlyLiveServerPorts(
  previous: readonly ServerEntryState[],
  current: readonly ServerEntryState[],
): number[] {
  const previousByEntryId = new Map<string, ServerEntryState>();
  for (const entry of previous) {
    if (!previousByEntryId.has(entry.entryId)) previousByEntryId.set(entry.entryId, entry);
  }
  const live: number[] = [];
  for (const entry of current) {
    const previousMeasuredByPort = new Map<number, ServerEntryState['ports'][number]['measured']>();
    for (const port of previousByEntryId.get(entry.entryId)?.ports ?? []) {
      if (!previousMeasuredByPort.has(port.port)) {
        previousMeasuredByPort.set(port.port, port.measured);
      }
    }
    for (const port of entry.ports) {
      if (port.measured === 'live' && previousMeasuredByPort.get(port.port) !== 'live') {
        live.push(port.port);
      }
    }
  }
  return live;
}

export function useCanvasServerBook(followServerPort: (port: number) => void): void {
  useEffect(() => {
    const applyServerBook = useCanvasStore.getState().applyServerBook;
    applyServerBook(useServerStore.getState().entries);
    return useServerStore.subscribe((state, previous) => {
      applyServerBook(state.entries);
      for (const port of newlyLiveServerPorts(previous.entries, state.entries)) {
        followServerPort(port);
      }
    });
  }, [followServerPort]);
}
