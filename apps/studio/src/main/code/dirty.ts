const dirtyViews = new Set<number>();

export function noteCodeDirty(viewId: number, isDirty: boolean): void {
  if (isDirty) dirtyViews.add(viewId);
  else dirtyViews.delete(viewId);
}

/** A view that went away takes its claim with it: nothing is holding that text any more. */
export function forgetCodeDirty(viewId: number): void {
  dirtyViews.delete(viewId);
}

export function hasUnsavedCode(viewId: number | undefined): boolean {
  return viewId !== undefined && dirtyViews.has(viewId);
}

export function anyUnsavedCode(): boolean {
  return dirtyViews.size > 0;
}

export function resetCodeDirtyForTests(): void {
  dirtyViews.clear();
}
