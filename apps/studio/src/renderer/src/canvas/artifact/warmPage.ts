import {
  isArtifactNode,
  nodesOnPage,
  type ArtifactId,
  type ArtifactPreviewRequest,
  type CanvasDoc,
  type CanvasPageId,
} from '@studio/events';
import {
  createHoverCoalescer,
  type FrameScheduler,
  type HoverCoalescer,
} from '../frame/hoverCoalesce.js';
import { resolveArtifact, type ArtifactRead } from './artifactCache.js';
import { artifactPreviewDemand, previewRequestFor, type PreviewState } from './previewDemand.js';

export const PAGE_WARM_LIMIT = 12;

export interface PageWarmRequest {
  doc: CanvasDoc;
  pageId: CanvasPageId;
}

interface PageWarmTarget {
  artifactId: ArtifactId;
  pagePath?: string;
}

export interface PageWarmPorts {
  resolve: (artifactId: ArtifactId) => Promise<ArtifactRead>;
  watch: (request: ArtifactPreviewRequest, listener: (state: PreviewState) => void) => () => void;
  schedule: FrameScheduler;
}

function targetsOnPage(doc: CanvasDoc, pageId: CanvasPageId): PageWarmTarget[] {
  return nodesOnPage(doc, pageId)
    .filter(isArtifactNode)
    .sort((left, right) => left.order - right.order)
    .slice(0, PAGE_WARM_LIMIT)
    .map((node) => ({
      artifactId: node.content.artifactId,
      ...(node.content.pagePath === undefined ? {} : { pagePath: node.content.pagePath }),
    }));
}

/** Held to the outcome, never released on the pointer leaving: `drain()` skips a listener-less entry, so releasing one still queued drops it (ONL-2791). */
function holdUntilSettled(
  watch: PageWarmPorts['watch'],
  held: Set<() => void>,
  request: ArtifactPreviewRequest,
): void {
  let release: (() => void) | undefined;
  let isSettled = false;
  const stop = (): void => {
    isSettled = true;
    held.delete(stop);
    release?.();
  };
  release = watch(request, (state: PreviewState) => {
    if (state.outcome !== 'reading') stop();
  });
  if (isSettled) release();
  else held.add(stop);
}

export function createPageWarmer(ports: PageWarmPorts): HoverCoalescer<PageWarmRequest> {
  // Each flush withdraws the previous row's unstarted reads, or a rail sweep queues ahead of opened previews (ONL-2791).
  let held = new Set<() => void>();
  const warm = async (generation: Set<() => void>, target: PageWarmTarget): Promise<void> => {
    const summary = await ports.resolve(target.artifactId);
    if (summary == null || generation !== held) return;
    holdUntilSettled(ports.watch, generation, previewRequestFor(target.artifactId, target.pagePath, summary));
  };
  return createHoverCoalescer<PageWarmRequest, PageWarmTarget[]>({
    convert: ({ doc, pageId }) => targetsOnPage(doc, pageId),
    send: (targets) => {
      for (const stop of [...held]) stop();
      held = new Set();
      const generation = held;
      for (const target of targets) void warm(generation, target);
    },
    schedule: ports.schedule,
  });
}

export const pageWarmer = createPageWarmer({
  resolve: resolveArtifact,
  watch: (request, listener) => artifactPreviewDemand.watch(request, listener),
  schedule: (flush) => {
    requestAnimationFrame(flush);
  },
});
