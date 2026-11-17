import { expect, test } from 'bun:test';
import { headBranches } from './branches.js';

test('only real heads come back from a listing, whatever else the remote prints', () => {
  const output = [
    '4b929e9a7b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e\trefs/heads/main',
    '905afd01d1234567890abcdef1234567890abcde\trefs/heads/release/2.1',
    'd48e92998fedcba9876543210fedcba987654321\trefs/tags/v1',
    'warning: redirecting to https://github.com/team/site.git/',
    '',
  ].join('\n');
  expect(headBranches(output)).toEqual(['main', 'release/2.1']);
});

test('a remote with nothing published lists no branches', () => {
  expect(headBranches('')).toEqual([]);
});
