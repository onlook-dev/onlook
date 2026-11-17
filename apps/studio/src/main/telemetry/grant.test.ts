import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const { mintGrant, readGrant } = await import('./grant.js');

const saved = process.env['STUDIO_STATE_ROOT'];

let root = '';

function grantPath(): string {
  return join(root, 'telemetry', 'grant.json');
}

beforeEach(() => {
  root = makeStateRoot({ name: 'telemetry-grant' });
  process.env['STUDIO_STATE_ROOT'] = root;
});

afterAll(() => {
  if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = saved;
  cleanupTempFixtures();
});

describe('the consent grant', () => {
  it('mints 32 hex characters, reads them back, and never repeats one', () => {
    expect(readGrant()).toBeUndefined();
    const minted = Array.from({ length: 50 }, () => mintGrant());
    expect(minted.every((grant) => grant !== undefined && /^[0-9a-f]{32}$/.test(grant))).toBe(true);
    expect(new Set(minted).size).toBe(50);
    expect(readGrant()).toBe(minted[49]);
  });

  it('reads anything but a stored grant as none', () => {
    mkdirSync(join(root, 'telemetry'), { recursive: true });
    for (const stored of ['{ this is not json', '{"version":1,"data":{}}', '{"version":1,"data":{"grant":"short"}}', '{"version":1,"data":{"grant":"../../escape"}}', '{"version":1,"data":null}']) {
      writeFileSync(grantPath(), stored, 'utf8');
      expect(readGrant()).toBeUndefined();
    }
  });

  it('mints over a grant file this build cannot read, which would otherwise brick the outbox', () => {
    mkdirSync(join(root, 'telemetry'), { recursive: true });
    writeFileSync(grantPath(), '{"version":99,"data":{"grant":"from-a-later-build"}}', 'utf8');
    expect(readGrant()).toBeUndefined();
    const minted = mintGrant();
    expect(minted).toMatch(/^[0-9a-f]{32}$/);
    expect(readGrant()).toBe(minted);
  });
});
