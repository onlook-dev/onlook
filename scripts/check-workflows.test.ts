import { expect, test } from 'bun:test';
import { LINTER_ARGS, linterAsset } from './check-workflows';

test('the workflow linter is a pinned release with a SHA-256 for every supported platform', () => {
  for (const [platform, arch] of [['darwin', 'arm64'], ['darwin', 'x64'], ['linux', 'arm64'], ['linux', 'x64'], ['win32', 'x64']] as const) {
    const asset = linterAsset(platform, arch);
    expect(asset?.url).toMatch(/^https:\/\/github\.com\/rhysd\/actionlint\/releases\/download\/v\d+\.\d+\.\d+\/actionlint_\d+\.\d+\.\d+_/);
    expect(asset?.url.endsWith(`/${asset.name}`)).toBe(true);
    expect(asset?.sha256).toMatch(/^[0-9a-f]{64}$/);
  }
});

test('the workflow linter refuses a platform it has no pinned archive for', () => {
  expect(linterAsset('win32', 'arm64')).toBeUndefined();
  expect(linterAsset('freebsd', 'x64')).toBeUndefined();
});

test('the workflow linter ignores whichever shell and Python linters the machine has', () => {
  expect(LINTER_ARGS).toEqual(['-shellcheck=', '-pyflakes=']);
});
