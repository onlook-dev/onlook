/** Which file the panel is on: the only place "follows the selection" and "never loses work" can contradict each other (ONL-2563). */

export interface TabsForSelection {
  /** Unchanged BY REFERENCE when nothing moved, so a row selecting on it is not re-rendered by a pick that says nothing about files. */
  openPaths: readonly string[];
  activePath: string | null;
  /** The path whose contents the caller still owes a read; null whenever no tab was added. */
  toRead: string | null;
}

/** Keyed by path, so a file cannot be open twice. A shift-add and an unmapped pick both leave the panel where it is, which keeps a dirty tab open. */
export function tabsForSelection(
  openPaths: readonly string[],
  activePath: string | null,
  mappedFile: string | null,
  shiftHeld: boolean,
): TabsForSelection {
  const unchanged: TabsForSelection = { openPaths, activePath, toRead: null };
  if (shiftHeld || mappedFile === null) return unchanged;
  if (openPaths.includes(mappedFile)) {
    return mappedFile === activePath ? unchanged : { openPaths, activePath: mappedFile, toRead: null };
  }
  return { openPaths: [...openPaths, mappedFile], activePath: mappedFile, toRead: mappedFile };
}

export interface TabsAfterClose {
  openPaths: readonly string[];
  activePath: string | null;
}

/** Closing the active tab lands on the next one, or on the previous one when the closed tab was last. */
export function tabsAfterClose(
  openPaths: readonly string[],
  activePath: string | null,
  closing: string,
): TabsAfterClose {
  const index = openPaths.indexOf(closing);
  if (index === -1) return { openPaths, activePath };
  const rest = openPaths.filter((path) => path !== closing);
  if (closing !== activePath) return { openPaths: rest, activePath };
  return { openPaths: rest, activePath: rest[Math.min(index, rest.length - 1)] ?? null };
}
