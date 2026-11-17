import { describe, expect, it } from 'bun:test';
import { waitForFilledScreen, type FilledScreenSignals } from './show-gate.js';

const OURS = { id: 'ours' };
const ANOTHER_WINDOW = { id: 'another' };

function fakeSignals(): {
  signals: FilledScreenSignals;
  report: (source: unknown) => void;
  rendererGone: () => void;
  isReportListenerRemoved: () => boolean;
} {
  let reportListener: ((source: unknown) => void) | undefined;
  let goneListener: (() => void) | undefined;
  let removals = 0;

  return {
    signals: {
      onReport: (listener) => {
        reportListener = listener;
        return () => {
          removals += 1;
        };
      },
      isExpectedSource: (source) => source === OURS,
      onRendererGone: (listener) => {
        goneListener = listener;
      },
    },
    report: (source) => reportListener?.(source),
    rendererGone: () => goneListener?.(),
    isReportListenerRemoved: () => removals > 0,
  };
}

async function settledWithin<T>(promise: Promise<T>, ms: number): Promise<T | 'pending'> {
  return Promise.race([
    promise,
    new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), ms)),
  ]);
}

describe('waitForFilledScreen', () => {
  it('ignores a report from a window that is not ours', async () => {
    const fake = fakeSignals();
    const waiting = waitForFilledScreen(fake.signals, 10_000);

    fake.report(ANOTHER_WINDOW);

    expect(await settledWithin(waiting, 50)).toBe('pending');
    expect(fake.isReportListenerRemoved()).toBe(false);
  });

  it('settles on our own report, and stops listening', async () => {
    const fake = fakeSignals();
    const waiting = waitForFilledScreen(fake.signals, 10_000);

    fake.report(OURS);

    expect(await waiting).toBe('reported');
    expect(fake.isReportListenerRemoved()).toBe(true);
  });

  it('settles on the backstop when nothing reports', async () => {
    const fake = fakeSignals();

    expect(await waitForFilledScreen(fake.signals, 20)).toBe('timeout');
    expect(fake.isReportListenerRemoved()).toBe(true);
  });

  it('settles when the renderer dies, rather than waiting out the backstop', async () => {
    const fake = fakeSignals();
    const waiting = waitForFilledScreen(fake.signals, 10_000);

    fake.rendererGone();

    expect(await waiting).toBe('renderer-gone');
    expect(fake.isReportListenerRemoved()).toBe(true);
  });
});
