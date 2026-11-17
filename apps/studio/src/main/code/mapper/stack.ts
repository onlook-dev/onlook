/** Where one owner-stack frame says an element was written. */
export interface StackPosition {
  /** As the page named it: a served URL in a dev build, occasionally a bare path. */
  url: string;
  /** 1-based, as V8 and React both count. */
  line: number;
  /** 1-based here; `sources.ts` makes it 0-based for the map. */
  column: number;
}

/* V8's two shapes, plus the bare `url:line:col` our React 18 reader synthesizes. */
const WRAPPED = /^\s*at\s+.*?\((.+)\)\s*$/;
const BARE = /^\s*(?:at\s+)?(.+?)\s*$/;

/** The port's colon is why this splits from the right rather than matching a scheme. */
function split(location: string): StackPosition | null {
  const column = location.lastIndexOf(':');
  if (column <= 0) return null;
  const line = location.lastIndexOf(':', column - 1);
  if (line <= 0) return null;
  const url = location.slice(0, line);
  const lineNumber = Number(location.slice(line + 1, column));
  const columnNumber = Number(location.slice(column + 1));
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return null;
  if (!Number.isInteger(columnNumber) || columnNumber < 1) return null;
  if (url.length === 0) return null;
  return { url, line: lineNumber, column: columnNumber };
}

/** Where the SERVED module put the element; a dev preamble and a transform both shift it, so only a map turns it back into a file's line (ONL-2563). */
export function positionOf(frame: string): StackPosition | null {
  if (typeof frame !== 'string' || frame.length === 0) return null;
  const wrapped = WRAPPED.exec(frame);
  if (wrapped?.[1] !== undefined) return split(wrapped[1]);
  const bare = BARE.exec(frame);
  if (bare?.[1] === undefined) return null;
  // An `Error` stack's own header line, and React's blank separators.
  if (!bare[1].includes(':')) return null;
  return split(bare[1]);
}

/** In the page's own order: nearest writer first, which is what makes the first one the answer. */
export function positionsOf(frames: readonly string[]): StackPosition[] {
  const found: StackPosition[] = [];
  for (const frame of frames) {
    const position = positionOf(frame);
    if (position !== null) found.push(position);
  }
  return found;
}
