export const FRAME_SCROLL_CHANNEL = 'studio:frame-scroll';

export interface FrameScrollMetrics {
  session: number;
  surface: number;
  top: number;
  viewport: number;
  height: number;
}

export type FrameScrollCommand =
  | { type: 'observe'; session: number; enabled: boolean }
  | { type: 'scroll'; session: number; surface: number; top: number }
  | { type: 'scrollBy'; session: number; surface: number; delta: number };

export interface FrameScrollReport {
  session: number;
  metrics: FrameScrollMetrics | null;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function identity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function dimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function parseFrameScrollCommand(value: unknown): FrameScrollCommand | null {
  if (!record(value) || !identity(value.session)) return null;
  if (value.type === 'observe' && typeof value.enabled === 'boolean' && Object.keys(value).length === 3) {
    return { type: 'observe', session: value.session, enabled: value.enabled };
  }
  if (value.type === 'scroll' && identity(value.surface) && dimension(value.top) && Object.keys(value).length === 4) {
    return { type: 'scroll', session: value.session, surface: value.surface, top: value.top };
  }
  if (value.type === 'scrollBy' && identity(value.surface) && typeof value.delta === 'number' && Number.isFinite(value.delta) && Object.keys(value).length === 4) {
    return { type: 'scrollBy', session: value.session, surface: value.surface, delta: value.delta };
  }
  return null;
}

export function parseFrameScrollReport(value: unknown): FrameScrollReport | null {
  if (!record(value) || !identity(value.session) || Object.keys(value).length !== 2) return null;
  if (value.metrics === null) return { session: value.session, metrics: null };
  const metrics = value.metrics;
  if (!record(metrics) || Object.keys(metrics).length !== 5 || metrics.session !== value.session ||
    !identity(metrics.surface) || !dimension(metrics.top) || !dimension(metrics.viewport) ||
    !dimension(metrics.height) || metrics.viewport === 0 || metrics.height <= metrics.viewport + 1 ||
    metrics.top > metrics.height - metrics.viewport + 1) return null;
  return { session: value.session, metrics: metrics as unknown as FrameScrollMetrics };
}
