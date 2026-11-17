import { designKind } from './fileScope.js';

/** How many the group shows before it stops being a shortcut and becomes a second tree. */
export const SUGGESTED_LIMIT = 6;

export interface SuggestedFacts {
  /** Every file the walk returned, worktree-relative. */
  files: readonly string[];
  /** The file the mapper placed the selection in, when it placed one. */
  mappedFile?: string | null;
  /** The component's own definition, when the mapper named one and it is not the same file. */
  componentFile?: string | null;
  /** What the mapped file imports, in the order the reader would meet them. */
  related?: readonly string[];
}

export function suggestedFiles(facts: SuggestedFacts, limit = SUGGESTED_LIMIT): string[] {
  const known = new Set(facts.files);
  const out: string[] = [];
  const take = (path: string | null | undefined): void => {
    if (typeof path !== 'string' || path === '') return;
    if (!known.has(path) || out.includes(path)) return;
    out.push(path);
  };

  take(facts.mappedFile);
  take(facts.componentFile);
  for (const path of facts.related ?? []) take(path);

  for (const path of facts.files) {
    if (out.length >= limit) break;
    if (designKind(path) !== null) take(path);
  }
  return out.slice(0, limit);
}
