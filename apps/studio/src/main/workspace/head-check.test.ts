import { describe, expect, it } from 'bun:test';
import { judgeWorktreeHead } from './head-check.js';

describe('judgeWorktreeHead', () => {
  it('matches only when both commits exist and are equal', () => {
    expect(judgeWorktreeHead({ expectedCommit: 'abc', actualHead: 'abc', baseRefSource: 'remote-head' })).toEqual({ head_matches: true, base_kind: 'remote' });
    expect(judgeWorktreeHead({ expectedCommit: 'abc', actualHead: 'def', baseRefSource: 'remote-head' }).head_matches).toBe(false);
    expect(judgeWorktreeHead({ expectedCommit: undefined, actualHead: 'abc', baseRefSource: 'remote-head' }).head_matches).toBe(false);
    expect(judgeWorktreeHead({ expectedCommit: 'abc', actualHead: undefined, baseRefSource: 'remote-head' }).head_matches).toBe(false);
  });

  it('names the base kind', () => {
    expect(judgeWorktreeHead({ expectedCommit: 'a', actualHead: 'a', baseRefSource: 'local-main' }).base_kind).toBe('local-main');
    expect(judgeWorktreeHead({ expectedCommit: 'a', actualHead: 'a', baseRefSource: 'remote-head' }).base_kind).toBe('remote');
  });
});
