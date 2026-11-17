import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import { localPort } from '@studio/events';
import type { StackPosition } from './stack.js';

/** A position in a file the designer wrote, worktree-relative or absolute; `scope.ts` clamps it. */
export interface OriginalPosition {
  path: string;
  line: number;
  column: number;
}

const MAP_COMMENT = /\/[/*][#@]\s*sourceMappingURL=([^\s*]+)/g;

/** The last one wins: a bundle can carry an inner module's comment before its own. */
export function mapCommentOf(moduleText: string): string | null {
  let found: string | null = null;
  for (const match of moduleText.matchAll(MAP_COMMENT)) {
    if (match[1] !== undefined) found = match[1];
  }
  return found;
}

const INLINE = /^data:application\/json;(?:charset=[^;,]+;)?base64,(.*)$/;

/** Vite dev's shape: the whole map rides the module, so nothing is fetched. */
export function inlineMapOf(comment: string): string | null {
  const inline = INLINE.exec(comment);
  if (inline?.[1] === undefined) {
    // The other inline spelling, which some transforms emit unencoded.
    const plain = /^data:application\/json[^,]*,(.*)$/.exec(comment);
    return plain?.[1] === undefined ? null : decodeURIComponent(plain[1]);
  }
  try {
    return Buffer.from(inline[1], 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/** The map's own url. The PAGE names it, and main has no origin and no CORS, so only the Frame's own local origin is admitted (ONL-2563). */
export function sidecarUrlOf(comment: string, moduleUrl: string): string | null {
  let module: URL;
  let sidecar: URL;
  try {
    module = new URL(moduleUrl);
    sidecar = new URL(comment, module);
  } catch {
    return null;
  }
  if (sidecar.origin !== module.origin) return null;
  if (localPort(sidecar.href) === null) return null;
  return sidecar.href;
}

/* Each dev server spells a source its own way, and three of the four are not paths. */
const WEBPACK = /^webpack:\/\/[^/]*\//;
const BRACKETED = /^[a-z][a-z0-9+.-]*:\/\/\[[^\]]*\]\//i;

/** Worktree-relative or absolute; never a url, because nothing downstream can clamp one. */
export function sourcePathOf(source: string): string | null {
  if (typeof source !== 'string' || source.length === 0) return null;
  let path = source.split('#')[0] ?? '';
  path = path.split('?')[0] ?? '';
  if (path.length === 0) return null;

  if (path.startsWith('file://')) {
    try {
      path = decodeURIComponent(new URL(path).pathname);
    } catch {
      return null;
    }
  } else if (BRACKETED.test(path)) {
    // Next's `turbopack://[project]/src/Hero.tsx`, and Turbopack's other roots.
    path = path.replace(BRACKETED, '');
  } else if (WEBPACK.test(path)) {
    path = path.replace(WEBPACK, '');
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }

  try {
    path = decodeURIComponent(path);
  } catch {
    /* A lone percent is not an encoding; the raw spelling is the better guess. */
  }
  // `./src/Hero.jsx` is webpack's own prefix, not a relative step worth keeping.
  while (path.startsWith('./')) path = path.slice(2);
  return path.length === 0 ? null : path;
}

/** A `sources` entry is relative to the GENERATED FILE: Vite dev writes `main.jsx` for a module at `/src/main.jsx`, and another server writes `src/main.jsx`, which resolved would double the folder. The caller keeps the spelling that exists (ONL-2563). */
export function sourceSpellings(path: string, moduleUrl: string): string[] {
  const spellings: string[] = [];
  // An absolute entry is usually a real path; it is also what `sourceRoot: "/src/"` produces.
  if (path.startsWith('/')) spellings.push(path);
  try {
    const resolved = new URL(path, moduleUrl);
    const relative = decodeURIComponent(resolved.pathname).replace(/^\/+/, '');
    if (relative.length > 0 && !spellings.includes(relative)) spellings.push(relative);
  } catch {
    /* Not a url this can be resolved against; the entry as written is the only spelling. */
  }
  if (!spellings.includes(path)) spellings.push(path);
  return spellings;
}

/** V8 and React count a column from 1 and a source map from 0; the line does not change base (ONL-2563). */
export function originalPositionOf(mapJson: string, position: StackPosition): OriginalPosition | null {
  let map: TraceMap;
  try {
    map = new TraceMap(JSON.parse(mapJson) as ConstructorParameters<typeof TraceMap>[0]);
  } catch {
    return null;
  }
  let found;
  try {
    found = originalPositionFor(map, { line: position.line, column: position.column - 1 });
  } catch {
    return null;
  }
  if (found.source === null || found.line === null || found.column === null) return null;
  const path = sourcePathOf(found.source);
  if (path === null) return null;
  return { path, line: found.line, column: found.column + 1 };
}

export interface SourcesDeps {
  /** Returns the module's or map's text, or null when it could not be had. */
  fetchText: (url: string) => Promise<string | null>;
}

/** Fetched from the admitted Frame's own origin only, and bounded: a map is JSON, not a download. */
const MAX_BYTES = 16 * 1024 * 1024;

export async function fetchTextFromFrame(url: string): Promise<string | null> {
  try {
    const answer = await fetch(url);
    if (!answer.ok) return null;
    const length = Number(answer.headers.get('content-length') ?? '0');
    if (length > MAX_BYTES) return null;
    const text = await answer.text();
    return text.length > MAX_BYTES ? null : text;
  } catch {
    return null;
  }
}

/** The served position, turned back into the file the designer wrote. */
export async function resolveThroughMap(
  deps: SourcesDeps,
  position: StackPosition,
): Promise<OriginalPosition | null> {
  if (!/^https?:\/\//i.test(position.url)) {
    // Already a path: our React 18 shape, which names the file outright.
    const path = sourcePathOf(position.url);
    return path === null ? null : { path, line: position.line, column: position.column };
  }
  if (localPort(position.url) === null) return null;
  const moduleText = await deps.fetchText(position.url);
  if (moduleText === null) return null;
  const comment = mapCommentOf(moduleText);
  if (comment === null) return null;
  const inline = inlineMapOf(comment);
  if (inline !== null) return originalPositionOf(inline, position);
  const sidecar = sidecarUrlOf(comment, position.url);
  if (sidecar === null) return null;
  const mapJson = await deps.fetchText(sidecar);
  return mapJson === null ? null : originalPositionOf(mapJson, position);
}
