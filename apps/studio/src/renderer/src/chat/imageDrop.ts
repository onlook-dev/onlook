export interface DragItemKind {
  kind: string;
  type: string;
}

/** Any file: a file drag the app does not `preventDefault` replaces the window with that file. */
export function dragCarriesFiles(items: readonly DragItemKind[]): boolean {
  return items.some((item) => item.kind === 'file');
}

/** `type` is all that is readable mid-drag, so an unlabelled file cannot light the composer. */
export function dragCarriesImages(items: readonly DragItemKind[]): boolean {
  return items.some((item) => item.kind === 'file' && item.type.startsWith('image/'));
}

/** A dragged link is a `string` item, not a file; un-cancelled it replaces the top-level frame with that URL. */
export function dragWouldNavigate(items: readonly DragItemKind[]): boolean {
  return (
    dragCarriesFiles(items) ||
    items.some((item) => item.kind === 'string' && item.type === 'text/uri-list')
  );
}

/** A child's `dragenter` fires before the parent's `dragleave`, so the count goes 2 then 1 rather than touching 0; clearing on any leave strobes the composer. */
export function foldDragDepth(depth: number, event: 'enter' | 'leave'): number {
  if (event === 'enter') return depth + 1;
  return Math.max(0, depth - 1);
}
