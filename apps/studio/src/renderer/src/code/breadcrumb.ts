/** The header's path: the project at the root, the file always whole, and as many parent folders as the width pays for (ONL-2563). */

export const CRUMB_GAP = '…';

/** The header type's measured ratio; the budget arrives in pixels so the rule is testable without a layout. */
const CRUMB_CHAR_PX = 7;
const CRUMB_SEPARATOR_PX = 16;
/** The root's own inline padding, which the budget pays before any segment. */
const ROOT_PADDING_PX = 14;

type CrumbKind = 'folder' | 'gap' | 'file';

interface Crumb {
  kind: CrumbKind;
  text: string;
}

export interface Breadcrumb {
  /** The project's name, not the path's first folder — readers took that for the top of the project. */
  root: string;
  /** What follows the root: one gap for the folders that did not fit, then the kept folders, then the file. */
  crumbs: readonly Crumb[];
}

function cost(segment: string): number {
  return segment.length * CRUMB_CHAR_PX + CRUMB_SEPARATOR_PX;
}

export function fileName(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

export function breadcrumb(projectName: string, path: string, widthPx: number): Breadcrumb {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  const file = segments[segments.length - 1];
  if (file === undefined) return { root: projectName, crumbs: [] };
  const folders = segments.slice(0, -1);
  let budget = widthPx - cost(projectName) - ROOT_PADDING_PX - cost(file);
  const kept: string[] = [];
  for (let index = folders.length - 1; index >= 0; index -= 1) {
    const folder = folders[index] ?? '';
    // The gap costs the budget too, except where this folder is the last one left to keep.
    const reserve = index > 0 ? cost(CRUMB_GAP) : 0;
    if (cost(folder) + reserve > budget) break;
    kept.unshift(folder);
    budget -= cost(folder);
  }
  return {
    root: projectName,
    crumbs: [
      ...(kept.length < folders.length ? [{ kind: 'gap' as const, text: CRUMB_GAP }] : []),
      ...kept.map((text) => ({ kind: 'folder' as const, text })),
      { kind: 'file' as const, text: file },
    ],
  };
}
