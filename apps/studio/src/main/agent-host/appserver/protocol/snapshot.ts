import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { probeOutput } from '../../../log/index.js';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const UNIONS = ['ClientRequest', 'ServerRequest', 'ServerNotification', 'ClientNotification'] as const;
type Union = (typeof UNIONS)[number];

/** Excluded: the v1 bundle lacks the item types and the v2 bundle lacks the approvals. */
const BUNDLE_PREFIX = 'codex_app_server_protocol';

export interface ProtocolSnapshot {
  readonly codexVersion: string;
  readonly experimental: boolean;
  readonly methods: Record<Union, Record<string, { params: string | null; response: string | null }>>;
  /** `<dir>/<TypeName>`, qualified so a v3/ type cannot overwrite a v2 one. */
  readonly types: Record<string, Json>;
  readonly definitions: Record<string, Json>;
}

export function canonicalize(value: Json): Json {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  const out: { [key: string]: Json } = {};
  for (const key of Object.keys(value).sort()) {
    if (key === '$schema') continue;
    out[key] = canonicalize(value[key] as Json);
  }
  return out;
}

function refName(node: Json | undefined): string | null {
  if (node === null || node === undefined || typeof node !== 'object' || Array.isArray(node)) return null;
  const ref = node['$ref'];
  if (typeof ref !== 'string') return null;
  const marker = '#/definitions/';
  return ref.startsWith(marker) ? ref.slice(marker.length) : ref;
}

function methodIndex(union: Json): Record<string, { params: string | null; response: string | null }> {
  const out: Record<string, { params: string | null; response: string | null }> = {};
  if (union === null || typeof union !== 'object' || Array.isArray(union)) return out;
  const members = union['oneOf'];
  if (!Array.isArray(members)) return out;
  for (const member of members) {
    if (member === null || typeof member !== 'object' || Array.isArray(member)) continue;
    const props = member['properties'];
    if (props === null || typeof props !== 'object' || Array.isArray(props)) continue;
    const method = props['method'];
    if (method === null || typeof method !== 'object' || Array.isArray(method)) continue;
    // The generator emits `enum`, not `const`; reading `const` yields an empty index and a gate that never fires.
    const values = method['enum'];
    const name = Array.isArray(values) && typeof values[0] === 'string' ? values[0] : null;
    if (name === null) continue;
    const params = refName(props['params']);
    // The response type is not on the member; derived by convention and recorded as a name only.
    const response = params === null ? null : params.replace(/Params$/, 'Response');
    out[name] = { params, response };
  }
  return out;
}

/** Even codegen writes into `CODEX_HOME`; the scratch one keeps the user's state untouched. */
export function generateSchemas(codexBin: string): { dir: string; version: string } {
  const work = mkdtempSync(join(tmpdir(), 'codex-schema-'));
  const codexHome = join(work, 'home');
  const out = join(work, 'json');
  mkdirSync(codexHome, { recursive: true });
  mkdirSync(out, { recursive: true });
  const env = { ...process.env, CODEX_HOME: codexHome };
  const version = execFileSync(codexBin, ['--version'], { env, encoding: 'utf8' }).trim();
  execFileSync(codexBin, ['app-server', 'generate-json-schema', '--experimental', '--out', out], {
    env,
    stdio: 'pipe',
  });
  return { dir: out, version };
}

function schemaFiles(dir: string): { key: string; path: string }[] {
  const found: { key: string; path: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const child of readdirSync(join(dir, entry.name))) {
        if (child.endsWith('.json')) {
          found.push({ key: `${entry.name}/${basename(child, '.json')}`, path: join(dir, entry.name, child) });
        }
      }
    } else if (entry.name.endsWith('.json')) {
      found.push({ key: basename(entry.name, '.json'), path: join(dir, entry.name) });
    }
  }
  return found;
}

export function buildSnapshot(schemaDir: string, version: string): ProtocolSnapshot {
  const files = schemaFiles(schemaDir);
  if (files.length === 0) {
    throw new Error(`snapshot: no schema files under ${schemaDir} — the generator produced nothing`);
  }

  const read = (path: string): Json => JSON.parse(readFileSync(path, 'utf8')) as Json;
  const methods = {} as Record<Union, Record<string, { params: string | null; response: string | null }>>;
  for (const union of UNIONS) {
    const file = files.find((f) => f.key === union);
    if (file === undefined) throw new Error(`snapshot: union ${union} is missing from the generator output`);
    methods[union] = methodIndex(read(file.path));
    if (Object.keys(methods[union]).length === 0) {
      throw new Error(`snapshot: union ${union} yielded an empty method index — the member shape changed`);
    }
  }

  const types: Record<string, Json> = {};
  for (const file of files) {
    if (UNIONS.includes(file.key as Union)) continue;
    if (file.key.startsWith(BUNDLE_PREFIX)) continue;
    types[file.key] = canonicalize(read(file.path));
  }

  const hoisted = hoistDefinitions(types);
  return {
    codexVersion: version,
    experimental: true,
    methods: Object.fromEntries(UNIONS.map((u) => [u, sortRecord(methods[u])])) as ProtocolSnapshot['methods'],
    types: sortRecord(hoisted.types),
    definitions: sortRecord(hoisted.definitions),
  };
}

function isRecord(value: Json | undefined): value is { [key: string]: Json } {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

export function hoistDefinitions(schemas: Record<string, Json>): {
  types: Record<string, Json>;
  definitions: Record<string, Json>;
} {
  const types: Record<string, Json> = {};
  const definitions: Record<string, Json> = {};
  for (const [key, schema] of Object.entries(schemas)) {
    if (!isRecord(schema) || !isRecord(schema['definitions'])) {
      types[key] = schema;
      continue;
    }
    const { definitions: defs, ...body } = schema;
    for (const [name, def] of Object.entries(defs)) {
      const existing = definitions[name];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(def)) {
        throw new Error(`snapshot: definition '${name}' has two different bodies`);
      }
      definitions[name] = def;
    }
    types[key] = body;
  }
  return { types, definitions };
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(record).sort().map((k) => [k, record[k] as T]));
}

export function serialize(snapshot: ProtocolSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const at = argv.indexOf(name);
    return at === -1 ? undefined : argv[at + 1];
  };
  const bin = flag('--bin');
  const out = flag('--out');
  if (bin === undefined || out === undefined) {
    probeOutput('usage: bun snapshot.ts --bin <codex-binary> --out <file.json>');
    process.exit(2);
  }
  const { dir, version } = generateSchemas(bin);
  try {
    const snapshot = buildSnapshot(dir, version);
    writeFileSync(out, serialize(snapshot));
    const counts = UNIONS.map((u) => `${u}=${String(Object.keys(snapshot.methods[u]).length)}`).join(' ');
    probeOutput(`snapshot: ${version} (experimental) -> ${out}`);
    probeOutput(`  ${counts} types=${String(Object.keys(snapshot.types).length)}`);
  } finally {
    rmSync(join(dir, '..'), { recursive: true, force: true });
  }
}
