export interface Still {
  startMs: number;
  endMs: number;
}

export interface TimelineEvent {
  atMs: number;
}

export interface Shown<E> {
  event: E;
  shownMs: number;
  caption: string;
}

/** Each still longer than `holdMs` shows for `holdMs`; every other moment keeps its real length. */
function shownAt(realMs: number, stills: readonly Still[], holdMs: number): number {
  let cut = 0;
  for (const still of stills) {
    const excess = still.endMs - still.startMs - holdMs;
    if (excess <= 0) continue;
    if (realMs >= still.endMs) cut += excess;
    else if (realMs > still.startMs + holdMs) cut += realMs - still.startMs - holdMs;
  }
  return realMs - cut;
}

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** Stills are detected frame by frame, so an event less than a frame before a still's end is the change that ends it. */
const FRAME_MS = 1000 / 30;

/** Every event a shortened still covers carries the same caption, so a caption never moves inside one. */
function captionFor(fromMs: number, toMs: number, stills: readonly Still[], holdMs: number, originMs: number): string {
  const still = stills.find((s) => s.endMs - s.startMs > holdMs && s.startMs < toMs && s.endMs - fromMs > FRAME_MS);
  return still === undefined
    ? `t+${seconds(originMs + fromMs)}`
    : `t+${seconds(originMs + still.startMs)} · unchanged for ${seconds(still.endMs - still.startMs)}`;
}

/** Events sorted by time; the last one shows for `tailMs`. Events a shortened still swallowed are dropped. */
export function clipTimeline<E extends TimelineEvent>(
  events: readonly E[],
  stills: readonly Still[],
  { holdMs, tailMs, originMs = 0 }: { holdMs: number; tailMs: number; originMs?: number },
): Shown<E>[] {
  const shown: Shown<E>[] = [];
  events.forEach((event, i) => {
    const next = events[i + 1];
    const shownMs =
      next === undefined ? tailMs : shownAt(next.atMs, stills, holdMs) - shownAt(event.atMs, stills, holdMs);
    const caption = captionFor(event.atMs, next?.atMs ?? Number.POSITIVE_INFINITY, stills, holdMs, originMs);
    if (shownMs > 0) shown.push({ event, shownMs, caption });
  });
  return shown;
}

/** `freezedetect`'s log; a still still open when the stream ends closes at `endMs`. */
export function parseStills(log: string, endMs: number): Still[] {
  const stills: Still[] = [];
  let open: number | undefined;
  for (const match of log.matchAll(/lavfi\.freezedetect\.freeze_(start|end): ([\d.]+)/g)) {
    const ms = Number(match[2]) * 1000;
    if (match[1] === 'start') open = ms;
    else if (open !== undefined) {
      stills.push({ startMs: open, endMs: ms });
      open = undefined;
    }
  }
  if (open !== undefined) stills.push({ startMs: open, endMs });
  return stills;
}
