import { codeImageMediaType } from '@studio/events';

/** Which files a designer is offered first: a view over what the walk returned, not what is walked — that is `main/code/exclusions.ts` (ONL-2563). */
export type FileScope = 'design' | 'all';

/** The order results come back in, which is also the order the design asks for. */
export type DesignKind = 'style' | 'component' | 'image' | 'doc';

const STYLE = /\.(?:css|scss|sass|less|styl)$/i;
const COMPONENT = /\.(?:tsx|jsx|vue|svelte)$/i;
const DOC = /\.(?:md|mdx)$/i;

/** A test, a config or a lockfile is a file a designer did not come here for. */
const NOT_DESIGN = [
  /(?:^|\/)__tests__\//i,
  /\.(?:test|spec)\.[cm]?[jt]sx?$/i,
  /(?:^|\/)[^/]*\.config\.[cm]?[jt]s$/i,
  /(?:^|\/)(?:package|tsconfig|jsconfig)[^/]*\.json$/i,
  /(?:^|\/)[^/]*lock(?:file)?(?:\.[a-z]+)?$/i,
  /(?:^|\/)\.[^/]+$/,
];

export function designKind(path: string): DesignKind | null {
  if (NOT_DESIGN.some((pattern) => pattern.test(path))) return null;
  if (STYLE.test(path)) return 'style';
  if (COMPONENT.test(path)) return 'component';
  if (codeImageMediaType(path) !== null) return 'image';
  if (DOC.test(path)) return 'doc';
  return null;
}

const ORDER: readonly DesignKind[] = ['style', 'component', 'image', 'doc'];

/** Styles, components, images, then docs, each group alphabetical; `all` keeps the walk's order. */
export function filesInScope(paths: readonly string[], scope: FileScope): string[] {
  if (scope === 'all') return [...paths];
  const byKind = new Map<DesignKind, string[]>(ORDER.map((kind) => [kind, []]));
  for (const path of paths) {
    const kind = designKind(path);
    if (kind !== null) byKind.get(kind)?.push(path);
  }
  return ORDER.flatMap((kind) => (byKind.get(kind) ?? []).sort((a, b) => a.localeCompare(b)));
}
