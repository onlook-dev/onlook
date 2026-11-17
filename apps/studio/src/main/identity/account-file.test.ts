import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { StudioIdentity } from '@studio/events';
import { setStatePackagedForTesting, setStatePlatformForTesting, setStateSharedRootForTesting } from '../state/build.js';
import { clearIdentity, readIdentity, resetIdentityCache, writeIdentity } from './store.js';

const made: string[] = [];
const originalRoot = process.env['STUDIO_STATE_ROOT'];
let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'studio-account-file-'));
  made.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
});

afterEach(() => {
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
  setStatePlatformForTesting(undefined);
  setStatePackagedForTesting(undefined);
  setStateSharedRootForTesting(undefined);
  resetIdentityCache();
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const account = (): string => join(root, 'account.json');
const legacy = (): string => join(root, 'identity.json');
const envelope = (data: unknown): string => `${JSON.stringify({ version: 1, data }, null, 2)}\n`;

/** The record exactly as the release before `account.json` wrote it. */
const RELEASED = envelope({
  email: 'wren@example.com',
  name: 'Wren',
  source: 'workos',
  workosUserId: 'user_01WREN',
  workosExternalId: 'seed_wren',
  pictureUrl: 'https://pictures.example.com/wren.png',
});
const WREN: StudioIdentity = {
  email: 'wren@example.com',
  name: 'Wren',
  source: 'provider',
  subject: 'user_01WREN',
  previousSubject: 'seed_wren',
  pictureUrl: 'https://pictures.example.com/wren.png',
};
const OTHER: StudioIdentity = { email: 'other@example.com', source: 'provider', subject: 'user_02OTHER' };

/** The check the release before `account.json` runs on what it reads, so a record it would refuse is a sign-out on rollback. */
function releasedBuildReads(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown; data?: unknown };
  const record = (parsed.version === 1 ? parsed.data : parsed) as Record<string, unknown>;
  const text = (key: string): boolean => record[key] === undefined || typeof record[key] === 'string';
  const valid = typeof record['email'] === 'string' && record['email'].length > 0
    && (record['source'] === 'workos' || record['source'] === 'manual')
    && text('name') && text('workosUserId') && text('workosExternalId') && text('pictureUrl');
  return valid ? record : null;
}

describe('a profile the release before account.json left', () => {
  it('reads as the same account, its subject the id the vendor field carried', () => {
    writeFileSync(legacy(), RELEASED);
    expect(readIdentity()).toEqual(WREN);
    expect(readIdentity()?.subject).toBe('user_01WREN');
  });

  it('is never rewritten, moved or joined by a read', () => {
    writeFileSync(legacy(), RELEASED);
    const then = new Date('2026-01-02T03:04:05.000Z');
    utimesSync(legacy(), then, then);
    const before = { bytes: readFileSync(legacy()), mtime: statSync(legacy()).mtimeMs };
    readIdentity();
    resetIdentityCache();
    readIdentity();
    expect(readFileSync(legacy()).equals(before.bytes)).toBe(true);
    expect(statSync(legacy()).mtimeMs).toBe(before.mtime);
    expect(existsSync(account())).toBe(false);
  });

  it('answers nothing when it is corrupt and there is no new file, and is left as found', () => {
    writeFileSync(legacy(), '{ definitely not json');
    expect(readIdentity()).toBeNull();
    expect(readFileSync(legacy(), 'utf8')).toBe('{ definitely not json');
    expect(existsSync(account())).toBe(false);
  });
});

describe('account.json', () => {
  it('alone is the account, for a build that no longer leaves the legacy file', () => {
    writeFileSync(account(), envelope({ identity: WREN }));
    expect(readIdentity()).toEqual(WREN);
    expect(existsSync(legacy())).toBe(false);
  });

  it('and the legacy file agreeing read as the one account', () => {
    writeFileSync(account(), envelope({ identity: WREN, mirrored: true }));
    writeFileSync(legacy(), RELEASED);
    expect(readIdentity()).toEqual(WREN);
  });

  // Only an older build writes the legacy file alone, so it is the later write and names the session that build left (ONL-2882).
  it('yields to a legacy file naming another account', () => {
    writeFileSync(account(), envelope({ identity: OTHER, mirrored: true }));
    writeFileSync(legacy(), RELEASED);
    expect(readIdentity()).toEqual(WREN);
    writeFileSync(account(), envelope({ identity: OTHER }));
    resetIdentityCache();
    expect(readIdentity()).toEqual(WREN);
  });

  it('yields to a legacy file an older build completed for the same account', () => {
    writeFileSync(account(), envelope({ identity: { email: 'wren@example.com', source: 'provider' }, mirrored: true }));
    writeFileSync(legacy(), RELEASED);
    expect(readIdentity()).toEqual(WREN);
  });

  it('falls back to the legacy file when it is corrupt, unrecognised or from a newer build', () => {
    writeFileSync(legacy(), RELEASED);
    for (const broken of ['{ torn', envelope({ identity: { source: 'provider' } }), envelope(WREN), '{"version":99,"data":{"identity":{"email":"future@example.com","source":"provider"}}}\n']) {
      writeFileSync(account(), broken);
      resetIdentityCache();
      expect(readIdentity()).toEqual(WREN);
      expect(readFileSync(account(), 'utf8')).toBe(broken);
    }
  });

  it('is signed out once an older build has erased the legacy file written beside it', () => {
    writeIdentity(WREN);
    rmSync(legacy());
    resetIdentityCache();
    expect(readIdentity()).toBeNull();
    expect(existsSync(account())).toBe(true);
  });

  it('stands when the legacy file beside it is unreadable rather than gone', () => {
    writeIdentity(WREN);
    writeFileSync(legacy(), '{ torn');
    resetIdentityCache();
    expect(readIdentity()).toEqual(WREN);
  });
});

describe('a write', () => {
  it('leaves the neutral record in account.json and the release\'s own bytes in the legacy file', () => {
    expect(writeIdentity(WREN)).toEqual(WREN);
    expect(JSON.parse(readFileSync(account(), 'utf8'))).toEqual({ version: 1, data: { identity: WREN, mirrored: true } });
    expect(readFileSync(legacy(), 'utf8')).toBe(RELEASED);
    expect(statSync(account()).mode & 0o777).toBe(0o600);
    expect(statSync(legacy()).mode & 0o777).toBe(0o600);
    expect(readFileSync(account(), 'utf8')).not.toContain('workos');
  });

  it('keeps a rollback signed in as the account this build last wrote', () => {
    writeFileSync(legacy(), RELEASED);
    expect(readIdentity()).toEqual(WREN);
    expect(releasedBuildReads(legacy())).toMatchObject({ email: 'wren@example.com', workosUserId: 'user_01WREN' });
    writeIdentity(OTHER);
    expect(releasedBuildReads(legacy())).toEqual({ email: 'other@example.com', source: 'workos', workosUserId: 'user_02OTHER' });
    writeIdentity({ email: 'typed@example.com', source: 'manual' });
    expect(releasedBuildReads(legacy())).toEqual({ email: 'typed@example.com', source: 'manual' });
  });

  it('from a provider on the vendor\'s names and one on the neutral names stores the same two files', () => {
    const handed = writeIdentity({ email: ' Wren@Example.com ', name: 'Wren', source: 'workos', workosUserId: 'user_01WREN', workosExternalId: 'seed_wren', pictureUrl: 'https://pictures.example.com/wren.png' });
    const vendor = { account: readFileSync(account(), 'utf8'), legacy: readFileSync(legacy(), 'utf8'), read: readIdentity() };
    // A provider built on the vendor's names reads back the names it wrote.
    expect(handed).toEqual({ email: 'wren@example.com', name: 'Wren', source: 'workos', workosUserId: 'user_01WREN', workosExternalId: 'seed_wren', pictureUrl: 'https://pictures.example.com/wren.png' });
    clearIdentity();
    expect(writeIdentity({ ...WREN, email: ' Wren@Example.com ' })).toEqual(WREN);
    expect({ account: readFileSync(account(), 'utf8'), legacy: readFileSync(legacy(), 'utf8'), read: readIdentity() }).toEqual(vendor);
    expect(vendor.read).toEqual(WREN);
    expect(vendor.legacy).toBe(RELEASED);
  });

  it('refuses before touching either file when a newer build wrote one of them', () => {
    const future = '{"version":99,"data":{"identity":{"email":"future@example.com","source":"provider"}}}\n';
    writeFileSync(legacy(), RELEASED);
    writeFileSync(account(), future);
    expect(() => writeIdentity(OTHER)).toThrow('identity_version_unsupported');
    expect(() => clearIdentity()).toThrow('identity_version_unsupported');
    expect(readFileSync(legacy(), 'utf8')).toBe(RELEASED);
    expect(readFileSync(account(), 'utf8')).toBe(future);
  });

  it('uses the development names for both files where the build does', () => {
    setStatePlatformForTesting('darwin');
    setStatePackagedForTesting(false);
    setStateSharedRootForTesting(true);
    writeFileSync(join(root, 'identity-development.json'), RELEASED);
    expect(readIdentity()).toEqual(WREN);
    writeIdentity(OTHER);
    expect(existsSync(join(root, 'account-development.json'))).toBe(true);
    expect(existsSync(account())).toBe(false);
    expect(existsSync(legacy())).toBe(false);
    clearIdentity();
    expect(existsSync(join(root, 'account-development.json'))).toBe(false);
    expect(existsSync(join(root, 'identity-development.json'))).toBe(false);
  });
});

describe('sign-out', () => {
  it('erases both files, whichever build wrote them', () => {
    writeIdentity(WREN);
    clearIdentity();
    expect(existsSync(account())).toBe(false);
    expect(existsSync(legacy())).toBe(false);
    expect(readIdentity()).toBeNull();
    expect(releasedBuildReads(legacy())).toBeNull();

    writeFileSync(legacy(), RELEASED);
    resetIdentityCache();
    expect(readIdentity()).toEqual(WREN);
    clearIdentity();
    expect(existsSync(legacy())).toBe(false);

    writeFileSync(account(), envelope({ identity: WREN }));
    resetIdentityCache();
    expect(readIdentity()).toEqual(WREN);
    clearIdentity();
    expect(existsSync(account())).toBe(false);
    resetIdentityCache();
    expect(readIdentity()).toBeNull();
  });
});
