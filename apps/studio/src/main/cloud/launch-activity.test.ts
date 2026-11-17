import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeStateFile } from '../state/file.js';
import { trackLaunchActivity } from './launch-activity.js';

test('launch activity measures time since the last running app and preserves future state formats', () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-launch-activity-'));
  const saved = process.env['STUDIO_STATE_ROOT'];
  process.env['STUDIO_STATE_ROOT'] = root;
  const path = join(root, 'launch-activity.json');
  let now = 1000;
  try {
    const first = trackLaunchActivity(() => now);
    expect(first.unopenedMs).toBeNull();
    now = 2000;
    first.dispose();
    now += 52 * 60 * 60 * 1000;
    const next = trackLaunchActivity(() => now);
    expect(next.unopenedMs).toBe(52 * 60 * 60 * 1000);
    next.dispose();
    writeStateFile(path, 1, now + 1);
    const clockBackwards = trackLaunchActivity(() => now);
    expect(clockBackwards.unopenedMs).toBeNull();
    clockBackwards.dispose();
    writeStateFile(path, 99, now);
    const future = readFileSync(path, 'utf8');
    const unsupported = trackLaunchActivity(() => now);
    expect(unsupported.unopenedMs).toBeNull();
    unsupported.dispose();
    expect(readFileSync(path, 'utf8')).toBe(future);
  } finally {
    if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = saved;
    rmSync(root, { recursive: true, force: true });
  }
});
