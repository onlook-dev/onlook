import type { CodeElementEvidence, CodeSearchFileMatches } from '@studio/events';

interface RankedCandidate {
  path: string;
  line: number;
  column: number;
  /** Higher is better; equal scores keep the search's own order. */
  score: number;
}

export interface Ranking {
  candidates: readonly RankedCandidate[];
  uses: number;
}

/** Enough to order the hits; a parser would be a second, disagreeing idea of what a component is. */
function declares(name: string, text: string): boolean {
  const n = name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:function|class)\\s+${n}\\b|(?:const|let|var)\\s+${n}\\s*[:=]|${n}\\s*=\\s*(?:React\\.)?(?:memo|forwardRef)\\s*\\(`,
  ).test(text);
}

function uses(name: string, text: string): boolean {
  const n = name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<${n}[\\s/>]`).test(text);
}

const NOT_THE_SOURCE = /\.(?:test|spec|stories|story|bench)\.[cm]?[jt]sx?$/;
const DOCUMENT_OR_DATA = /\.(?:md|markdown|mdown|txt|rst|adoc|json|jsonl|ya?ml|toml|csv|log|lock)$/i;

function stemOf(path: string): string {
  const name = path.split('/').at(-1) ?? '';
  return name.split('.')[0] ?? '';
}

/** The fallback for a component the owner stack could not place. It matches a NAME, and two files can declare one (ONL-2563). */
export function rankByName(name: string, files: readonly CodeSearchFileMatches[]): Ranking {
  if (name.length === 0) return { candidates: [], uses: 0 };
  const candidates: RankedCandidate[] = [];
  let used = 0;

  for (const file of files) {
    if (DOCUMENT_OR_DATA.test(file.path)) continue;
    const declaration = file.lines.find((line) => declares(name, line.text));
    if (declaration === undefined) {
      if (file.lines.some((line) => uses(name, line.text))) used += 1;
      continue;
    }
    let score = 10;
    if (stemOf(file.path) === name) score += 5;
    if (NOT_THE_SOURCE.test(file.path)) score -= 8;
    if (file.path.startsWith('src/') || file.path.includes('/src/')) score += 1;
    candidates.push({
      path: file.path,
      line: declaration.line,
      column: declaration.column + 1,
      score,
    });
  }

  const depth = (path: string): number => path.split('/').length;
  const ordered = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (a, b) =>
        b.candidate.score - a.candidate.score ||
        depth(a.candidate.path) - depth(b.candidate.path) ||
        a.index - b.index,
    )
    .map(({ candidate }) => candidate);

  return { candidates: ordered, uses: used };
}

export function evidenceQueries(evidence: CodeElementEvidence): readonly string[] {
  return [...new Set([evidence.text, ...evidence.classes.slice(0, 4), evidence.tag])].filter((query) => query.trim().length > 0);
}

export function rankByEvidence(evidence: CodeElementEvidence, files: readonly CodeSearchFileMatches[]): Ranking {
  const escaped = evidence.tag.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = new RegExp(`<${escaped}(?:\\s|/?>)|createElement\\(\\s*['"]${escaped}['"]`, 'i');
  const candidates = new Map<string, RankedCandidate>();
  for (const file of files) {
    if (DOCUMENT_OR_DATA.test(file.path)) continue;
    for (const line of file.lines) {
      const content = line.text.toLowerCase();
      const hasTag = evidence.tag.length > 0 && tag.test(line.text);
      const hasText = evidence.text.length > 0 && content.includes(evidence.text.toLowerCase());
      const classes = evidence.classes.filter((name) => content.includes(name.toLowerCase())).length;
      if ((!hasTag && !hasText) || (!hasText && classes === 0)) continue;
      const score = (hasTag ? 2 : 0) + (hasText ? 8 : 0) + classes * 4 - (NOT_THE_SOURCE.test(file.path) ? 8 : 0);
      const key = `${file.path}:${String(line.line)}`;
      const existing = candidates.get(key);
      if (existing === undefined || existing.score < score) candidates.set(key, { path: file.path, line: line.line, column: Math.max(0, line.column) + 1, score });
    }
  }
  return { candidates: [...candidates.values()].sort((left, right) => right.score - left.score || left.path.localeCompare(right.path) || left.line - right.line), uses: 0 };
}
