import { existsSync } from 'node:fs';
import type {
  CodeIdentifyRequest,
  CodeIdentifyResult,
  CodeMapCandidate,
  CodeMapRequest,
  CodeMapResult,
  CodeSearchFileMatches,
  CodeSearchResult,
} from '@studio/events';
import { isExcludedPath } from '../exclusions.js';
import { resolveInWorktree, worktreeRelative } from '../scope.js';
import { gradeOf } from './grade.js';
import { evidenceQueries, rankByEvidence, rankByName, type Ranking } from './rank.js';
import { resolveThroughMap, sourceSpellings, type SourcesDeps } from './sources.js';
import { positionsOf } from './stack.js';

export interface MapDeps extends SourcesDeps {
  worktree: string | undefined;
  identify: (request: CodeIdentifyRequest) => Promise<CodeIdentifyResult>;
  search: (query: string) => CodeSearchResult;
  /** Seam for the tests; the product asks the disk. */
  exists?: (path: string) => boolean;
}

/** A page can hand back 32 frames; the writer is among the first few and the rest are its callers. */
const FRAMES_TRIED = 8;

/** Only a best guess shows them, and a list past this is a wall rather than a choice. */
const OTHERS_SHOWN = 5;

function clamp(deps: MapDeps, worktree: string, path: string): string | null {
  const scope = resolveInWorktree(worktree, path);
  if (!scope.ok) return null;
  const relative = worktreeRelative(worktree, scope.path);
  if (relative.length === 0 || relative.startsWith('..')) return null;
  // A dependency's own source is in the worktree and is not what the designer writes.
  if (isExcludedPath(relative)) return null;
  return (deps.exists ?? existsSync)(scope.path) ? relative : null;
}

/** The selection as a file and a line. The stack, the map's `sources` and the name are all page content, so every candidate is clamped by the scope module (ONL-2563). */
export async function mapSelection(deps: MapDeps, request: CodeMapRequest): Promise<CodeMapResult> {
  const { worktree } = deps;
  if (worktree === undefined) return { ok: false, decline: 'unaddressable' };

  const identified = await deps.identify(request);
  if (!identified.ok) return { ok: false, decline: identified.decline };
  const reading = identified.reading;
  if (!reading.ok) {
    return { ok: false, decline: reading.why === 'unreadable' ? 'failed' : reading.why };
  }

  const moved = new Set(request.movedPaths ?? []);
  const component = reading.component;

  const place = async (frames: readonly string[]): Promise<CodeMapCandidate | null> => {
    for (const position of positionsOf(frames).slice(0, FRAMES_TRIED)) {
      const original = await resolveThroughMap(deps, position);
      if (original === null) continue;
      for (const spelling of sourceSpellings(original.path, position.url)) {
        const path = clamp(deps, worktree, spelling);
        if (path === null) continue;
        // The nearest frame that lands in the project is the writer; the rest are its callers.
        return { path, line: original.line, column: original.column, via: 'owner-stack' };
      }
    }
    return null;
  };

  let placed = await place(reading.frames);
  if (placed !== null && reading.direct === false) placed = { ...placed, via: 'component-stack' };

  if (placed === null) {
    const owner = await place(reading.ownerFrames);
    if (owner !== null) placed = { ...owner, via: 'component-stack' };
  }

  let ranking: Ranking = { candidates: [], uses: 0 };
  if (reading.react === 'development' && component !== null && component.length > 0) {
    const found = deps.search(component);
    if (found.ok) {
      ranking = rankByName(
        component,
        found.contents.filter((file) => clamp(deps, worktree, file.path) !== null),
      );
    }
  }

  let candidates = placed === null ? ranking.candidates : [];
  let fallbackVia: CodeMapCandidate['via'] = 'name-search';
  if (placed === null && candidates.length === 0 && reading.react !== 'production' && reading.evidence !== undefined) {
    const matches: CodeSearchFileMatches[] = [];
    for (const query of evidenceQueries(reading.evidence)) {
      const found = deps.search(query);
      if (found.ok) matches.push(...found.contents.filter((file) => clamp(deps, worktree, file.path) !== null));
    }
    const evidenceRanking = rankByEvidence(reading.evidence, matches);
    if (evidenceRanking.candidates.length > 0) {
      candidates = evidenceRanking.candidates;
      fallbackVia = 'element-search';
    }
  }
  if (placed === null) {
    const best = candidates[0];
    if (best !== undefined) {
      placed = { path: best.path, line: best.line, column: best.column, via: fallbackVia };
    } else {
      return { ok: false, decline: 'unmapped' };
    }
  }

  const grade = gradeOf({
    via: placed.via,
    candidates: placed.via === 'owner-stack' || placed.via === 'component-stack' ? 1 : candidates.length,
    moved: moved.has(placed.path),
  });

  const declared = ranking.candidates[0];
  const definition: CodeMapCandidate | null =
    declared === undefined
      ? null
      : { path: declared.path, line: declared.line, column: declared.column, via: 'name-search' };

  return {
    ok: true,
    mapping: {
      ...placed,
      definition,
      grade,
      component,
      others:
        grade === 'best-guess'
          ? candidates.slice(1, OTHERS_SHOWN + 1).map(({ path, line, column }) => ({
              path,
              line,
              column,
              via: fallbackVia,
            }))
          : [],
      uses: ranking.uses,
      produced: reading.siblings,
      producedComplete: reading.siblingsComplete === true,
    },
  };
}
