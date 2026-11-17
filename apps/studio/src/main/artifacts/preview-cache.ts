import { isArtifactId, type ArtifactPreviewRequest, type ArtifactPreviewResult } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import type { createPreviewDisk } from './preview-disk.js';

export const ARTIFACT_PREVIEW_CONCURRENCY = 2;
const CACHE_LIMIT = 96;
const IMAGE_LIMIT = 4 * 1024 * 1024;
const CACHE_BYTES = 32 * 1024 * 1024;
export const ARTIFACT_RENDER_QUEUE_LIMIT = 64;
export const ARTIFACT_HELD_READ_LIMIT = 16;

export function createArtifactPreviewService(deps: {
  store: Pick<ArtifactStore, 'read'>;
  capture(request: ArtifactPreviewRequest, wanted?: () => boolean): Promise<string>;
  disk?: ReturnType<typeof createPreviewDisk>;
}) {
  const generations = new Map<string, number>();
  const cache = new Map<string, { artifactId: string; image: string }>();
  const pending = new Map<string, { result: Promise<ArtifactPreviewResult>; consumers: Set<() => boolean> }>();
  const queue: (() => Promise<void>)[] = [];
  let running = 0;
  let reading = 0;
  let bytes = 0;

  function drain(): void {
    while (running < ARTIFACT_PREVIEW_CONCURRENCY && queue.length > 0) {
      const task = queue.shift()!;
      running += 1;
      void task().finally(() => { running -= 1; drain(); });
    }
  }

  async function current(request: ArtifactPreviewRequest): Promise<boolean> {
    const read = await deps.store.read(request.artifactId);
    return read.outcome === 'resolved' && read.manifest.updatedAt === request.updatedAt &&
      read.manifest.pages.some((page) => page.path === request.pagePath);
  }

  function shaped(request: ArtifactPreviewRequest): boolean {
    return typeof request === 'object' && request !== null && isArtifactId(request.artifactId) &&
      typeof request.pagePath === 'string' && typeof request.updatedAt === 'string' &&
      request.pagePath.length <= 240 && request.updatedAt.length <= 100;
  }

  // A `held` read joins no `pending`, so two reads can both miss and keep one key: without the
  // subtraction the count carries bytes nothing holds, and evicts pictures that are still wanted (ONL-2791).
  function keep(key: string, request: ArtifactPreviewRequest, image: string): void {
    bytes -= cache.get(key)?.image.length ?? 0;
    cache.set(key, { artifactId: request.artifactId, image });
    bytes += image.length;
    for (const [oldest, dropped] of cache) {
      if (cache.size <= CACHE_LIMIT && bytes <= CACHE_BYTES) break;
      bytes -= dropped.image.length;
      cache.delete(oldest);
    }
  }

  return {
    revision(artifactId: string): number { return generations.get(artifactId) ?? 0; },
    invalidate(artifactId: string): void {
      generations.set(artifactId, (generations.get(artifactId) ?? 0) + 1);
      void deps.disk?.remove(artifactId);
      for (const [key, entry] of cache) {
        if (entry.artifactId !== artifactId) continue;
        bytes -= entry.image.length;
        cache.delete(key);
      }
    },
    /** Renders nothing: a node asking at mount must not start the offscreen render of the very page its own guest is loading (ONL-2791). */
    async held(request: ArtifactPreviewRequest): Promise<ArtifactPreviewResult> {
      if (!shaped(request)) return { outcome: 'missing' };
      // Every mounting node asks at once, so the depth is capped like the render queue's: past it a
      // node waits for its own guest rather than lengthening main's chain of reads (ONL-2791).
      if (reading >= ARTIFACT_HELD_READ_LIMIT) return { outcome: 'unavailable' };
      reading += 1;
      try {
        const generation = generations.get(request.artifactId) ?? 0;
        const fresh = () => generation === (generations.get(request.artifactId) ?? 0);
        if (!await current(request)) return { outcome: 'missing' };
        if (!fresh()) return { outcome: 'stale' };
        const key = JSON.stringify([request.artifactId, request.pagePath, request.updatedAt, generation]);
        const cached = cache.get(key);
        if (cached !== undefined) {
          cache.delete(key);
          cache.set(key, cached);
          return { outcome: 'ready', image: cached.image };
        }
        const saved = await deps.disk?.read(request);
        if (!fresh()) return { outcome: 'stale' };
        if (saved === undefined) return { outcome: 'missing' };
        if (!saved.startsWith('data:image/png;base64,') || saved.length > IMAGE_LIMIT) return { outcome: 'unavailable' };
        keep(key, request, saved);
        return { outcome: 'ready', image: saved };
      } finally {
        reading -= 1;
      }
    },
    async request(request: ArtifactPreviewRequest, wanted: () => boolean = () => true): Promise<ArtifactPreviewResult> {
      if (!wanted()) return { outcome: 'unavailable' };
      if (!shaped(request)) return { outcome: 'missing' };
      const generation = generations.get(request.artifactId) ?? 0;
      const fresh = () => generation === (generations.get(request.artifactId) ?? 0);
      if (!await current(request)) return { outcome: 'missing' };
      if (!wanted()) return { outcome: 'unavailable' };
      if (!fresh()) return { outcome: 'stale' };
      const key = JSON.stringify([request.artifactId, request.pagePath, request.updatedAt, generation]);
      const cached = cache.get(key);
      if (cached !== undefined) {
        cache.delete(key);
        cache.set(key, cached);
        return { outcome: 'ready', image: cached.image };
      }
      const existing = pending.get(key);
      if (existing !== undefined) {
        existing.consumers.add(wanted);
        try {
          const observed = await existing.result;
          return wanted() ? observed : { outcome: 'unavailable' };
        }
        finally { existing.consumers.delete(wanted); }
      }
      if (queue.length >= ARTIFACT_RENDER_QUEUE_LIMIT) return { outcome: 'unavailable' };
      const consumers = new Set([wanted]);
      const result = new Promise<ArtifactPreviewResult>((resolve) => {
        queue.push(async () => {
          try {
            if (![...consumers].some((consumer) => consumer())) { resolve({ outcome: 'unavailable' }); return; }
            if (!fresh()) { resolve({ outcome: 'stale' }); return; }
            if (!await current(request)) { resolve({ outcome: 'missing' }); return; }
            if (![...consumers].some((consumer) => consumer())) { resolve({ outcome: 'unavailable' }); return; }
            const saved = await deps.disk?.read(request);
            if (!fresh()) { resolve({ outcome: 'stale' }); return; }
            if (![...consumers].some((consumer) => consumer())) { resolve({ outcome: 'unavailable' }); return; }
            const image = saved ?? await deps.capture(request, () => fresh() && [...consumers].some((consumer) => consumer()));
            if (!fresh()) { resolve({ outcome: 'stale' }); return; }
            if (!await current(request)) { resolve({ outcome: 'stale' }); return; }
            if (!fresh()) { resolve({ outcome: 'stale' }); return; }
            if (!image.startsWith('data:image/png;base64,') || image.length > IMAGE_LIMIT) {
              resolve({ outcome: 'unavailable' }); return;
            }
            keep(key, request, image);
            if (saved === undefined) await deps.disk?.write(request, image);
            if (!fresh()) { resolve({ outcome: 'stale' }); return; }
            resolve({ outcome: 'ready', image });
          } catch { resolve({ outcome: 'unavailable' }); }
        });
      });
      pending.set(key, { result, consumers });
      drain();
      try {
        const observed = await result;
        return wanted() ? observed : { outcome: 'unavailable' };
      } finally { consumers.delete(wanted); pending.delete(key); }
    },
  };
}
