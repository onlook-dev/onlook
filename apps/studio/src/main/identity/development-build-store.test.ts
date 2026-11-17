import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { StudioIdentity } from '@studio/events';
import { setStatePackagedForTesting, setStatePlatformForTesting, setStateSharedRootForTesting } from '../state/build.js';
import { markMergeCompleted, readIdentity, readMergeCompleted, resetIdentityCache, writeIdentity } from './store.js';

const made: string[] = [];
const originalRoot = process.env['STUDIO_STATE_ROOT'];

const SIGNED: StudioIdentity = { email: 'first@onlook.test', name: 'First', source: 'provider', subject: 'user_FIRST' };
const DEVELOPMENT: StudioIdentity = { email: 'second@onlook.test', name: 'Second', source: 'provider', subject: 'user_SECOND' };

function statePath(name: string): string {
  return join(process.env['STUDIO_STATE_ROOT']!, name);
}

/** A quit and a relaunch of the other build over the same data folder. */
function relaunch(packaged: boolean): void {
  resetIdentityCache();
  setStatePackagedForTesting(packaged);
}

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'studio-development-store-'));
  made.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
  setStatePlatformForTesting('darwin');
  setStateSharedRootForTesting(true);
  relaunch(true);
});

afterEach(() => {
  resetIdentityCache();
  setStatePlatformForTesting(undefined);
  setStatePackagedForTesting(undefined);
  setStateSharedRootForTesting(undefined);
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
});

afterAll(() => {
  for (const root of made) rmSync(root, { recursive: true, force: true });
});

describe('the account store of a development build beside the signed app', () => {
  it('leaves a typed email the signed app holds in place when the development build writes its own account', () => {
    writeIdentity({ email: 'typed@onlook.test', source: 'manual' });
    const files = ['account.json', 'identity.json'].map((name) => join(process.env['STUDIO_STATE_ROOT']!, name));
    const written = files.map((file) => readFileSync(file, 'utf8'));

    relaunch(false);
    expect(readIdentity()).toBeNull();
    writeIdentity({ email: 'second@onlook.test', source: 'provider', subject: 'user_SECOND' });
    expect(files.map((file) => readFileSync(file, 'utf8'))).toEqual(written);

    relaunch(true);
    expect(readIdentity()).toEqual({ email: 'typed@onlook.test', source: 'manual' });
  });

  it('leaves the signed app the account it wrote', () => {
    writeIdentity(SIGNED);

    relaunch(false);
    expect(readIdentity()).toBeNull();
    writeIdentity(DEVELOPMENT);

    relaunch(true);
    expect(readIdentity()).toEqual(SIGNED);
  });

  it('keeps its own account when the signed app signs in after it', () => {
    relaunch(false);
    writeIdentity(DEVELOPMENT);

    relaunch(true);
    expect(readIdentity()).toBeNull();
    writeIdentity(SIGNED);

    relaunch(false);
    expect(readIdentity()).toEqual(DEVELOPMENT);
  });

  it('answers each build with its own account however often the two take turns', () => {
    writeIdentity(SIGNED);
    relaunch(false);
    writeIdentity(DEVELOPMENT);

    for (const packaged of [true, false, true, false]) {
      relaunch(packaged);
      expect(readIdentity()).toEqual(packaged ? SIGNED : DEVELOPMENT);
    }
  });

  it('keeps the signed app on the record name an installed build already wrote', () => {
    writeIdentity(SIGNED);
    expect(existsSync(statePath('identity.json'))).toBe(true);
    expect(existsSync(statePath('identity-development.json'))).toBe(false);

    relaunch(false);
    writeIdentity(DEVELOPMENT);
    expect(existsSync(statePath('identity-development.json'))).toBe(true);
  });

  it('shares the merge marker in both directions, because one install merges a person once', () => {
    expect(readMergeCompleted()).toBe(false);
    relaunch(false);
    expect(readMergeCompleted()).toBe(false);
    markMergeCompleted();
    relaunch(true);
    expect(readMergeCompleted()).toBe(true);
    relaunch(false);
    expect(readMergeCompleted()).toBe(true);
  });
});

describe('a root of its own', () => {
  it('needs no development names, which is what a suite and a seeded launch read', () => {
    setStateSharedRootForTesting(undefined);
    relaunch(false);
    writeIdentity(DEVELOPMENT);

    expect(existsSync(statePath('identity.json'))).toBe(true);
    expect(existsSync(statePath('identity-development.json'))).toBe(false);
  });
});

describe.each(['linux', 'win32'] as const)('on %s', (platform) => {
  it('keeps one account record for the signed app and a development build', () => {
    setStatePlatformForTesting(platform);
    writeIdentity(SIGNED);

    relaunch(false);
    expect(readIdentity()).toEqual(SIGNED);
    expect(existsSync(statePath('identity-development.json'))).toBe(false);
  });
});
