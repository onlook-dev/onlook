import { performance } from 'node:perf_hooks';
import type { FrameCaptureResult } from '@studio/events';
import { log } from '../log/index.js';
import { capture } from '../telemetry/index.js';
import type { FrameCaptureFailure, TelemetryEventMap } from '../telemetry/events.js';
import type { RevealFacts } from './capture-view.js';

type FailureReason = FrameCaptureFailure;

export function frameCaptureFailureReason(reason: string): FailureReason {
  if (reason === "this session's project is no longer open") return 'project-closed';
  if (reason.includes('which the canvas is not showing')) return 'off-page';
  if (reason.includes('has no live page') || reason.includes('page went away before the command ran')) return 'missing-page';
  if (reason.startsWith('FRAME_CAPTURE_TIMEOUT:')) return 'timeout';
  if (reason.startsWith('FRAME_VIEW_BUSY:')) return 'view-busy';
  if (reason.startsWith('FRAME_VIEW_LATE:')) return 'view-late';
  if (reason.startsWith('FRAME_PAGE_CHANGED:')) return 'page-changed';
  if (reason.startsWith('FRAME_VIEWPORT_CHANGED:')) return 'viewport-changed';
  if (reason.startsWith('FRAME_NOT_VISIBLE: captured ')) return 'incomplete-image';
  if (reason.includes('UnknownVizError')) return 'compositor-error';
  return 'capture-error';
}

export async function measureFrameCapture(
  run: (revealed: RevealFacts) => Promise<FrameCaptureResult>,
  revealed: RevealFacts = { viewMoved: false, revealMs: 0, geometry: null },
): Promise<FrameCaptureResult> {
  const began = performance.now();
  let outcome: 'success' | 'failure' = 'failure';
  let failureReason: FailureReason = 'internal-error';
  try {
    const result = await run(revealed);
    outcome = result.ok ? 'success' : 'failure';
    failureReason = result.ok ? 'none' : frameCaptureFailureReason(result.reason);
    return result;
  } finally {
    const properties: TelemetryEventMap['frame_capture_completed'] = {
      outcome,
      failure_reason: failureReason,
      duration_ms: Math.round(performance.now() - began),
      view_moved: revealed.viewMoved,
      reveal_ms: revealed.revealMs,
      capture_ms: Math.round(revealed.captureMs ?? 0),
      stalled_step: revealed.stalledStep ?? 'none',
      freeze_ms: revealed.freezeMs ?? 0,
      move_answered_late: revealed.moveAnsweredLate ?? false,
    };
    capture('frame_capture_completed', properties);
    log('canvas').info('capture_frame completed', properties);
  }
}
