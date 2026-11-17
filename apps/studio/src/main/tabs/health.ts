import type { ErrorOwner } from '../errors/index.js';

export type TabHealth = 'gone' | 'failed';

/** `did-fail-load` fires with this for a redirect or a superseded load, which is not a failure (ONL-2352). */
const ERR_ABORTED = -3;

export type RendererGoneReason =
  | 'clean-exit'
  | 'abnormal-exit'
  | 'killed'
  | 'crashed'
  | 'oom'
  | 'launch-failed'
  | 'integrity-failure'
  | 'memory-eviction';

export type TabHealthEvent =
  | { kind: 'render-process-gone'; reason: RendererGoneReason }
  | { kind: 'did-fail-load'; errorCode: number; isMainFrame: boolean }
  | { kind: 'did-finish-load' };

export function tabHealthAfter(current: TabHealth | undefined, event: TabHealthEvent): TabHealth | undefined {
  switch (event.kind) {
    case 'render-process-gone':
      return 'gone';
    case 'did-fail-load':
      if (!event.isMainFrame || event.errorCode === ERR_ABORTED) return current;
      return 'failed';
    case 'did-finish-load':
      return undefined;
  }
}

export function ownerForExit(reason: RendererGoneReason): ErrorOwner | undefined {
  switch (reason) {
    case 'crashed':
    case 'abnormal-exit':
    case 'integrity-failure':
    case 'launch-failed':
      return 'ours';
    case 'oom':
    case 'killed':
    case 'memory-eviction':
      return 'environment';
    case 'clean-exit':
      return undefined;
  }
}
