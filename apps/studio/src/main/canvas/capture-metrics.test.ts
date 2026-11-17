import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { performance } from 'node:perf_hooks';
import { makeStateRoot } from '@studio/fixtures';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from '../telemetry/index.js';
import { frameCaptureFailureReason, measureFrameCapture } from './capture-metrics.js';

describe('Frame capture attempt metrics', () => {
  beforeEach(() => recordLinesForTesting());
  afterEach(() => resetLogForTesting());

  it('records elapsed main-side time for both success and failure', async () => {
    let clockMs = 100;
    const clock = spyOn(performance, 'now').mockImplementation(() => clockMs);
    try {
      await measureFrameCapture(async () => {
        clockMs = 123;
        return { ok: true, pngBase64: 'private image' };
      });
      await measureFrameCapture(async () => {
        clockMs = 175;
        return { ok: false, reason: 'FRAME_CAPTURE_TIMEOUT: private page' };
      });
      expect(peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed').map((line) => line['duration_ms'])).toEqual([23, 52]);
    } finally {
      clock.mockRestore();
    }
  });

  it('records how long the freeze covered the tab and whether the move was answered late (ONL-3031)', async () => {
    await measureFrameCapture(async () => ({ ok: false, reason: 'FRAME_VIEW_LATE: late' }), { viewMoved: false, revealMs: 0, geometry: null, freezeMs: 1_240, moveAnsweredLate: true });
    await measureFrameCapture(async () => ({ ok: true, pngBase64: 'private image' }));
    const lines = peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed');
    expect(lines.map((line) => [line['failure_reason'], line['freeze_ms'], line['move_answered_late']])).toEqual([
      ['view-late', 1_240, true], ['none', 0, false],
    ]);
  });

  it('counts a successful screenshot once without recording the image', async () => {
    const result = { ok: true as const, pngBase64: 'private image' };
    expect(await measureFrameCapture(async () => result)).toBe(result);
    const lines = peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ outcome: 'success', failure_reason: 'none', duration_ms: expect.any(Number) });
    expect(JSON.stringify(lines)).not.toContain('private image');
  });

  it('counts a failed screenshot once without recording page names or error contents', async () => {
    const result = { ok: false as const, reason: 'FRAME_CAPTURE_TIMEOUT: private page details' };
    expect(await measureFrameCapture(async () => result)).toBe(result);
    const lines = peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ outcome: 'failure', failure_reason: 'timeout' });
    expect(JSON.stringify(lines)).not.toContain('private page details');
  });

  it('counts an unexpected exception while preserving its rejection', async () => {
    const failure = new Error('private exception');
    await expect(measureFrameCapture(async () => { throw failure; })).rejects.toBe(failure);
    const lines = peekLinesForTesting().filter((line) => line.msg === 'capture_frame completed');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ outcome: 'failure', failure_reason: 'internal-error' });
    expect(JSON.stringify(lines)).not.toContain('private exception');
  });

  it('separates stricter image checks from compositor failures and unmounted pages', () => {
    const cases = [
      ["this session's project is no longer open", 'project-closed'],
      ['frame x is on page "Private", which the canvas is not showing', 'off-page'],
      ['frame x has no live page', 'missing-page'],
      ["frame x's page went away before the command ran", 'missing-page'],
      ['FRAME_CAPTURE_TIMEOUT: deadline', 'timeout'],
      ['FRAME_PAGE_CHANGED: navigation', 'page-changed'],
      ['FRAME_VIEWPORT_CHANGED: resize', 'viewport-changed'],
      ['FRAME_VIEW_LATE: the tab did not answer the move', 'view-late'],
      ['FRAME_NOT_VISIBLE: captured 0x0', 'incomplete-image'],
      ['FRAME_NOT_VISIBLE: could not capture (UnknownVizError)', 'compositor-error'],
      ['unexpected message with a private URL', 'capture-error'],
    ] as const;
    for (const [reason, expected] of cases) expect(frameCaptureFailureReason(reason)).toBe(expected);
  });

  it('queues the denominator and categorized failures only when telemetry is enabled', async () => {
    const stateRoot = makeStateRoot({ name: 'capture-metrics' });
    const originalRoot = process.env['STUDIO_STATE_ROOT'];
    const originalKey = process.env['STUDIO_POSTHOG_KEY'];
    const originalTelemetry = process.env['STUDIO_TELEMETRY'];
    process.env['STUDIO_STATE_ROOT'] = stateRoot;
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    setAppForTesting({ getPath: () => stateRoot, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
    initTelemetry();
    try {
      await measureFrameCapture(async () => ({ ok: true, pngBase64: 'private image' }));
      await measureFrameCapture(async () => ({ ok: false, reason: 'FRAME_NOT_VISIBLE: captured 0x0 at private URL' }));
      const attempts = peekQueueForTesting().filter((event) => event.event === 'frame_capture_completed');
      expect(attempts).toHaveLength(2);
      expect(attempts.map((event) => [event.properties['outcome'], event.properties['failure_reason']])).toEqual([
        ['success', 'none'], ['failure', 'incomplete-image'],
      ]);
      expect(JSON.stringify(attempts)).not.toContain('private');
      resetTelemetryForTesting();
      process.env['STUDIO_TELEMETRY'] = '0';
      initTelemetry();
      await measureFrameCapture(async () => ({ ok: true, pngBase64: 'private image' }));
      expect(peekQueueForTesting()).toHaveLength(0);
    } finally {
      resetTelemetryForTesting();
      setAppForTesting(undefined);
      if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
      else process.env['STUDIO_STATE_ROOT'] = originalRoot;
      if (originalKey === undefined) delete process.env['STUDIO_POSTHOG_KEY'];
      else process.env['STUDIO_POSTHOG_KEY'] = originalKey;
      if (originalTelemetry === undefined) delete process.env['STUDIO_TELEMETRY'];
      else process.env['STUDIO_TELEMETRY'] = originalTelemetry;
    }
  });
});
