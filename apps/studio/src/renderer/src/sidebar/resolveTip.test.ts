import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { seedFlags } from '../flags/store.js';
import { INSPIRE_SPENT_KEY } from '../tips/early.js';
import { useInspireTipStore } from './footSeat.js';
import { resolveTip } from './resolveTip.js';

const sent: { event: string }[] = [];
const stored = new Map<string, string>();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

beforeEach(() => {
  sent.length = 0;
  stored.clear();
  useInspireTipStore.setState({ phases: {} });
  Object.defineProperty(globalThis, 'window', {
    value: {
      studio: { telemetryEvent: (payload: { event: string }) => sent.push(payload) },
      localStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) },
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  seedFlags();
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else Object.defineProperty(globalThis, 'window', originalWindow);
});

describe('resolving a first-run tip without the person acting on it (ONL-3261)', () => {
  it('with the tip switched off, spends the tip and sends nothing', () => {
    seedFlags({ 'blank-first-moment': false });
    resolveTip('/private/blank-project', { tip: 'inspire', reason: 'other_path' });
    expect(useInspireTipStore.getState().phases['/private/blank-project']).toBe('spent');
    expect(stored.get(INSPIRE_SPENT_KEY)).toContain('/private/blank-project');
    expect(sent).toEqual([]);
  });

  it('with the tip switched on, sends first_run_acted as before', () => {
    seedFlags({ 'blank-first-moment': true });
    resolveTip('/private/blank-project-on', { tip: 'inspire', reason: 'other_path' });
    expect(sent.map((payload) => payload.event)).toEqual(['first_run_acted']);
  });
});
