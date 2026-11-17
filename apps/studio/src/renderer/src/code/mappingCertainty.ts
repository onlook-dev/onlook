export interface CertaintyFacts {
  /** The guest said the element the mapping was taken for is gone. */
  isSelectionStale: boolean;
  /** The mapped file's tab as it stands now, or null when that file is not open. */
  tab: { isDirty: boolean; snapshotHash: string | null; onDiskHash: string | null } | null;
}

/** The mapping resolved against the bundle the Frame is RUNNING; the tint is painted on the tab's buffer. Once those diverge the position is a guess (ONL-2563). */
export function mappingIsStale(facts: CertaintyFacts): boolean {
  if (facts.isSelectionStale) return true;
  const { tab } = facts;
  // Not open: nothing here says the file moved, and a guess either way would be invention.
  if (tab === null) return false;
  if (tab.isDirty) return true;
  return tab.onDiskHash !== null && tab.snapshotHash !== null && tab.onDiskHash !== tab.snapshotHash;
}
