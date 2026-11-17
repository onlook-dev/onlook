type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function walk(value: Json, visit: (key: string | null, value: Json) => Json, key: string | null = null): Json {
  const next = visit(key, value);
  if (Array.isArray(next)) return next.map((item) => walk(item, visit));
  if (next !== null && typeof next === 'object') {
    return Object.fromEntries(Object.entries(next).map(([childKey, child]) => [childKey, walk(child, visit, childKey)]));
  }
  return next;
}

export function recordedPorts(rows: readonly string[]): number[] {
  const ports = new Set<number>();
  for (const line of rows) {
    if (!line.includes('"port"')) continue;
    walk(JSON.parse(line) as Json, (key, value) => {
      if (key === 'port' && typeof value === 'number' && Number.isInteger(value) && value > 0) ports.add(value);
      return value;
    });
  }
  return [...ports];
}

export function moveRecordedPorts(rows: readonly string[], moves: ReadonlyMap<number, number>): string[] {
  if (moves.size === 0) return [...rows];
  const pattern = new RegExp(`(?<!\\d)(${[...moves.keys()].join('|')})(?!\\d)`, 'g');
  const moveText = (text: string) => text.replace(pattern, (port) => String(moves.get(Number(port)) ?? port));
  return rows.map((line) => {
    if (![...moves.keys()].some((port) => line.includes(String(port)))) return line;
    const moved = walk(JSON.parse(line) as Json, (key, value) => {
      if (key === 'port' && typeof value === 'number') return moves.get(value) ?? value;
      if (typeof value === 'string') return moveText(value);
      return value;
    });
    return JSON.stringify(moved);
  });
}
