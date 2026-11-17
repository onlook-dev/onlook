import { beforeEach, describe, expect, it } from 'bun:test';
import { REPORT_MESSAGE_MAX, type ReportSubmitRequest } from '@studio/events';
import type { DurableOutcome } from '../telemetry/index.js';
import {
  MIN_REPORT_INTERVAL_MS,
  REPORTS_PER_LAUNCH,
  resetReportBoundsForTesting,
  submitReport,
  type ReportDeps,
} from './index.js';
import type { ReportProperties } from './payload.js';

const INSTALL_ID = '11111111-2222-3333-4444-555555555555';

function harness(outcome: DurableOutcome = 'queued'): {
  deps: ReportDeps;
  captured: ReportProperties[];
  advance: (ms: number) => void;
} {
  const captured: ReportProperties[] = [];
  let clock = 1_000_000;
  return {
    captured,
    advance: (ms) => {
      clock += ms;
    },
    deps: {
      capture: async (properties) => {
        captured.push(properties);
        return outcome;
      },
      installId: () => INSTALL_ID,
      identity: () => null,
      now: () => clock,
    },
  };
}

function request(over: Partial<ReportSubmitRequest> = {}): ReportSubmitRequest {
  return { lane: 'bug', entryPoint: 'menu', message: 'the canvas froze', ...over };
}

beforeEach(resetReportBoundsForTesting);

describe('the submit channel behind the form', () => {
  it('refuses a message past the bound the form would have clamped, and captures nothing', async () => {
    const { deps, captured } = harness();

    const outcome = await submitReport(request({ message: 'x'.repeat(REPORT_MESSAGE_MAX + 1) }), deps);

    expect(outcome).toEqual({ kind: 'refused', reason: 'too-long' });
    expect(captured).toEqual([]);
  });

  it('refuses an empty message before it reaches the capture', async () => {
    const { deps, captured } = harness();

    expect(await submitReport(request({ message: '   ' }), deps)).toEqual({
      kind: 'refused',
      reason: 'empty',
    });
    expect(captured).toEqual([]);
  });

  it('refuses a second report inside the minimum interval and takes one after it', async () => {
    const { deps, captured, advance } = harness();

    expect(await submitReport(request(), deps)).toEqual({ kind: 'queued' });
    expect(await submitReport(request(), deps)).toEqual({ kind: 'refused', reason: 'too-many' });

    advance(MIN_REPORT_INTERVAL_MS);

    expect(await submitReport(request(), deps)).toEqual({ kind: 'queued' });
    expect(captured).toHaveLength(2);
  });

  it('refuses past the per-launch bound and captures nothing more', async () => {
    const { deps, captured, advance } = harness();

    for (let i = 0; i < REPORTS_PER_LAUNCH; i += 1) {
      expect(await submitReport(request(), deps)).toEqual({ kind: 'queued' });
      advance(MIN_REPORT_INTERVAL_MS);
    }

    expect(await submitReport(request(), deps)).toEqual({ kind: 'refused', reason: 'too-many' });
    expect(captured).toHaveLength(REPORTS_PER_LAUNCH);
  });

  it('answers a thank-you for a durable queue and for an already-sent report', async () => {
    for (const [durable, kind] of [
      ['queued', 'queued'],
      ['sent', 'sent'],
    ] as const) {
      resetReportBoundsForTesting();
      const { deps } = harness(durable);
      expect(await submitReport(request(), deps)).toEqual({ kind });
    }
  });

  it('distinguishes a build that cannot send from a report that was lost', async () => {
    resetReportBoundsForTesting();
    expect(await submitReport(request(), harness('disabled').deps)).toEqual({
      kind: 'refused',
      reason: 'disabled',
    });

    resetReportBoundsForTesting();
    expect(await submitReport(request(), harness('lost').deps)).toEqual({
      kind: 'refused',
      reason: 'lost',
    });
  });

  it('spends no slot on a report the capture would not take, so a keyless build never blames volume', async () => {
    const { deps, captured } = harness('disabled');

    for (let i = 0; i < REPORTS_PER_LAUNCH + 2; i += 1) {
      expect(await submitReport(request(), deps)).toEqual({ kind: 'refused', reason: 'disabled' });
    }

    expect(captured).toHaveLength(REPORTS_PER_LAUNCH + 2);
  });

  it('arms the interval only once a report was taken', async () => {
    const { deps } = harness('lost');

    expect(await submitReport(request(), deps)).toEqual({ kind: 'refused', reason: 'lost' });
    expect(await submitReport(request(), deps)).toEqual({ kind: 'refused', reason: 'lost' });
  });

  it('refuses before telemetry has an install id rather than sending an id-less report', async () => {
    const { deps, captured } = harness();

    const outcome = await submitReport(request(), { ...deps, installId: () => undefined });

    expect(outcome).toEqual({ kind: 'refused', reason: 'disabled' });
    expect(captured).toEqual([]);
  });
});
