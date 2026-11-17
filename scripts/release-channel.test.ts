import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { builderReleaseArgs, CHANNELS, releaseOptions, validateVersion } from './release-channel.js';
import { feedNames } from './release-targets.js';
import { stamp } from './version.js';

test('source packaging never adds an official update channel', () => {
  expect(builderReleaseArgs('beta', '1.2.3-beta.1', false)).toEqual(['-c.extraMetadata.version=1.2.3-beta.1']);
  expect(builderReleaseArgs(undefined, undefined, false)).toEqual([]);
  expect(builderReleaseArgs('beta', '1.2.3-beta.1', true)).toContain('-c.publish.channel=beta');
});

test('channel versions reject mismatches and version-only release requests before building', () => {
  for (const args of [
    ['--channel', 'beta', '--version', '0.2.0'],
    ['--channel', 'latest', '--version', '0.2.0-beta.1'],
    ['--channel', 'alpha', '--version', '0.2.0-beta.1'],
    ['--version', '0.2.0'], ['--version'], ['--channel'], ['--channel', 'gamma'],
    ['--channel', '--version', '0.2.0'], ['--channel', 'alpha', '--channel', 'beta'],
  ]) {
    expect(() => releaseOptions(args)).toThrow();
  }
  for (const version of ['0.2.0-alpha.01', '0.2.0-alpha', '0.2.0-alpha.1.extra', '0.2.0-alpha.word', 'v0.2.0-alpha.1', '0.2.0-alpha.-1']) {
    expect(() => validateVersion(version, 'alpha')).toThrow();
  }
  for (const [channel, version] of [['alpha', '0.2.0-alpha.1'], ['beta', '0.2.0-beta.1'], ['latest', '0.2.0']] as const) {
    expect(releaseOptions(['--channel', channel, '--version', version])).toEqual({ channel, version });
  }
});

test('explicit channel feeds are isolated and legacy feed selection and stamping remain unchanged', () => {
  expect(stamp('0.1.1', 3151)).toBe('0.1.1-beta.3151');
  expect(stamp('0.2.1', 61, 'alpha')).toBe('0.2.1-alpha.61');
  expect(stamp('0.2.1', 61, 'latest')).toBe('0.2.1');
  expect(feedNames('mac')).toEqual(['latest-mac.yml', 'beta-mac.yml']);
  expect(feedNames('win')).toEqual(['latest.yml', 'beta.yml']);
  for (const channel of CHANNELS) {
    expect(feedNames('mac', channel)).toEqual([`${channel}-mac.yml`]);
    expect(feedNames('win', channel)).toEqual([`${channel}.yml`]);
  }
  expect(releaseOptions([])).toEqual({});
  expect(releaseOptions(['--version', '0.1.1-beta.3151'], true)).toEqual({ version: '0.1.1-beta.3151' });
});

test('release versions accept only strict stable, alpha and beta shapes', () => {
  for (const version of ['0.0.0', '1.2.3', '1.2.3-alpha.0', '1.2.3-beta.12']) {
    expect(() => validateVersion(version)).not.toThrow();
  }
  for (const version of ['01.2.3', '1.02.3', '1.2.03', '1.2.3-rc.1', '1.2.3-alpha', '1.2.3-beta.01', '1.2.3+build', '1.2.3\n', ' 1.2.3']) {
    expect(() => validateVersion(version)).toThrow('Invalid release version');
  }
});

test('Mac alpha and Windows beta cuts pass channel and version to electron-builder', () => {
  expect(builderReleaseArgs('alpha')).toEqual(['-c.publish.channel=alpha']);
  expect(builderReleaseArgs('beta', '0.2.0-beta.1')).toEqual(['-c.publish.channel=beta', '-c.extraMetadata.version=0.2.0-beta.1']);
  expect(builderReleaseArgs(undefined, '0.1.1-beta.3151')).toEqual(['-c.publish.channel=latest', '-c.extraMetadata.version=0.1.1-beta.3151']);
  for (const script of ['cut-dmg.ts', 'cut-windows.ts']) {
    expect(readFileSync(join(import.meta.dirname, script), 'utf8')).toContain('...builderReleaseArgs(');
  }
});
