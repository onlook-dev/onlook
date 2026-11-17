import { describe, expect, it } from 'bun:test';
import type { WelcomeProject } from '@studio/events';
import { briefing } from './context.js';
import { memoryGuidance } from './memory.js';

const workspace: WelcomeProject = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};

describe('memoryGuidance()', () => {
  it('is present for claude', () => {
    expect(memoryGuidance('claude')).toBeDefined();
  });

  it('is absent for codex and for no harness', () => {
    expect(memoryGuidance('codex')).toBeUndefined();
    expect(memoryGuidance(undefined)).toBeUndefined();
  });
});

describe('briefing() carries the memory guidance, per harness', () => {
  it('appends it for claude only', () => {
    const guidance = memoryGuidance('claude') ?? 'unreachable';
    expect(briefing(workspace, { harness: 'claude' })).toContain(guidance);
    expect(briefing(workspace, { harness: 'codex' })).not.toContain(guidance);
    expect(briefing(workspace)).not.toContain(guidance);
  });
});
