import { beforeEach, describe, expect, it } from 'bun:test';
import { REPORT_MESSAGE_MAX, type ReportSubmitOutcome, type ReportSubmitRequest } from '@studio/events';
import {
  canSend,
  COUNTER_SHOWS_WITHIN,
  dismissReport,
  openReport,
  reportMessageRows,
  reportPayload,
  resetReportForTesting,
  sendReport,
  sendsOnKey,
  setReportDraft,
  showsCounter,
  subscribeToReportOpen,
  useReportStore,
} from './store.js';

interface FakeBridge {
  install: () => void;
  emitOpen: (lane: 'bug' | 'feature') => void;
  answer: (outcome: ReportSubmitOutcome) => Promise<void>;
  rejectNext: () => void;
  settle: () => Promise<void>;
  submits: ReportSubmitRequest[];
  subscriptions: number;
}

function fakeBridge(): FakeBridge {
  const submits: ReportSubmitRequest[] = [];
  const pending: Array<(outcome: ReportSubmitOutcome) => void> = [];
  let openListener: ((open: { lane: 'bug' | 'feature' }) => void) | undefined;
  let refuses = false;
  const facts = { subscriptions: 0 };

  const bridge = {
    reportSubmit: (request: ReportSubmitRequest): Promise<ReportSubmitOutcome> => {
      submits.push(request);
      if (refuses) return Promise.reject(new Error('bridge refused'));
      return new Promise((resolve) => pending.push(resolve));
    },
    onReportOpen: (listener: (open: { lane: 'bug' | 'feature' }) => void): (() => void) => {
      facts.subscriptions += 1;
      openListener = listener;
      return () => {};
    },
  };

  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', { value: { studio: bridge }, configurable: true, writable: true });
    },
    emitOpen(lane): void {
      openListener?.({ lane });
    },
    async answer(outcome): Promise<void> {
      pending.shift()?.(outcome);
      await settle();
    },
    rejectNext(): void {
      refuses = true;
    },
    settle,
    submits,
    get subscriptions(): number {
      return facts.subscriptions;
    },
  };
}

let bridge: FakeBridge;

beforeEach(() => {
  resetReportForTesting();
  bridge = fakeBridge();
  bridge.install();
});

describe('the one dialog', () => {
  it('stays one dialog with the draft when the second door opens it', async () => {
    subscribeToReportOpen();
    subscribeToReportOpen();
    bridge.emitOpen('bug');
    await bridge.settle();
    setReportDraft('the frame went blank');

    openReport('canvas', 'bug');

    const state = useReportStore.getState();
    expect(state.status.kind).toBe('composing');
    expect(state.draft).toBe('the frame went blank');
    expect(state.entryPoint).toBe('canvas');
    expect(bridge.subscriptions).toBe(1);
  });

  it('takes the opener lane while composing and starts fresh after a send closes it', async () => {
    openReport('menu', 'bug');
    setReportDraft('half a sentence');

    openReport('canvas', 'feature');
    expect(useReportStore.getState().lane).toBe('feature');
    expect(useReportStore.getState().draft).toBe('half a sentence');

    sendReport();
    await bridge.answer({ kind: 'queued' });
    expect(useReportStore.getState().status.kind).toBe('closed');

    openReport('menu', 'bug');
    expect(useReportStore.getState().status.kind).toBe('composing');
    expect(useReportStore.getState().draft).toBe('');
    expect(useReportStore.getState().lane).toBe('bug');
  });

  it('keeps the lane and the words through a cancel', () => {
    openReport('menu', 'feature');
    setReportDraft('a thought');
    dismissReport();

    expect(useReportStore.getState().status.kind).toBe('closed');

    openReport('menu', 'feature');
    expect(useReportStore.getState().draft).toBe('a thought');
    expect(useReportStore.getState().lane).toBe('feature');
  });
});

describe('what can be sent', () => {
  it('keeps the count out of the way until the bound is in reach, and holds it past the bound', () => {
    const atThreshold = 'a'.repeat(REPORT_MESSAGE_MAX - COUNTER_SHOWS_WITHIN);

    expect(showsCounter('')).toBe(false);
    expect(showsCounter(atThreshold.slice(0, -1))).toBe(false);
    expect(showsCounter(atThreshold)).toBe(true);
    expect(showsCounter('a'.repeat(REPORT_MESSAGE_MAX))).toBe(true);
    expect(showsCounter('a'.repeat(REPORT_MESSAGE_MAX + 50))).toBe(true);
  });

  it('refuses nothing, whitespace and a message past the bound', () => {
    expect(canSend('')).toBe(false);
    expect(canSend('   \n  ')).toBe(false);
    expect(canSend('a'.repeat(REPORT_MESSAGE_MAX + 1))).toBe(false);
    expect(canSend('a'.repeat(REPORT_MESSAGE_MAX))).toBe(true);
  });

  it('sends the trimmed words with the lane and the entry point', () => {
    openReport('canvas', 'feature');
    setReportDraft('  a wish  ');

    expect(reportPayload(useReportStore.getState())).toEqual({
      lane: 'feature',
      entryPoint: 'canvas',
      message: 'a wish',
    });
  });

  it('sends from the keyboard on Cmd+Enter and leaves every other Enter to the message', () => {
    const enter = { key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, isComposing: false };

    expect(sendsOnKey({ ...enter, metaKey: true })).toBe(true);
    expect(sendsOnKey({ ...enter, ctrlKey: true })).toBe(true);
    expect(sendsOnKey(enter)).toBe(false);
    expect(sendsOnKey({ ...enter, shiftKey: true })).toBe(false);
    expect(sendsOnKey({ ...enter, metaKey: true, shiftKey: true })).toBe(false);
    expect(sendsOnKey({ ...enter, metaKey: true, altKey: true })).toBe(false);
    expect(sendsOnKey({ ...enter, metaKey: true, isComposing: true })).toBe(false);
    expect(sendsOnKey({ ...enter, key: 'a', metaKey: true })).toBe(false);
  });

  it('holds the dialog open and sends once while a send is in flight', async () => {
    openReport('menu', 'bug');
    setReportDraft('it broke');
    sendReport();

    sendReport();
    dismissReport();

    expect(useReportStore.getState().status.kind).toBe('sending');
    expect(bridge.submits).toHaveLength(1);

    await bridge.answer({ kind: 'sent' });
    expect(useReportStore.getState().status.kind).toBe('closed');
  });
});

describe('the stated outcome', () => {
  it('refuses with the words kept when the build cannot send', async () => {
    openReport('menu', 'bug');
    setReportDraft('it broke');
    sendReport();
    await bridge.answer({ kind: 'refused', reason: 'disabled' });

    const state = useReportStore.getState();
    expect(state.status).toEqual({ kind: 'refused', reason: 'disabled' });
    expect(state.draft).toBe('it broke');
  });

  it('reads a volume refusal as its own refusal', async () => {
    openReport('menu', 'bug');
    setReportDraft('again');
    sendReport();
    await bridge.answer({ kind: 'refused', reason: 'too-many' });

    expect(useReportStore.getState().status).toEqual({ kind: 'refused', reason: 'too-many' });
  });

  it('refuses rather than swallowing a bridge refusal', async () => {
    bridge.rejectNext();
    openReport('menu', 'bug');
    setReportDraft('it broke');
    sendReport();
    await bridge.settle();

    expect(useReportStore.getState().status).toEqual({ kind: 'refused', reason: 'lost' });
    expect(useReportStore.getState().draft).toBe('it broke');
  });

  it('keeps the words when a refusal is reopened from a door, and clears them only after a thank-you', async () => {
    openReport('menu', 'bug');
    setReportDraft('the canvas froze');
    sendReport();
    await bridge.answer({ kind: 'refused', reason: 'disabled' });

    openReport('canvas', 'bug');
    expect(useReportStore.getState().draft).toBe('the canvas froze');
    expect(useReportStore.getState().status).toEqual({ kind: 'composing' });

    sendReport();
    await bridge.answer({ kind: 'queued' });
    openReport('menu', 'bug');
    expect(useReportStore.getState().draft).toBe('');
  });

  it('leaves a send in flight alone when a door opens the form again', async () => {
    openReport('menu', 'bug');
    setReportDraft('still typing');
    sendReport();

    openReport('canvas', 'feature');
    expect(useReportStore.getState().status).toEqual({ kind: 'sending' });
    expect(useReportStore.getState().draft).toBe('still typing');

    await bridge.answer({ kind: 'queued' });
    expect(bridge.submits).toHaveLength(1);
  });
});

describe('what the form gives back so its last line stays above the footer', () => {
  it('shrinks the message field for every row the form gains above the disclosure', () => {
    const plain = reportMessageRows({ hasPicker: false, hasSendError: false });
    const withPicker = reportMessageRows({ hasPicker: true, hasSendError: false });
    const refused = reportMessageRows({ hasPicker: true, hasSendError: true });

    expect(withPicker).toBeLessThan(plain);
    expect(refused).toBeLessThan(withPicker);
  });
});
