import { basename } from 'node:path';
import type { ArtifactExportResult, CanvasImageExportRequest, ImageExportFormat } from '@studio/events';
import { t } from '@studio/i18n';

export const IMAGE_EXPORT_FORMATS: readonly ImageExportFormat[] = ['png', 'png-2x', 'jpeg'];
export const MAX_EXPORT_PIXELS = 32_000_000;
export const MAX_EXPORT_BYTES = 64 * 1024 * 1024;

export class ImageCaptureError extends Error {
  constructor(readonly reason: 'too-large' | 'resolution' | 'timeout' | 'unavailable') {
    super(`image export ${reason}`);
  }
}

export function imageCaptureFailure(error: unknown, fallback: string): string {
  if (!(error instanceof ImageCaptureError)) return fallback;
  switch (error.reason) {
    case 'too-large': return t('canvas.export.tooLarge');
    case 'resolution': return t('canvas.export.resolution');
    case 'timeout': return t('canvas.export.timeout');
    case 'unavailable': return t('canvas.export.unavailable');
  }
}

export function imageExportName(title: string, format: ImageExportFormat): string {
  const name = title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 80) || 'frame';
  return `${name}${format === 'png-2x' ? '@2x' : ''}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

export interface ImageExportTarget {
  title: string;
  width: number;
  height: number;
  current(): Promise<boolean>;
  capture(format: ImageExportFormat): Promise<Uint8Array>;
  dispose?(): void;
}

export function createImageExportHandler<Event>(deps: {
  admitted(event: Event): boolean;
  target(event: Event, nodeId: string): Promise<ImageExportTarget | undefined>;
  choose(name: string, extension: string): Promise<string | undefined>;
  write(path: string, bytes: Uint8Array): void;
}) {
  let running = false;
  return async (event: Event, request: CanvasImageExportRequest): Promise<ArtifactExportResult> => {
    const refused = (key: 'canvas.export.unavailable' | 'canvas.export.failed' | 'canvas.export.tooLarge'): ArtifactExportResult => ({ outcome: 'refused', reason: t(key) });
    if (!deps.admitted(event) || running || !request || typeof request.nodeId !== 'string' || request.nodeId.length > 128 || (request.format !== 'png' && request.format !== 'jpeg')) return refused('canvas.export.unavailable');
    running = true;
    let target: ImageExportTarget | undefined;
    try {
      target = await deps.target(event, request.nodeId);
      if (!target || !await target.current()) return refused('canvas.export.unavailable');
      if (![target.width, target.height].every(value => Number.isFinite(value) && value >= 1 && value <= 16384) || target.width * target.height > MAX_EXPORT_PIXELS) return refused('canvas.export.tooLarge');
      const bytes = await target.capture(request.format);
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_EXPORT_BYTES) return refused('canvas.export.tooLarge');
      if (!await target.current()) return refused('canvas.export.unavailable');
      const path = await deps.choose(imageExportName(target.title, request.format), request.format === 'jpeg' ? 'jpg' : 'png');
      if (path === undefined) return { outcome: 'cancelled' };
      if (!deps.admitted(event) || !await target.current()) return refused('canvas.export.unavailable');
      try { deps.write(path, bytes); }
      catch { return { outcome: 'refused', reason: t('canvas.export.writeFailed') }; }
      return { outcome: 'saved', name: basename(path), location: path };
    } catch (error) {
      return { outcome: 'refused', reason: imageCaptureFailure(error, t('canvas.export.failed')) };
    } finally {
      target?.dispose?.();
      running = false;
    }
  };
}
