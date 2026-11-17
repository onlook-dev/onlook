import { createHash, randomInt, randomUUID } from 'node:crypto';

const COLOURS = [
  'teal',
  'amber',
  'indigo',
  'cobalt',
  'crimson',
  'jade',
  'saffron',
  'slate',
  'violet',
  'copper',
] as const;

const BIRDS = [
  'skylark',
  'kestrel',
  'heron',
  'swift',
  'plover',
  'wren',
  'osprey',
  'avocet',
  'merlin',
  'redstart',
] as const;

function pick<T>(items: readonly T[]): T {
  // `Math.random` collides across projects created in one tick, and this names a branch in a real repo.
  return items[randomInt(items.length)] as T;
}

export function generateWorkspaceName(): string {
  return `${pick(COLOURS)}-${pick(BIRDS)}`;
}

export function nextCopyName(sourceName: string, occupied: readonly string[]): string {
  const base = sourceName.replace(/ copy(?: \d+)?$/, '');
  const names = new Set(occupied);
  const first = `${base} copy`;
  if (!names.has(first)) return first;
  let ordinal = 2;
  while (names.has(`${first} ${String(ordinal)}`)) ordinal += 1;
  return `${first} ${String(ordinal)}`;
}

export function titleCaseWorkspaceName(workspaceName: string): string {
  return workspaceName
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Minted once and not re-derived from a later remote; the tag keeps it off a leading `/`, which the registry's v1 migration reads as a local-path remote (ONL-2152).
const BLANK_IDENTITY_TAG = 'blank';

export function mintBlankIdentity(): string {
  return `${BLANK_IDENTITY_TAG}/${randomUUID()}`;
}

export const BLANK_DIR_PREFIX = `${BLANK_IDENTITY_TAG}-`;

// Deterministic so a re-pick of the same folder finds its bucket; the caller canonicalises the path (ONL-2177).
const COPIED_IDENTITY_TAG = 'copied';

export function copiedIdentityFor(canonicalSourcePath: string): string {
  return `${COPIED_IDENTITY_TAG}/${createHash('sha256').update(canonicalSourcePath).digest('hex')}`;
}

export const COPIED_DIR_PREFIX = `${COPIED_IDENTITY_TAG}-`;

export const SWEPT_DIR_PREFIXES = [BLANK_DIR_PREFIX, COPIED_DIR_PREFIX] as const;

export function slugify(input: string, maxLength = 32): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

// Hand-rolled: `new URL()` rejects the scp form `git@host:owner/repo.git`.
export function handleFromRemoteUrl(url: string): string | undefined {
  const withoutSuffix = url.replace(/\.git\/?$/, '');
  const scp = /^[^/]+@[^/:]+:(.+)$/.exec(withoutSuffix);
  const path = scp?.[1] ?? withoutSuffix.replace(/^[a-z+]+:\/\/[^/]+\//i, '');
  const segments = path.split('/').filter(Boolean);
  const owner = segments.at(-2);
  if (!owner) return undefined;
  // A local-path remote such as `<repo>/.git/local-origin.git` leaves `.git` in the owner slot (ONL-1871).
  if (owner === '.git') return undefined;
  const slug = slugify(owner);
  return slug || undefined;
}

export function repoNameFromRemoteUrl(url: string): string | undefined {
  const withoutSuffix = url.replace(/\.git\/?$/, '');
  const name = withoutSuffix.split('/').filter(Boolean).at(-1);
  return name && name.length > 0 ? name : undefined;
}

export function isLocalPathRemote(url: string): boolean {
  if (/^[^/]+@[^/:]+:.+$/.test(url)) return false;
  if (/^[a-z+]+:\/\//i.test(url)) return false;
  return true;
}

export function resolveHandle(options: {
  remoteUrl?: string | undefined;
  userName?: string | undefined;
}): string {
  if (options.remoteUrl) {
    const fromRemote = handleFromRemoteUrl(options.remoteUrl);
    if (fromRemote) return fromRemote;
  }
  if (options.userName) {
    const fromConfig = slugify(options.userName);
    if (fromConfig) return fromConfig;
  }
  // A handle is always found: failing to name a project is not a reason to fail to isolate a repo.
  return 'onlook';
}

// Carries the org and repo name; telemetry sees it only hashed through `workspaceTelemetryId()`.
export function repoIdentityFromRemoteUrl(url: string): string {
  const withoutSuffix = url.replace(/\.git\/?$/, '').replace(/\/+$/, '');
  const scp = /^[^/]+@([^/:]+):(.+)$/.exec(withoutSuffix);
  if (scp) {
    const [, host, path] = scp;
    return `${(host ?? '').toLowerCase()}/${(path ?? '').toLowerCase()}`;
  }
  const url_ = /^[a-z+]+:\/\/(?:[^@/]+@)?([^/]+)\/(.+)$/i.exec(withoutSuffix);
  if (url_) {
    const [, host, path] = url_;
    return `${(host ?? '').toLowerCase()}/${(path ?? '').toLowerCase()}`;
  }
  return withoutSuffix.toLowerCase();
}

// 120, not `slugify`'s 32: truncating `github-com-acme-<long-name>` collides two sibling projects onto one directory.
export function repoIdentityDirName(identity: string): string {
  const flat = slugify(identity.replace(/\//g, '-'), 120);
  return flat || 'repo';
}
