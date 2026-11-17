import { afterEach, describe, expect, it } from 'bun:test';
import type { WelcomeProject } from '@studio/events';
import { briefing } from '../../instructions/context.js';
import { setLocale } from '@studio/i18n';
import { sessionBriefingContext } from './briefing-context.js';

const workspace: WelcomeProject = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};

describe('the interface language reaches the agent (ONL-3139)', () => {
  afterEach(() => setLocale(undefined));

  it('tells both harnesses the interface is in Japanese, and that a language the person set wins', () => {
    setLocale('ja');
    for (const harness of ['claude', 'codex'] as const) {
      const text = briefing(workspace, sessionBriefingContext(harness)) ?? '';
      expect(text).toContain("Onlook's interface is in Japanese");
      expect(text).toContain('it wins over this paragraph');
    }
  });

  it('sends English, pseudo and an unchosen language the same briefing, with no language paragraph', () => {
    const unchosen = briefing(workspace, sessionBriefingContext('claude'));
    for (const locale of ['en', 'pseudo'] as const) {
      setLocale(locale);
      expect(briefing(workspace, sessionBriefingContext('claude'))).toBe(unchosen);
    }
    expect(unchosen).not.toContain("Onlook's interface is in");
  });
});
