import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_USERS: Record<string, readonly string[]> = {
  'apps/studio/src/main/agent-host/appserver/translate.test.ts': ['wren'],
  'apps/studio/src/main/agent-host/appserver/transport.test.ts': ['x'],
  'apps/studio/src/main/agent-host/project-opened.test.ts': ['tester'],
  'apps/studio/src/main/agent-host/session-telemetry.test.ts': ['someone'],
  'apps/studio/src/main/agent-host/skills.test.ts': ['skills'],
  'apps/studio/src/main/artifacts/access.test.ts': ['someone', 'user'],
  'apps/studio/src/main/artifacts/export.test.ts': ['designer'],
  'apps/studio/src/main/artifacts/grants.test.ts': ['designer'],
  'apps/studio/src/main/artifacts/privacy-workflow.test.ts': ['designer'],
  'apps/studio/src/main/artifacts/privacy.test.ts': ['designer', 'x', 'fixture'],
  'apps/studio/src/main/artifacts/snapshot.test.ts': ['private'],
  'apps/studio/src/main/artifacts/store.test.ts': ['someone', 'me'],
  'apps/studio/src/main/artifacts/text.test.ts': ['example'],
  'apps/studio/src/main/canvas/thumbnail/index.test.ts': ['someone'],
  'apps/studio/src/main/claude/index.test.ts': ['someone'],
  'apps/studio/src/main/code/mapper/sources.test.ts': ['me', 'd'],
  'apps/studio/src/main/code/scope.test.ts': ['someone'],
  'apps/studio/src/main/codex/machine.test.ts': ['o'],
  'apps/studio/src/main/env/shell-env.test.ts': ['someone'],
  'apps/studio/src/main/errors/crash-marker.test.ts': ['wren'],
  'apps/studio/src/main/errors/index.test.ts': ['wren'],
  'apps/studio/src/main/log/index.test.ts': ['wren'],
  'apps/studio/src/main/perf/resources.test.ts': ['someone'],
  'apps/studio/src/main/perf/sampler.test.ts': ['designer'],
  'apps/studio/src/main/report/payload.test.ts': ['someone', 'me'],
  'apps/studio/src/main/server/owner.test.ts': ['dana'],
  'apps/studio/src/main/server/sweep.test.ts': ['dev'],
  'apps/studio/src/main/settings/telemetry.test.ts': ['someone'],
  'apps/studio/src/main/tabs/telemetry.test.ts': ['someone'],
  'apps/studio/src/main/telemetry/ipc.test.ts': ['wren', 'x', 'tester', 'someone', 'private'],
  'apps/studio/src/main/telemetry/session-id.test.ts': ['someone'],
  'apps/studio/src/main/workspace/discover.test.ts': ['fixture'],
  'apps/studio/src/main/workspace/git.test.ts': ['someone'],
  'apps/studio/src/main/workspace/import.test.ts': ['fixture'],
  'apps/studio/src/main/workspace/quarantine.test.ts': ['fixture'],
  'apps/studio/src/main/workspace/store.test.ts': ['fixture'],
  'apps/studio/src/main/workspace/telemetry.test.ts': ['x'],
  'apps/studio/src/renderer/lab/bridge.ts': ['designer'],
  'apps/studio/src/renderer/src/canvas/refusal.test.ts': ['a'],
  'apps/studio/src/renderer/src/canvas/store.test.ts': ['tester'],
  'apps/studio/src/renderer/src/errors.test.ts': ['wren'],
  'apps/studio/src/renderer/src/log.test.ts': ['wren'],
  'apps/studio/src/renderer/src/perf/loaf.test.ts': ['someone'],
  'apps/studio/src/renderer/src/replay/derive.test.ts': ['someone'],
  'packages/events/src/scrub.test.ts': ['wren', 'x'],
  'tests/apparatus/src/recording-scrub.test.ts': ['avery'],
};

const HOME_PATH = new RegExp('(?:/' + 'Users/|/' + 'home/|[A-Z]:\\\\Users\\\\)([^/\\\\\\s"\\x27`<>]+)', 'gi');
const INTERNAL_LINK = /(?<![a-z0-9.-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:slack\.com|linear\.app|notion\.so|notion\.site|grain\.com|grain\.video|figma\.com)(?=$|[/:?#\s"'`<>),\]])[^\s"'`<>),\]]*/gi;
const PUBLIC_ENDPOINT = /^(?:https:\/\/)?mcp\.figma\.com(?:\/mcp)?\/?$/i;


/** Backends and vendors of the hosted service. The open editor names none of them; each is split here so this file does not count itself. */
export const VENDOR_NAMES: readonly string[] = [['con', 'vex'], ['work', 'os'], ['auth', 'kit'], ['post', 'hog']].map((parts) => parts.join(''));

/** Today's remaining uses, one `file → name count` per line. It only shrinks: a use not listed fails, and so does a line whose uses are gone. */
export const VENDOR_ALLOWANCE = 'scripts/check-publication.vendors.txt';
const ALLOWANCE_ARROW = ' → ';

/** Written by tools from the dependency set, which `package.json` already answers for. */
const GENERATED_RECORDS: readonly string[] = ['bun.lock', 'NOTICE', 'compliance/dependencies.json'];

interface Violation {
  file: string;
  line: number;
  kind: 'personal-path' | 'internal-link' | 'unreadable' | 'vendor-name' | 'stale-allowance';
  /** For the vendor kinds: the name, how many uses were found and how many are allowed. */
  detail?: string;
}

function allowanceKey(file: string, name: string): string {
  return `${file}${ALLOWANCE_ARROW}${name}`;
}

function readAllowance(root: string): string[] {
  try {
    return readFileSync(join(root, VENDOR_ALLOWANCE), 'utf8').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseAllowance(lines: readonly string[]): Map<string, number> {
  const allowed = new Map<string, number>();
  for (const line of lines) {
    const split = line.lastIndexOf(' ');
    const count = Number(line.slice(split + 1));
    if (split < 0 || !Number.isSafeInteger(count) || count < 1) throw new Error(`Unreadable line in ${VENDOR_ALLOWANCE}`);
    allowed.set(line.slice(0, split), count);
  }
  return allowed;
}

/** Uses of each vendor name in a file's path and text, in any letter case. */
function vendorUses(file: string, source: string): Map<string, number> {
  const uses = new Map<string, number>();
  const text = `${file}\n${normalize(source)}`.toLowerCase();
  for (const name of VENDOR_NAMES) {
    const count = text.split(name).length - 1;
    if (count) uses.set(allowanceKey(file, name), count);
  }
  return uses;
}

function normalize(text: string): string {
  return text.replace(/(?:%[0-9a-f]{2})+/gi, (encoded) => {
    try { return decodeURIComponent(encoded); } catch { return encoded; }
  }).replace(/\\u([0-9a-f]{4})/gi, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))).replaceAll('\\/', '/').replace(/\\+/g, '\\');
}

function inspect(file: string, source: string): Violation[] {
  const violations: Violation[] = [];
  const users = Object.hasOwn(FIXTURE_USERS, file) ? FIXTURE_USERS[file] ?? [] : [];
  for (const [index, line] of normalize(source).split('\n').entries()) {
    for (const match of line.matchAll(HOME_PATH)) {
      if (!users.includes(match[1] ?? '')) violations.push({ file, line: index + 1, kind: 'personal-path' });
    }
    for (const match of line.matchAll(INTERNAL_LINK)) {
      if (!PUBLIC_ENDPOINT.test(match[0])) violations.push({ file, line: index + 1, kind: 'internal-link' });
    }
  }
  return violations;
}

export interface PublicationOptions {
  root?: string;
  /** The allowed vendor uses; read from `VENDOR_ALLOWANCE` under `root` when absent. */
  vendorAllowance?: readonly string[];
}

export function checkPublication({ root = process.cwd(), vendorAllowance }: PublicationOptions = {}): { scanned: number; violations: Violation[]; vendorUses: string[] } {
  const allowed = parseAllowance(vendorAllowance ?? readAllowance(root));
  const found = new Map<string, number>();
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
  const violations: Violation[] = [];
  for (const file of files) {
    try {
      const path = join(root, file);
      const counted = file !== VENDOR_ALLOWANCE && !GENERATED_RECORDS.includes(file);
      if (lstatSync(path).isSymbolicLink()) {
        violations.push(...inspect(file, readlinkSync(path)));
        if (counted) for (const [key, count] of vendorUses(file, readlinkSync(path))) found.set(key, count);
        continue;
      }
      const bytes = readFileSync(path);
      violations.push(...inspect(file, bytes.toString('utf8')));
      if (counted) for (const [key, count] of vendorUses(file, bytes.toString('utf8'))) found.set(key, count);
      if (bytes.includes(0)) {
        for (const offset of [0, 1]) {
          const aligned = bytes.subarray(offset, bytes.length - (bytes.length - offset) % 2);
          violations.push(...inspect(file, aligned.toString('utf16le')));
          violations.push(...inspect(file, Buffer.from(aligned).swap16().toString('utf16le')));
        }
      }
    } catch {
      violations.push({ file, line: 0, kind: 'unreadable' });
    }
  }
  for (const [key, count] of [...found].sort(([a], [b]) => a.localeCompare(b))) {
    const limit = allowed.get(key) ?? 0;
    const [file = '', name = ''] = key.split(ALLOWANCE_ARROW);
    if (count > limit) violations.push({ file, line: 0, kind: 'vendor-name', detail: `${name} ${String(count)}, allowed ${String(limit)}` });
  }
  for (const [key, limit] of [...allowed].sort(([a], [b]) => a.localeCompare(b))) {
    const count = found.get(key) ?? 0;
    const [file = '', name = ''] = key.split(ALLOWANCE_ARROW);
    if (count < limit) violations.push({ file, line: 0, kind: 'stale-allowance', detail: `${name} ${String(count)}, allowed ${String(limit)}` });
  }
  return {
    scanned: files.length,
    violations: [...new Map(violations.map((item) => [`${item.file}\0${item.line}\0${item.kind}\0${item.detail ?? ''}`, item])).values()],
    vendorUses: [...found].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => `${key} ${String(count)}`),
  };
}

if (import.meta.main) {
  try {
    // Lowers or drops the allowance lines whose uses are gone; it never adds or raises one.
    if (process.argv.includes('--prune-vendors')) {
      const found = parseAllowance(checkPublication({ vendorAllowance: [] }).vendorUses);
      const listed = readAllowance(process.cwd());
      const kept = [...parseAllowance(listed)].flatMap(([key, limit]) => {
        const count = Math.min(limit, found.get(key) ?? 0);
        return count ? [`${key} ${String(count)}`] : [];
      });
      if (listed.length) writeFileSync(join(process.cwd(), VENDOR_ALLOWANCE), kept.length ? `${kept.join('\n')}\n` : '');
    }
    const result = checkPublication();
    for (const violation of result.violations) {
      const file = normalize(violation.file).replace(HOME_PATH, '[redacted]').replace(INTERNAL_LINK, '[redacted]');
      console.error(`${JSON.stringify(file)}:${violation.line}: ${violation.kind}${violation.detail ? ` (${violation.detail})` : ''}`);
    }
    if (result.violations.some((item) => item.kind === 'vendor-name')) {
      console.error(`The editor names no backend or vendor of the hosted service. Use a neutral name; ${VENDOR_ALLOWANCE} only shrinks.`);
    }
    if (result.violations.some((item) => item.kind === 'stale-allowance')) {
      console.error('A listed vendor use is gone. Lower the list: bun run check:publication --prune-vendors');
    }
    if (result.violations.length) {
      console.error('Publication check failed. Replace private examples or review an exact fixture allowance.');
      process.exitCode = 1;
    } else {
      console.log(`Publication patterns checked in ${result.scanned} tracked ${result.scanned === 1 ? 'file' : 'files'}.`);
    }
  } catch {
    console.error('Publication check could not read the tracked tree. Check the checkout and file access, then run it again.');
    process.exitCode = 1;
  }
}
