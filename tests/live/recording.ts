import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir, hostname, tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import type { HarnessId } from '@studio/events';

export type Recordings = Record<string, unknown[]>;

type Bag = Record<string, unknown>;
const isBag = (value: unknown): value is Bag => value !== null && typeof value === 'object' && !Array.isArray(value);

const OURS = new Set(['studio']);
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const DOCUMENTATION_EMAIL = /@(?:[A-Za-z0-9-]+\.)*(?:example\.(?:com|org|net)|[A-Za-z0-9-]+\.(?:test|example|invalid|localhost))$/i;
const GENERATED_ID = /^(?:[a-z]+_(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{12,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const ANY_HOME = /(?<![\w.%-])\/(?:Users|home)\/(?!<user>)[A-Za-z0-9._-]+|%2F(?:Users|home)%2F(?!<user>)[A-Za-z0-9._-]+/i;
const SCRATCHPAD = /\/(?:private\/)?tmp\/claude-\d+\//;
const ACCOUNT_KEPT = new Set(['status', 'rateLimitType', 'limitId', 'resetType']);
/** A message, request, reasoning or credit id as Anthropic and OpenAI mint them; a placeholder is too short to match. */
const PROVIDER_ID = /(?<![A-Za-z0-9_])(?:msg|req|rs|RateLimitResetCredit)_(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{20,}(?![A-Za-z0-9_])/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NO_UUID = '00000000-0000-4000-8000-000000000000';
const NO_PLAN = 'unknown';
const NO_DATE = '1970-01-01T00:00:00.000Z';
const NO_SIGNATURE = '<signature>';

export interface Identity {
  home: string;
  tmp: string[];
  user: string;
  host: string[];
}

function machine(): Identity {
  const tmp = [...new Set([realpathSync(tmpdir()), tmpdir()])].map((dir) => dir.replace(/\/$/, ''));
  const host = hostname();
  return { home: homedir(), tmp, user: userInfo().username, host: [...new Set([host, host.split('.')[0] ?? host])] };
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const caseless = (text: string): string => escape(text).replace(/[A-Za-z]/g, (letter) => `[${letter.toLowerCase()}${letter.toUpperCase()}]`);
const dashed = (path: string): string => path.replace(/[/.]/g, '-');
const projectKey = (path: string): string => path.replace(/[^a-zA-Z0-9]/g, '-');
const named = (text: string): boolean => text.length >= 2;
const word = (text: string): string => `(?<=^|[^A-Za-z0-9_]|\\\\[nrt])${caseless(text)}(?![A-Za-z0-9_])`;

/** Agent prose links a project by its lowercased, URL-encoded path, so each machine path is matched in every form it travels in. */
function pathForms(path: string): string[] {
  const forms = [path, path.toLowerCase()].flatMap((form) => [form, encodeURIComponent(form)]);
  return [...new Set([...forms, dashed(path), projectKey(path)])].sort((a, b) => b.length - a.length);
}

interface Span {
  start: number;
  end: number;
  to: string;
}

type Finder = (text: string) => Span[];

function finder(identity: Identity, literals: ReadonlyMap<string, string>): Finder {
  const emails = new Map<string, string>();
  const email = (address: string): string => {
    if (DOCUMENTATION_EMAIL.test(address)) return address;
    const known = emails.get(address);
    if (known !== undefined) return known;
    const next = `email-${String(emails.size + 1)}@example.com`;
    emails.set(address, next);
    return next;
  };
  const ids = new Map<string, string>();
  const id = (real: string): string => {
    const known = ids.get(real);
    if (known !== undefined) return known;
    const next = `${real.slice(0, real.indexOf('_'))}_${String(ids.size + 1).padStart(12, '0')}`;
    ids.set(real, next);
    return next;
  };
  const exact = new Map<string, string>(literals);
  for (const dir of identity.tmp) for (const form of pathForms(dir)) if (!exact.has(form)) exact.set(form, '<tmp>');
  for (const form of pathForms(identity.home)) if (!exact.has(form)) exact.set(form, '<home>');
  const rules: [string, (match: string) => string][] = [
    ...[...exact.keys()].sort((a, b) => b.length - a.length).map((form): [string, (match: string) => string] => [escape(form), () => exact.get(form)!]),
    ['/(?:private/)?tmp/claude-\\d+/[^\\s"\\\\]+?/scratchpad(?![\\w-])', () => '<scratchpad>'],
    [`(?<![\\w.%-])/(?:${caseless('Users')}|home)/(?:<user>|[A-Za-z0-9._-]+)`, () => '<home>'],
    [`%2[Ff](?:${caseless('Users')}|${caseless('home')})%2[Ff](?:<user>|[A-Za-z0-9._-]+)`, () => '<home>'],
    ['/(?:private/)?var/folders/[^/\\s"]+/[^/\\s"]+/T(?![A-Za-z0-9])', () => '<tmp>'],
    [EMAIL.source, email],
    [PROVIDER_ID.source, id],
    ...identity.host.filter(named).map((host): [string, () => string] => [word(host), () => '<host>']),
    ...(named(identity.user) ? [[word(identity.user), () => '<user>'] as [string, () => string]] : []),
  ];
  const pattern = new RegExp(rules.map(([source]) => `(${source})`).join('|'), 'g');
  return (text) => {
    const spans: Span[] = [];
    for (const match of text.matchAll(pattern)) {
      const rule = rules[match.slice(1).findIndex((group) => group !== undefined)];
      const to = rule === undefined ? match[0] : rule[1](match[0]);
      if (to !== match[0]) spans.push({ start: match.index, end: match.index + match[0].length, to });
    }
    return spans;
  };
}

function replaced(text: string, find: Finder): string {
  let out = '';
  let at = 0;
  for (const span of find(text)) {
    out += text.slice(at, span.start) + span.to;
    at = span.end;
  }
  return out + text.slice(at);
}

/** Each chunk keeps its place; a match is written into the chunk it starts in and removed from the chunks it runs on into. */
function scrubChunks(chunks: readonly string[], find: Finder): string[] {
  const joined = chunks.join('');
  const spans = find(joined);
  if (spans.length === 0) return [...chunks];
  let offset = 0;
  return chunks.map((chunk) => {
    const start = offset;
    const end = start + chunk.length;
    offset = end;
    let out = '';
    let at = start;
    for (const span of spans) {
      if (span.end <= at || span.start >= end) continue;
      if (span.start >= at) out += joined.slice(at, span.start) + span.to;
      at = Math.min(span.end, end);
    }
    return out + joined.slice(at, end);
  });
}

const DELTA_FIELDS = ['text', 'partial_json', 'thinking'] as const;

interface DeltaRef {
  row: number;
  field: (typeof DELTA_FIELDS)[number];
}

function deltaStreams(messages: readonly unknown[]): DeltaRef[][] {
  const open = new Map<string, DeltaRef[]>();
  const streams: DeltaRef[][] = [];
  messages.forEach((message, row) => {
    if (!isBag(message) || message['type'] !== 'stream_event' || !isBag(message['event'])) return;
    const event = message['event'];
    const key = `${String(message['session_id'])}|${String(message['parent_tool_use_id'])}|${String(event['index'])}`;
    if (event['type'] === 'content_block_start' || event['type'] === 'message_start') {
      open.delete(key);
      return;
    }
    if (event['type'] !== 'content_block_delta' || !isBag(event['delta'])) return;
    const delta = event['delta'];
    const field = DELTA_FIELDS.find((name) => typeof delta[name] === 'string');
    if (field === undefined) return;
    let stream = open.get(key);
    if (stream === undefined) {
      stream = [];
      open.set(key, stream);
      streams.push(stream);
    }
    stream.push({ row, field });
  });
  return streams;
}

const deltaOf = (message: unknown): Bag => ((message as Bag)['event'] as Bag)['delta'] as Bag;

function joinedDeltas(messages: unknown[], find: Finder): unknown[] {
  const out = [...messages];
  for (const stream of deltaStreams(messages)) {
    const chunks = stream.map(({ row, field }) => deltaOf(messages[row])[field] as string);
    const scrubbed = scrubChunks(chunks, find);
    stream.forEach(({ row, field }, index) => {
      if (scrubbed[index] === chunks[index]) return;
      const message = out[row] as Bag;
      const event = message['event'] as Bag;
      out[row] = { ...message, event: { ...event, delta: { ...deltaOf(message), [field]: scrubbed[index] } } };
    });
  }
  return out;
}

function scrubStrings(value: unknown, find: Finder): unknown {
  if (typeof value === 'string') return replaced(value, find);
  if (Array.isArray(value)) return value.map((entry) => scrubStrings(entry, find));
  if (isBag(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [replaced(key, find), scrubStrings(entry, find)]));
  return value;
}

type Neutral = (message: Bag, credit: (id: string) => string) => Bag;

function neutralAccount(value: unknown, credit: (id: string) => string, key = ''): unknown {
  if (typeof value === 'number') return key === 'windowDurationMins' ? value : 0;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'string') {
    if (ACCOUNT_KEPT.has(key)) return value;
    if (key === 'planType') return NO_PLAN;
    return key === 'id' ? credit(value) : '<account>';
  }
  if (Array.isArray(value)) return value.map((entry) => neutralAccount(entry, credit));
  if (isBag(value)) return Object.fromEntries(Object.entries(value).map(([childKey, entry]) => [childKey, neutralAccount(entry, credit, childKey)]));
  return value;
}

const within = (message: Bag, field: string, change: (bag: Bag) => Bag): Bag =>
  isBag(message[field]) ? { ...message, [field]: change(message[field]) } : message;

const neutralIn = (bag: Bag, keys: readonly string[], credit: (id: string) => string): Bag =>
  Object.fromEntries(Object.entries(bag).map(([key, value]) => [key, keys.includes(key) && isBag(value) ? neutralAccount(value, credit) : value]));

const scrubRateLimit: Neutral = (message, credit) => {
  if (message['type'] === 'rate_limit_event') return neutralIn(message, ['rate_limit_info'], credit);
  const notified = within(message, 'params', (params) => neutralIn(params, ['rateLimits'], credit));
  return within(notified, 'result', (result) => neutralIn(result, ['rateLimits', 'rateLimitsByLimitId', 'rateLimitResetCredits'], credit));
};

const fixed = (bag: Bag, key: string, to: string): Bag => (typeof bag[key] === 'string' ? { ...bag, [key]: to } : bag);

const scrubPlan: Neutral = (message) =>
  message['method'] === 'account/updated' ? within(message, 'params', (params) => fixed(params, 'planType', NO_PLAN)) : message;

const scrubAccountIds: Neutral = (message) =>
  within(within(message, 'params', (params) => fixed(params, 'installationId', NO_UUID)), 'result', (result) => fixed(result, 'accountId', NO_UUID));

const scrubCredentialExpiry: Neutral = (message) => fixed(message, 'credential_expires_at', NO_DATE);

function withoutSignatures(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSignatures);
  if (!isBag(value)) return value;
  const opaque = value['type'] === 'thinking' || value['type'] === 'signature_delta' ? 'signature' : value['type'] === 'redacted_thinking' ? 'data' : undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, key === opaque && typeof entry === 'string' && entry !== '' ? NO_SIGNATURE : withoutSignatures(entry)]),
  );
}

const scrubSignatures: Neutral = (message) => withoutSignatures(message) as Bag;

const NEUTRAL: [string, Neutral][] = [
  ["the account's rate-limit usage", scrubRateLimit],
  ["the account's plan", scrubPlan],
  ['an account or installation id', scrubAccountIds],
  ["the account's credential expiry", scrubCredentialExpiry],
  ['a thinking signature', scrubSignatures],
];

const sessionOf = (message: unknown): string | undefined =>
  isBag(message) && typeof message['session_id'] === 'string' && UUID.test(message['session_id']) ? message['session_id'] : undefined;

function placeholders(prefix: string): (value: string) => string {
  const seen = new Map<string, string>();
  return (value) => {
    if (OURS.has(value)) return value;
    const known = seen.get(value);
    if (known !== undefined) return known;
    const next = `${prefix}-${String(seen.size + 1)}`;
    seen.set(value, next);
    return next;
  };
}

function scrubSetup(harness: HarnessId, message: unknown, server: (v: string) => string, hook: (v: string) => string, skill: (v: string) => string): unknown {
  if (!isBag(message)) return message;
  if (harness === 'claude' && message['type'] === 'system' && message['subtype'] === 'init') {
    const servers = Array.isArray(message['mcp_servers']) ? message['mcp_servers'] : [];
    const catalogs = Object.fromEntries(
      ['skills', 'agents', 'plugins', 'slash_commands', 'terminal_slash_commands']
        .filter((key) => Array.isArray(message[key]))
        .map((key) => [key, scrubSkillMetadata(message[key], skill)]),
    );
    return {
      ...message,
      mcp_servers: servers.map((s) => (isBag(s) && typeof s['name'] === 'string' ? { ...s, name: server(s['name']) } : s)),
      ...catalogs,
      ...(typeof message['messaging_socket_path'] === 'string' ? { messaging_socket_path: '<socket>' } : {}),
      ...(Array.isArray(message['tools'])
        ? { tools: (message['tools'] as unknown[]).map((t) => (typeof t === 'string' ? renameMcpTool(t, server) : t)) }
        : {}),
    };
  }
  if (harness === 'claude' && message['type'] === 'system' && message['subtype'] === 'commands_changed' && Array.isArray(message['commands'])) {
    return { ...message, commands: scrubSkillMetadata(message['commands'], skill) };
  }
  if (harness === 'claude' && message['type'] === 'system' && typeof message['hook_name'] === 'string') {
    return { ...message, ...(typeof message['command'] === 'string' ? { command: '<hook-command>' } : {}) };
  }
  if (harness === 'codex' && typeof message['method'] === 'string' && isBag(message['params'])) {
    const params = message['params'];
    if (message['method'] === 'mcpServer/startupStatus/updated' && typeof params['name'] === 'string') {
      return { ...message, params: { ...params, name: server(params['name']) } };
    }
    if (message['method'].startsWith('hook/') && isBag(params['run'])) {
      const run = params['run'];
      return {
        ...message,
        params: {
          ...params,
          run: {
            ...run,
            ...(typeof run['id'] === 'string' ? { id: hook(run['id']) } : {}),
            ...(typeof run['sourcePath'] === 'string' ? { sourcePath: '<hook-source>' } : {}),
            ...(typeof run['command'] === 'string' ? { command: '<hook-command>' } : {}),
          },
        },
      };
    }
  }
  if (harness === 'codex' && isBag(message['result']) && Array.isArray(message['result']['data'])) {
    return {
      ...message,
      result: {
        ...message['result'],
        data: message['result']['data'].map((entry: unknown) => !isBag(entry) || !Array.isArray(entry['skills']) ? entry : {
          ...entry,
          skills: entry['skills'].map((metadata: unknown) => !isBag(metadata) ? metadata : Object.fromEntries(
            Object.entries(metadata).map(([key, value]) => [key, key === 'scope' ? value : scrubSkillMetadata(value, skill)]),
          )),
        }),
      },
    };
  }
  return message;
}

function scrubSkillMetadata(value: unknown, skill: (value: string) => string): unknown {
  if (typeof value === 'string') return skill(value);
  if (Array.isArray(value)) return value.map((entry) => scrubSkillMetadata(entry, skill));
  if (isBag(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, scrubSkillMetadata(entry, skill)]));
  return value;
}

function renameMcpTool(tool: string, server: (v: string) => string): string {
  const match = /^mcp__(.+?)__(.+)$/.exec(tool);
  if (match === null) return tool;
  const name = server(match[1] ?? '');
  return OURS.has(name) ? tool : `mcp__${name}__tool`;
}

export function scrub(harness: HarnessId, recordings: Recordings, identity: Identity = machine()): Record<string, string[]> {
  const server = placeholders('mcp-server');
  const hook = placeholders('hook');
  const skill = placeholders('skill-value');
  const credit = placeholders('rate-limit-reset-credit');
  const scratchpads = new Map<string, string>();
  const sessions = new Map<string, string>();
  for (const message of Object.values(recordings).flat()) {
    const session = sessionOf(message);
    if (session !== undefined && !sessions.has(session)) sessions.set(session, NO_UUID.slice(0, -12) + String(sessions.size + 1).padStart(12, '0'));
    if (harness === 'claude' && isBag(message) && typeof message['scratchpad_path'] === 'string') {
      const path = message['scratchpad_path'];
      if (!scratchpads.has(path)) scratchpads.set(path, `<scratchpad-${String(scratchpads.size + 1)}>`);
    }
  }
  const find = finder(identity, new Map([...scratchpads, ...sessions]));
  const neutral = (message: unknown): unknown => (isBag(message) ? NEUTRAL.reduce((row, [, rule]) => rule(row, credit), message) : message);
  return Object.fromEntries(
    Object.entries(recordings).map(([scenario, messages]) => [
      scenario,
      joinedDeltas(messages.map((message) => neutral(scrubSetup(harness, message, server, hook, skill))), find).map((message) =>
        JSON.stringify(scrubStrings(message, find)),
      ),
    ]),
  );
}

function textLeaks(text: string, identity: Identity): string[] {
  const found: string[] = [];
  if (text.includes(identity.home) || ANY_HOME.test(text)) found.push('a home path');
  if (identity.tmp.some((dir) => text.includes(dir)) || /\/(?:private\/)?var\/folders\//.test(text)) found.push('the temp path');
  for (const path of [...identity.tmp, identity.home]) {
    if (pathForms(path).some((form) => form !== path && text.includes(form))) found.push('an encoded machine path');
  }
  if (SCRATCHPAD.test(text)) found.push('the SDK scratchpad path');
  if (named(identity.user) && new RegExp(word(identity.user)).test(text)) found.push('the username');
  if (identity.host.filter(named).some((host) => new RegExp(word(host)).test(text))) found.push('the hostname');
  const emails = (text.match(EMAIL) ?? []).filter((address) => !DOCUMENTATION_EMAIL.test(address));
  if (emails.length > 0) found.push(`${String(emails.length)} email address(es)`);
  return found;
}

export function leaks(text: string, identity: Identity = machine()): string[] {
  const found = textLeaks(text, identity);
  const rows = text.split('\n').flatMap((line) => {
    try {
      return [JSON.parse(line) as unknown];
    } catch {
      return [];
    }
  });
  for (const stream of deltaStreams(rows)) {
    const joined = stream.map(({ row, field }) => deltaOf(rows[row])[field] as string).join('');
    found.push(...textLeaks(joined, identity).map((what) => `${what} across stream deltas`));
  }
  if (text.search(PROVIDER_ID) !== -1) found.push('a provider message, request, reasoning or credit id');
  for (const row of rows) {
    if (!isBag(row)) continue;
    const was = JSON.stringify(row);
    for (const [what, rule] of NEUTRAL) if (JSON.stringify(rule(row, (id) => id)) !== was) found.push(what);
    const session = sessionOf(row);
    if (session !== undefined && !session.startsWith(NO_UUID.slice(0, -12))) found.push('a session id');
  }
  return [...new Set(found)];
}

function kindOf(harness: HarnessId, message: unknown): string {
  const m = message as Bag;
  if (harness === 'codex') {
    if (typeof m['method'] === 'string') return `${m['id'] === undefined ? 'notification' : 'request'} ${m['method']}`;
    const result = m['result'];
    return isBag(result) ? `response {${Object.keys(result).sort().join(', ')}}` : 'response';
  }
  const event = (m['event'] as { type?: string } | undefined)?.type;
  return [m['type'], m['subtype'], event].filter((part) => typeof part === 'string').join('/');
}

function paths(value: unknown, prefix: string, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) paths(item, `${prefix}[]`, out);
    if (value.length === 0) out.add(`${prefix}[]`);
    return;
  }
  if (isBag(value)) {
    for (const [key, child] of Object.entries(value)) {
      const shapeKey = GENERATED_ID.test(key) ? '<id>' : key;
      paths(child, prefix === '' ? shapeKey : `${prefix}.${shapeKey}`, out);
    }
    return;
  }
  out.add(`${prefix}: ${value === null ? 'null' : typeof value}`);
}

export function shapes(harness: HarnessId, recordings: Recordings): string {
  const byKind = new Map<string, Set<string>>();
  for (const messages of Object.values(recordings)) {
    for (const message of messages) {
      const kind = kindOf(harness, message);
      const set = byKind.get(kind) ?? new Set<string>();
      paths(message, '', set);
      byKind.set(kind, set);
    }
  }
  return [...byKind.keys()]
    .sort()
    .map((kind) => [`## ${kind}`, ...[...(byKind.get(kind) ?? [])].sort().map((p) => `  ${p}`)].join('\n'))
    .join('\n\n')
    .concat('\n');
}

export function writeRecordings(root: string, harness: HarnessId, recordings: Recordings): string[] {
  const dir = join(root, harness);
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  const scrubbed = scrub(harness, recordings);
  for (const [scenario, lines] of Object.entries(scrubbed)) {
    const path = join(dir, `${scenario}.jsonl`);
    writeFileSync(path, lines.join('\n').concat('\n'));
    written.push(path);
  }
  const parsed = Object.fromEntries(
    Object.entries(scrubbed).map(([scenario, lines]) => [scenario, lines.map((line) => JSON.parse(line) as unknown)]),
  );
  const shapesPath = join(dir, 'shapes.txt');
  writeFileSync(shapesPath, shapes(harness, parsed));
  written.push(shapesPath);
  return written;
}

