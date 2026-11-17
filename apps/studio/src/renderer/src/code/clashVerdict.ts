import type { CodeSnapshot } from '@studio/events';

/** What a file's state means for the tab holding it. `closed` is here so a clean tab whose file left the disk does not push that decision into the component (ONL-2563). */
export type ClashVerdict =
  /** The snapshots agree; nothing to say. */
  | 'clean'
  /** A clean tab's file changed on disk. Reload it; a disk change on a clean tab is not a clash. */
  | 'reload'
  /** A dirty tab's file changed. The only case that raises the banner. */
  | 'banner'
  /** A dirty tab's file left the disk. The tab keeps its text and marks itself missing. */
  | 'missing'
  /** A clean tab's file left the disk. There is nothing to keep. */
  | 'closed'
  /** A write came back stale, before the re-read turns it into a banner. */
  | 'blocked';

export interface ClashFacts {
  isDirty: boolean;
  /** What the tab was opened at, or last saved to. Null before the read answers. */
  held: CodeSnapshot | null;
  /** What is on disk now, or null when the file is gone. */
  onDisk: CodeSnapshot | null;
  /** A write this tab made was refused as stale and has not been re-read since. */
  wasRefusedStale: boolean;
}

/** One decision for every source, so an agent write and a refused save cannot disagree. The HASH decides: an mtime that moved over identical bytes is not a change. */
export function clashVerdict(facts: ClashFacts): ClashVerdict {
  if (facts.wasRefusedStale) return 'blocked';
  if (facts.held === null) return 'clean';
  if (facts.onDisk === null) return facts.isDirty ? 'missing' : 'closed';
  if (facts.onDisk.hash === facts.held.hash) return 'clean';
  return facts.isDirty ? 'banner' : 'reload';
}

/** The banner is up for exactly one tab — the active one; other clashing files mark their own tabs instead of stacking banners. */
export function showsBanner(verdict: ClashVerdict): boolean {
  return verdict === 'banner' || verdict === 'blocked';
}
