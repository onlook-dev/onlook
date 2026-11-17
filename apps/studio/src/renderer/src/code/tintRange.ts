/** A mapped range, 1-based and inclusive, as the mapper reports it. */
export interface LineSpan {
  start: number;
  end: number;
}

/** The lines a tint covers, clamped rather than trusted: a mapped range outlives the edit that moved the text under it (ONL-2563). */
export function tintedLines(span: LineSpan | null, lineCount: number): number[] {
  if (span === null || lineCount <= 0) return [];
  const start = Math.max(1, Math.min(span.start, lineCount));
  const end = Math.max(1, Math.min(span.end, lineCount));
  if (span.end < span.start || span.start > lineCount) return [];
  return Array.from({ length: end - start + 1 }, (_, step) => start + step);
}
