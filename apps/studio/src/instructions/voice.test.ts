import { describe, expect, it } from 'bun:test';
import type { WelcomeProject } from '@studio/events';
import { briefing } from './context.js';
import { askMethod } from './harness.js';
import { BLANK_FIRST_MOMENT, BLANK_PROJECT, playbook, voice } from './voice.js';

const workspace: WelcomeProject = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};

describe('the ask seam', () => {
  it('each harness asks with its own question tool; an unknown one asks in chat text (ONL-2494)', () => {
    expect(askMethod('claude')).toEqual({ tool: 'AskUserQuestion' });
    expect(askMethod('codex')).toEqual({ tool: 'request_user_input' });
    expect(askMethod(undefined)).toEqual({});
  });

  it('never teaches a tool the harness lacks', () => {
    const claude = voice({ ask: askMethod('claude') });
    const codex = voice({ ask: askMethod('codex') });
    expect(claude).toContain('`AskUserQuestion`');
    expect(claude).not.toContain('request_user_input');
    expect(codex).toContain('`request_user_input`');
    expect(codex).not.toContain('AskUserQuestion');
  });
});

describe('mode is direction', () => {
  it('reads as Experiment when no answer was given', () => {
    expect(voice({ ask: {} })).toBe(voice({ ask: {}, mode: 'experiment' }));
  });

  it('hands the agent the mode the user chose', () => {
    const experiment = voice({ ask: {}, mode: 'experiment' });
    expect(voice({ ask: {}, mode: 'design' })).not.toBe(experiment);
    expect(voice({ ask: {}, mode: 'ship' })).not.toBe(experiment);
  });
});

describe('briefing() carries the voice', () => {
  it('names the question tool only to a harness that has it', () => {
    expect(briefing(workspace, { harness: 'claude' })).toContain('`AskUserQuestion`');
    expect(briefing(workspace, { harness: 'codex' })).toContain('`request_user_input`');
    expect(briefing(workspace, { harness: 'codex' })).not.toContain('AskUserQuestion');
    expect(briefing(workspace)).not.toContain('AskUserQuestion');
    expect(briefing(workspace)).not.toContain('request_user_input');
  });

  it('carries the blank-project playbook only while the starter runs', () => {
    const blankProject = playbook(BLANK_PROJECT);
    expect(briefing(workspace)).not.toContain(blankProject);
    expect(briefing(workspace, { starter: { paragraph: 'starter paragraph' } })).toContain(blankProject);
  });

  it('asks main’s five-part round on a blank project unless blank-first-moment is on', () => {
    const starter = { paragraph: 'starter paragraph' };
    expect(briefing(workspace, { starter })).toContain(playbook(BLANK_PROJECT));
    expect(briefing(workspace, { starter, blankFirstMoment: true })).toContain(playbook(BLANK_FIRST_MOMENT));
    expect(briefing(workspace, { starter, blankFirstMoment: true })).not.toContain('one page or many');
  });
});

describe('the asking line (ONL-2901)', () => {
  it('asks for an unmarked first pick and short headers, and says a dismissal ends the turn', () => {
    const asking = briefing(workspace, { harness: 'claude' });
    expect(asking).not.toContain('my pick');
    expect(asking).toContain('header of a word or two');
    expect(asking).toContain('your turn ends there');
    expect(asking).not.toContain('go with your first options');
  });
});
