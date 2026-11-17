import type { BaseRefSource } from '@studio/events';

// A worktree not at the commit it was asked for is recorded even when `git worktree add` succeeded (ONL-2351).
export interface HeadJudgement {
  head_matches: boolean;
  base_kind: 'remote' | 'local-main';
}

export function judgeWorktreeHead(input: {
  expectedCommit: string | undefined;
  actualHead: string | undefined;
  baseRefSource: BaseRefSource;
}): HeadJudgement {
  return {
    head_matches: input.expectedCommit !== undefined && input.actualHead === input.expectedCommit,
    base_kind: input.baseRefSource === 'local-main' ? 'local-main' : 'remote',
  };
}
