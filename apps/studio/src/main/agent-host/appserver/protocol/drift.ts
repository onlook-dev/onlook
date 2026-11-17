import { readFileSync } from 'node:fs';

import { probeOutput } from '../../../log/index.js';
import { hoistDefinitions, type Json, type ProtocolSnapshot } from './snapshot.js';

const UNIONS = ['ClientRequest', 'ServerRequest', 'ServerNotification', 'ClientNotification'] as const;
type Union = (typeof UNIONS)[number];

export interface SetDelta {
  readonly added: string[];
  readonly removed: string[];
  readonly changed: string[];
}

export interface DriftReport {
  readonly from: string;
  readonly to: string;
  readonly methods: Record<Union, SetDelta>;
  readonly types: SetDelta;
  readonly definitions: SetDelta;
}

function stable(value: Json | undefined): string {
  return JSON.stringify(value ?? null);
}

function delta(before: Record<string, unknown>, after: Record<string, unknown>): SetDelta {
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const added = [...afterKeys].filter((k) => !beforeKeys.has(k)).sort();
  const removed = [...beforeKeys].filter((k) => !afterKeys.has(k)).sort();
  const changed = [...beforeKeys]
    .filter((k) => afterKeys.has(k))
    .filter((k) => stable(before[k] as Json) !== stable(after[k] as Json))
    .sort();
  return { added, removed, changed };
}

export function diffSnapshots(before: ProtocolSnapshot, after: ProtocolSnapshot): DriftReport {
  return {
    from: before.codexVersion,
    to: after.codexVersion,
    methods: Object.fromEntries(
      UNIONS.map((u) => [u, delta(before.methods[u], after.methods[u])]),
    ) as DriftReport['methods'],
    types: delta(before.types, after.types),
    definitions: delta(before.definitions, after.definitions),
  };
}

export function isClean(report: DriftReport): boolean {
  const empty = (d: SetDelta): boolean =>
    d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0;
  return UNIONS.every((u) => empty(report.methods[u])) && empty(report.types) && empty(report.definitions);
}

export function formatReport(report: DriftReport): string {
  const lines: string[] = [`codex protocol drift: ${report.from} -> ${report.to}`, ''];
  const counts = (d: SetDelta): string =>
    `+${String(d.added.length)} / -${String(d.removed.length)} / ~${String(d.changed.length)}`;
  const section = (label: string, d: SetDelta, names: boolean): void => {
    lines.push(`  ${label.padEnd(20)} ${counts(d)}`);
    if (!names) return;
    for (const name of d.added) lines.push(`      + ${name}`);
    for (const name of d.removed) lines.push(`      - ${name}   REMOVED`);
    for (const name of d.changed) lines.push(`      ~ ${name}`);
  };

  lines.push('DEFINITIONS — the actual changes:');
  section('definitions', report.definitions, true);
  lines.push('', 'METHODS — what can be sent and received:');
  for (const union of UNIONS) section(union, report.methods[union], true);
  lines.push('', 'MESSAGE SCHEMAS — carriers to re-check (names omitted; see definitions):');
  section('types', report.types, false);
  return lines.join('\n');
}

/** Hoists again so a snapshot written before hoisting diffs cleanly against one written after. */
export function loadSnapshot(path: string): ProtocolSnapshot {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as ProtocolSnapshot;
  const hoisted = hoistDefinitions(raw.types);
  return { ...raw, types: hoisted.types, definitions: { ...raw.definitions, ...hoisted.definitions } };
}

if (import.meta.main) {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (beforePath === undefined || afterPath === undefined) {
    probeOutput('usage: bun drift.ts <baseline.json> <candidate.json>');
    process.exit(2);
  }
  const before = loadSnapshot(beforePath);
  const after = loadSnapshot(afterPath);
  const report = diffSnapshots(before, after);
  probeOutput(formatReport(report));
  if (isClean(report)) {
    probeOutput('\nno drift.');
  } else {
    probeOutput('\ndrift found — read it before bumping the pin.');
    process.exitCode = 1;
  }
}
