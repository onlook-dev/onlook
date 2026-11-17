export interface FilledScreenSignals {
  onReport: (listener: (source: unknown) => void) => () => void;
  isExpectedSource: (source: unknown) => boolean;
  onRendererGone: (listener: () => void) => void;
}

export type FilledScreenOutcome = 'reported' | 'timeout' | 'renderer-gone';

/** The backstop is what keeps a renderer that throws before reporting from holding the window closed forever (ONL-1948). */
export function waitForFilledScreen(
  signals: FilledScreenSignals,
  timeoutMs: number,
): Promise<FilledScreenOutcome> {
  return new Promise<FilledScreenOutcome>((resolve) => {
    let settled = false;
    let removeReport: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (outcome: FilledScreenOutcome): void => {
      // `onRendererGone` is a one-shot that cannot be unregistered.
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      removeReport?.();
      resolve(outcome);
    };

    removeReport = signals.onReport((source) => {
      if (signals.isExpectedSource(source)) settle('reported');
    });
    signals.onRendererGone(() => {
      settle('renderer-gone');
    });
    timer = setTimeout(() => {
      settle('timeout');
    }, timeoutMs);
  });
}
