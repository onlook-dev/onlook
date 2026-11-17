import type { ActivationSurfaceReport, FrameHealth } from '@studio/events';
import type { FrameServerCover } from '@studio/events';

export function canvasSurface(facts: {
  emptyFailure?: 'setup' | 'preview';
  copying: boolean;
  starting: boolean;
  nodeCount: number;
  frames: readonly { health: FrameHealth; serverCover?: FrameServerCover; loadFailure?: unknown; quote?: string; quoteTurnRunning?: boolean }[];
}): ActivationSurfaceReport {
  if (facts.emptyFailure !== undefined) return { surface: 'error_state', dead_end: { state: facts.emptyFailure === 'preview' ? 'app_not_started' : 'setup_failed', error_class: 'unknown' } };
  const frames = facts.frames;
  const showsQuote = (frame: (typeof frames)[number]): boolean => frame.quote !== undefined && frame.quoteTurnRunning === true;
  const failed = frames.length > 0 && frames.every((frame) => !showsQuote(frame) && (frame.serverCover !== undefined || frame.health === 'unreachable' || frame.loadFailure !== undefined));
  if (failed && !facts.starting) return { surface: 'error_state', dead_end: { state: 'preview_failed', error_class: frames.every((frame) => frame.loadFailure !== undefined) ? 'load_failed' : frames.every((frame) => frame.serverCover === 'dead' || frame.serverCover === 'non-started' || frame.serverCover === 'users-own') ? 'port_unreachable' : 'unknown' } };
  if (facts.copying || facts.starting || frames.length > 0 && frames.every((frame) => showsQuote(frame) || (frame.health === 'loading' && frame.serverCover === undefined))) return { surface: 'preview_loading' };
  return { surface: facts.nodeCount === 0 ? 'chat_idle' : 'canvas' };
}
