import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { claimRunningMarker, clearRunningMarker, ownsRunningMarker, runningMarkerPath, updateRunningContext } from './crash-marker.js';

const made: string[] = [];
const saved = process.env['STUDIO_STATE_ROOT'];
const FIRST_LAUNCH = '0199e1e0-0000-7000-8000-000000000001';
const SECOND_LAUNCH = '0199e1e0-0000-7000-8000-000000000002';

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'studio-marker-'));
  made.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
});

afterEach(() => {
  if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = saved;
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('the marker', () => {
  it('keeps the last screen and project creation checkpoint across an unclean restart', () => {
    claimRunningMarker(FIRST_LAUNCH, '2.0.0');
    updateRunningContext('onboarding_screen_shown', { screen: 'import' });
    updateRunningContext('workspace_creation_flow', { step: 'started', outcome: 'started' });
    const previous = claimRunningMarker(SECOND_LAUNCH, '2.0.1');
    expect(previous?.context).toEqual({ last_event: 'workspace_creation_flow', last_screen: 'import', during_workspace_creation: true });
  });

  it('does not retain payloads or another launch’s context', () => {
    claimRunningMarker(FIRST_LAUNCH, '2.0.0');
    updateRunningContext('onboarding_screen_shown', { screen: 'private text', path: 'C:\\private\\project' });
    expect(claimRunningMarker(SECOND_LAUNCH, '2.0.1')?.context).toEqual({ last_event: 'onboarding_screen_shown' });
    updateRunningContext('workspace_creation_flow', { step: 'preview', outcome: 'success' });
    expect(claimRunningMarker(FIRST_LAUNCH, '2.0.1')?.context).toEqual({ last_event: 'workspace_creation_flow', during_workspace_creation: false });
    expect(readFileSync(runningMarkerPath(), 'utf8')).not.toContain('private');
  });
  it('does not claim or erase a future marker, even without a preceding read', () => {
    const bytes = JSON.stringify({ version: 99, data: { launchId: FIRST_LAUNCH, appVersion: '0.5.0' } });
    writeFileSync(runningMarkerPath(), bytes);
    clearRunningMarker(FIRST_LAUNCH);
    expect(claimRunningMarker(SECOND_LAUNCH, '0.5.1')).toBeUndefined();
    clearRunningMarker(SECOND_LAUNCH);
    expect(readFileSync(runningMarkerPath(), 'utf8')).toBe(bytes);
  });
  it('a clean start claims nothing and leaves this launch id behind, mode 0600', () => {
    expect(claimRunningMarker(FIRST_LAUNCH, '0.5.0')).toBeUndefined();
    expect(JSON.parse(readFileSync(runningMarkerPath(), 'utf8'))).toEqual({ version: 1, data: { launchId: FIRST_LAUNCH, appVersion: '0.5.0' } });
    expect(statSync(runningMarkerPath()).mode & 0o777).toBe(0o600);
  });

  it('a marker left by an earlier launch is the crash to report, and is overwritten', () => {
    claimRunningMarker(FIRST_LAUNCH, '0.5.0');
    expect(claimRunningMarker(SECOND_LAUNCH, '0.5.1')).toEqual({ launchId: FIRST_LAUNCH, appVersion: '0.5.0' });
    expect(JSON.parse(readFileSync(runningMarkerPath(), 'utf8')).data).toEqual({ launchId: SECOND_LAUNCH, appVersion: '0.5.1' });
  });

  it('a clean quit removes our marker; another launch id survives our shutdown', () => {
    claimRunningMarker(FIRST_LAUNCH, '0.5.0');
    clearRunningMarker(FIRST_LAUNCH);
    expect(existsSync(runningMarkerPath())).toBe(false);
    claimRunningMarker(SECOND_LAUNCH, '0.5.1');
    clearRunningMarker(FIRST_LAUNCH);
    expect(JSON.parse(readFileSync(runningMarkerPath(), 'utf8')).data).toEqual({ launchId: SECOND_LAUNCH, appVersion: '0.5.1' });
  });

  it('after a clean quit the next boot claims nothing', () => {
    claimRunningMarker(FIRST_LAUNCH, '0.5.0');
    clearRunningMarker(FIRST_LAUNCH);
    expect(claimRunningMarker(SECOND_LAUNCH, '0.5.1')).toBeUndefined();
  });

  it('a legacy marker has an unknown version rather than the reporter version', () => {
    writeFileSync(runningMarkerPath(), FIRST_LAUNCH);
    expect(claimRunningMarker(SECOND_LAUNCH, '0.5.1')).toEqual({ launchId: FIRST_LAUNCH, appVersion: null });
  });

  it('same-launch claims and malformed markers do not report a crash or telemetry content', () => {
    claimRunningMarker(FIRST_LAUNCH, '0.5.0');
    expect(claimRunningMarker(FIRST_LAUNCH, '0.5.0')).toBeUndefined();
    for (const malformed of ['{bad json', '/Users/wren/repo', 'private-code-content', JSON.stringify({ launchId: FIRST_LAUNCH, appVersion: '/Users/wren/repo' })]) {
      writeFileSync(runningMarkerPath(), malformed);
      expect(claimRunningMarker(SECOND_LAUNCH, '0.5.1')).toBeUndefined();
    }
  });
});

describe('who may claim it (ONL-2343 review)', () => {
  it('refuses a headless drive pointed at the real user directory', () => {
    expect(ownsRunningMarker({ AGENT_HEADLESS: '1' })).toBe(false);
  });

  it('allows a drive that brought its own state root', () => {
    expect(ownsRunningMarker({ AGENT_HEADLESS: '1', STUDIO_STATE_ROOT: '/tmp/scratch' })).toBe(true);
    expect(ownsRunningMarker({ STUDIO_STATE_ROOT: '/tmp/scratch' })).toBe(true);
  });

  it('allows an ordinary launch', () => {
    expect(ownsRunningMarker({})).toBe(true);
  });
});
