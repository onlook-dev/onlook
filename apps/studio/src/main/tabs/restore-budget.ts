import { isRecord, type CanvasDoc } from '@studio/events';

export const RESTORE_MEMORY_RATIO = 1.15;

export function restoreCanvasEligibleAcrossAllPages(doc: CanvasDoc): boolean {
  if (!isRecord(doc) || !isRecord(doc.nodes) || Array.isArray(doc.nodes)) {
    return false;
  }
  const nodesAcrossAllPages = Object.values(doc.nodes);
  return nodesAcrossAllPages.length === 1 && nodesAcrossAllPages[0]?.kind === 'browser';
}

export function restoreWithinBudget(baselineKb: number, currentKb: number): boolean {
  return Number.isFinite(baselineKb)
    && Number.isFinite(currentKb)
    && baselineKb > 0
    && currentKb > 0
    && currentKb <= baselineKb * RESTORE_MEMORY_RATIO;
}
