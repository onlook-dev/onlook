import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';

const { clearIdentity, markMergeCompleted, readIdentity, readMergeCompleted, resetIdentityCache, writeIdentity } =
  await import('./store.js');

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-identity-${name}-`));
  made.push(root);
  return root;
}

const originalRoot = process.env['STUDIO_STATE_ROOT'];

beforeEach(() => {
  resetIdentityCache();
});

afterEach(() => {
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('writeIdentity', () => {
  it('refuses a future identity on the first write and reads a safe default', () => {
    const root = makeRoot('future');
    process.env['STUDIO_STATE_ROOT'] = root;
    const path = join(root, 'identity.json');
    const bytes = '{"version":99,"data":{"email":"future@example.com","source":"workos"}}\n';
    writeFileSync(path, bytes);
    expect(() => writeIdentity({ email: 'next@example.com', source: 'manual' })).toThrow('identity_version_unsupported');
    expect(readIdentity()).toBeNull();
    resetIdentityCache();
    expect(readIdentity()).toBeNull();
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('reads raw legacy identity and migrates on the next write', () => {
    const root = makeRoot('legacy');
    process.env['STUDIO_STATE_ROOT'] = root;
    const path = join(root, 'identity.json');
    writeFileSync(path, '{"email":"legacy@example.com","source":"manual"}');
    expect(readIdentity()).toEqual({ email: 'legacy@example.com', source: 'manual' });
    writeIdentity({ email: 'next@example.com', source: 'manual' });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ version: 1, data: { email: 'next@example.com', source: 'manual' } });
  });
  it('normalizes the email — trim and lowercase — and answers as persisted', () => {
    process.env['STUDIO_STATE_ROOT'] = makeRoot('normalize');

    const persisted = writeIdentity({ email: '  Wren@Example.com ', source: 'manual' });
    expect(persisted).toEqual({ email: 'wren@example.com', source: 'manual' });

    resetIdentityCache();
    expect(readIdentity()).toEqual({ email: 'wren@example.com', source: 'manual' });
  });

  it('a manual write REPLACES a workos record wholesale — no stale id survives', () => {
    process.env['STUDIO_STATE_ROOT'] = makeRoot('replace');
    writeIdentity({
      email: 'wren@example.com',
      source: 'workos',
      workosUserId: 'user_01TEST',
      workosExternalId: 'neon_abc123',
    });

    writeIdentity({ email: 'wren@example.com', source: 'manual' });
    resetIdentityCache();
    expect(readIdentity()).toEqual({ email: 'wren@example.com', source: 'manual' });
  });

  it('writes identity.json mode 0600 — an email is personal data', () => {
    const root = makeRoot('mode');
    process.env['STUDIO_STATE_ROOT'] = root;
    writeIdentity({ email: 'wren@example.com', source: 'manual' });
    expect(statSync(join(root, 'identity.json')).mode & 0o777).toBe(0o600);
  });

  it('THROWS on a write failure — the one direction that must be loud', () => {
    const root = makeRoot('unwritable');
    const notADir = join(root, 'occupied');
    writeFileSync(notADir, 'not a directory\n', 'utf8');
    process.env['STUDIO_STATE_ROOT'] = join(notADir, 'state');

    expect(() => writeIdentity({ email: 'wren@example.com', source: 'manual' })).toThrow();
  });
});

describe('clearIdentity', () => {
  it('a build holding no record of its own is already clear', () => {
    process.env['STUDIO_STATE_ROOT'] = makeRoot('clear-absent');
    expect(() => clearIdentity()).not.toThrow();
    expect(readIdentity()).toBeNull();
  });

  it('still refuses a record a newer build wrote', () => {
    const root = makeRoot('clear-future');
    process.env['STUDIO_STATE_ROOT'] = root;
    const path = join(root, 'identity.json');
    const bytes = '{"version":99,"data":{"email":"future@example.com","source":"workos"}}\n';
    writeFileSync(path, bytes);
    expect(() => clearIdentity()).toThrow('identity_version_unsupported');
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });
});

describe('readIdentity — never throws', () => {
  it('answers null when no file exists', () => {
    process.env['STUDIO_STATE_ROOT'] = makeRoot('absent');
    expect(readIdentity()).toBeNull();
  });

  it('answers null for corrupt JSON, not a crash', () => {
    const root = makeRoot('corrupt');
    process.env['STUDIO_STATE_ROOT'] = root;
    writeFileSync(join(root, 'identity.json'), '{ definitely not json', 'utf8');
    expect(readIdentity()).toBeNull();
  });

  it('answers null for parseable JSON that is not an identity', () => {
    const root = makeRoot('shape');
    process.env['STUDIO_STATE_ROOT'] = root;
    writeFileSync(join(root, 'identity.json'), JSON.stringify({ source: 'manual' }), 'utf8');
    expect(readIdentity()).toBeNull();
  });
});

describe('the merge-completed marker', () => {
  it('treats a future marker as completed and refuses to replace it', () => {
    const root = makeRoot('future-merge');
    process.env['STUDIO_STATE_ROOT'] = root;
    const path = join(root, 'posthog-merge-completed.json');
    const bytes = '{"version":99,"data":{"mergedAt":"future"}}\n';
    writeFileSync(path, bytes);
    expect(readMergeCompleted()).toBe(true);
    expect(() => markMergeCompleted()).toThrow();
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });
  it('starts absent, persists once marked, and survives an identity rewrite', () => {
    process.env['STUDIO_STATE_ROOT'] = makeRoot('marker');
    expect(readMergeCompleted()).toBe(false);

    markMergeCompleted();
    expect(readMergeCompleted()).toBe(true);

    writeIdentity({ email: 'wren@example.com', source: 'workos', workosUserId: 'user_01TEST' });
    expect(readMergeCompleted()).toBe(true);
  });

  it('follows STUDIO_STATE_ROOT — a different root knows nothing of the merge', () => {
    const rootA = makeRoot('marker-a');
    process.env['STUDIO_STATE_ROOT'] = rootA;
    markMergeCompleted();
    expect(readMergeCompleted()).toBe(true);

    process.env['STUDIO_STATE_ROOT'] = makeRoot('marker-b');
    expect(readMergeCompleted()).toBe(false);

    process.env['STUDIO_STATE_ROOT'] = rootA;
    expect(readMergeCompleted()).toBe(true);
  });

  it('THROWS on an unwritable root — the caller must fail CLOSED, never merge-per-launch', () => {
    const root = makeRoot('marker-unwritable');
    const notADir = join(root, 'occupied');
    writeFileSync(notADir, 'not a directory\n', 'utf8');
    process.env['STUDIO_STATE_ROOT'] = join(notADir, 'state');

    expect(() => markMergeCompleted()).toThrow();
  });
});

describe('STUDIO_STATE_ROOT', () => {
  it('redirects both the write and the read', () => {
    const rootA = makeRoot('override-a');
    const rootB = makeRoot('override-b');

    process.env['STUDIO_STATE_ROOT'] = rootA;
    writeIdentity({ email: 'wren@example.com', source: 'manual' });

    expect(readFileSync(join(rootA, 'identity.json'), 'utf8')).toContain('wren@example.com');

    process.env['STUDIO_STATE_ROOT'] = rootB;
    resetIdentityCache();
    expect(readIdentity()).toBeNull();

    process.env['STUDIO_STATE_ROOT'] = rootA;
    resetIdentityCache();
    expect(readIdentity()).toEqual({ email: 'wren@example.com', source: 'manual' });
  });
});
