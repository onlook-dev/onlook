const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const LOCAL_PORT = /(?:localhost|127\.0\.0\.1):\d{2,5}/g;
const KINDS: readonly RegExp[] = [ID, LOCAL_PORT];

export type RunIds = Map<string, string>;

function tokens(value: unknown, kind: RegExp): string[] {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return text.match(kind) ?? [];
}

/** Pairs the ids and ports a recorded Studio answer named with the ones this run's answer named, in order, per kind; a kind whose counts differ teaches nothing. */
export function learnRunIds(recorded: unknown, live: unknown, ids: RunIds): void {
  for (const kind of KINDS) {
    const before = tokens(recorded, kind);
    const after = tokens(live, kind);
    if (before.length !== after.length) continue;
    before.forEach((token, index) => {
      const replacement = after[index]!;
      if (token !== replacement && !ids.has(token)) ids.set(token, replacement);
    });
  }
}

export function withRunIds<T>(row: T, ids: RunIds): T {
  if (ids.size === 0) return row;
  let text = JSON.stringify(row);
  for (const [recorded, live] of [...ids].sort(([a], [b]) => b.length - a.length)) text = text.split(recorded).join(live);
  return JSON.parse(text) as T;
}

/** The one recorded port in `range` a URL names, or nothing when the recording names none or several. */
export function recordedPortIn(recording: unknown, range: { first: number; last: number }): number | undefined {
  const ports = new Set(
    tokens(recording, LOCAL_PORT)
      .map((token) => Number(token.slice(token.lastIndexOf(':') + 1)))
      .filter((port) => port >= range.first && port <= range.last),
  );
  return ports.size === 1 ? [...ports][0] : undefined;
}
