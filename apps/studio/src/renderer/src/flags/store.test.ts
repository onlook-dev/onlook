import { afterEach, describe, expect, it } from 'bun:test';
import { flagEnabled, primeFlags, seedFlags } from './store.js';
import type { StudioFlags } from '@studio/events';

function answering(answer: () => Promise<StudioFlags>): void {
  (globalThis as unknown as { window: { studio: { appFlags: () => Promise<StudioFlags> } } }).window = {
    studio: { appFlags: answer },
  };
}

afterEach(() => {
  seedFlags();
});

describe('the renderer flag store (ONL-2661)', () => {
  it('reads off before main has answered', () => {
    expect(flagEnabled('sections')).toBe(false);
    expect(flagEnabled('connectors')).toBe(false);
    expect(flagEnabled('touchedFiles')).toBe(false);
  });

  it('keeps touched files off until main explicitly opts in and after a legacy answer', async () => {
    seedFlags({ sections: false, connectors: false, touchedFiles: true });
    expect(flagEnabled('touchedFiles')).toBe(true);
    seedFlags();
    answering(async () => ({ sections: false, connectors: false }) as StudioFlags);
    await primeFlags();
    expect(flagEnabled('touchedFiles')).toBe(false);
  });

  it('takes main answer', async () => {
    answering(async () => ({ sections: true, connectors: true, 'invite-tip': true, 'prompt-tip': true, 'frame-covers': true, 'blank-first-moment': true, 'rail-foot': true, 'start-control': true, 'machine-check': true }));
    await primeFlags();
    expect(flagEnabled('sections')).toBe(true);
    expect(flagEnabled('connectors')).toBe(true);
  });

  it('keeps connectors off until a delayed main answer arrives', async () => {
    const { promise, resolve } = Promise.withResolvers<StudioFlags>();
    answering(() => promise);
    const priming = primeFlags();
    expect(flagEnabled('connectors')).toBe(false);
    resolve({ sections: false, connectors: true, 'invite-tip': true, 'prompt-tip': true, 'frame-covers': true, 'blank-first-moment': true, 'rail-foot': true, 'start-control': true, 'machine-check': true });
    await priming;
    expect(flagEnabled('connectors')).toBe(true);
  });

  it('stays off when the bridge refuses, rather than failing the screen it gates', async () => {
    answering(() => Promise.reject(new Error('no bridge')));
    await primeFlags();
    expect(flagEnabled('sections')).toBe(false);
  });
});
