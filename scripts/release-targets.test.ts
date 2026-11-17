import { expect, test } from 'bun:test';
import { artifactNames, feedNames, feedProblems, packagedAppPath } from './release-targets.js';

const product = 'Onlook';
const version = '0.6.0-beta.123';
const mac = `version: ${version}\nfiles:\n  - url: Onlook-${version}-x64-mac.zip\n  - url: Onlook-${version}-x64.dmg\n  - url: Onlook-${version}-arm64-mac.zip\n  - url: Onlook-${version}-arm64.dmg\npath: Onlook-${version}-x64-mac.zip\n`;
const win = `version: ${version}\nfiles:\n  - url: Onlook-${version}-x64.exe\npath: Onlook-${version}-x64.exe\n`;

test('both platform inventories include every installer and differential update payload', () => {
  expect(artifactNames(product, version, 'mac')).toHaveLength(6);
  expect(artifactNames(product, version, 'win')).toEqual([`Onlook-${version}-x64.exe`, `Onlook-${version}-x64.exe.blockmap`]);
  expect(feedNames('win')).toEqual(['latest.yml', 'beta.yml']);
  expect(packagedAppPath('release', product, 'x64')).toBe('release/mac/Onlook.app');
});

test('a stage rejects missing, foreign, and mismatched-version feed entries', () => {
  expect(feedProblems(mac, product, version, 'mac')).toEqual([]);
  expect(feedProblems(win, product, version, 'win')).toEqual([]);
  expect(feedProblems(mac.replaceAll('-arm64.dmg', '-wrong.dmg'), product, version, 'mac')).toHaveLength(2);
  expect(feedProblems(win, product, 'wrong', 'win').length).toBeGreaterThan(0);
});
