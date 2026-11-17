import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { frameLinkMarkdown, type WelcomeProject } from '@studio/events';
import { briefing, type StarterBriefing } from '../../instructions/context.js';
import { detectionContext, type BriefedApp } from '../../instructions/detection.js';
import { inspirationOpening } from '../../instructions/inspiration.js';
import { renameInstruction } from '../../instructions/naming.js';
import { startPrompt } from '../../instructions/start.js';
import { blankWelcomePrompt, blankWelcomeRow } from '../../renderer/src/chat/blankWelcome.js';
import { IDEA_PROMPT, ideaPrompt } from '../../renderer/src/canvas/ideas/ideas.js';
import { t } from '@studio/i18n';
import { STATIC_ADAPTER } from '../starter/adapters/static.js';
import { appServerToolSpecs, inertToolSinks } from './appserver/tools.js';
import { sessionBriefingContext } from './briefing-context.js';
import { joinNamingContext } from './naming-context.js';

const workspace: WelcomeProject = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};
const starter: StarterBriefing = { paragraph: STATIC_ADAPTER.briefing(4712) };
const web: BriefedApp = { name: 'web', path: 'apps/web', framework: 'next', frameworkPort: 3000 };
const docs: BriefedApp = { name: 'docs', path: 'apps/docs', framework: 'vite', port: 5174 };

const saved: Record<string, string | undefined> = {};
const FLAG_ENV = ['STUDIO_FLAGS', 'MAIN_VITE_FLAG_DEFAULTS'];
const MOMENTS = ['frame-covers', 'rail-foot', 'invite-tip', 'start-control', 'prompt-tip', 'blank-first-moment'];
beforeAll(() => {
  for (const key of FLAG_ENV) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env['STUDIO_FLAGS'] = MOMENTS.join(',');
});
afterAll(() => {
  for (const key of FLAG_ENV) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function system(withStarter: boolean): string {
  return briefing(workspace, { ...sessionBriefingContext('claude'), ...(withStarter ? { starter } : {}) }) ?? '';
}

function assembled(withStarter: boolean, text: string, context: string | undefined): string {
  return [
    '# System',
    system(withStarter),
    '# Turn',
    [text, context ?? ''].filter((part) => part !== '').join('\n\n'),
  ].join('\n\n');
}

function firstMessage(prompt: { text: string; context?: string }): string {
  return assembled(true, prompt.text, joinNamingContext(prompt.context, renameInstruction()));
}

describe('what a first-run Claude session is told, with every moment on', () => {
  it('on a blank project, after the welcome tap for screens', () => {
    const row = blankWelcomeRow('screens')!;
    expect(firstMessage(blankWelcomePrompt(row, t(row.prompt)))).toMatchSnapshot();
  });

  it('on a blank project, after the landing idea card tap', () => {
    expect(firstMessage(ideaPrompt('landing', t(IDEA_PROMPT.landing)))).toMatchSnapshot();
  });

  it('on a blank project, when Studio opens the inspiration frame', () => {
    const frameId = 'frame-1';
    const opening = inspirationOpening({
      link: frameLinkMarkdown({ repoIdentity: 'local:skylark', frameId }, 'Inspiration'),
      frameId,
      url: 'https://mobbin.com/explore/web',
    });
    expect(assembled(true, opening, undefined)).toMatchSnapshot();
  });

  it('on a blank project, after a typed first message', () => {
    expect(firstMessage({ text: 'Make a landing page for my bakery' })).toMatchSnapshot();
  });

  it('on an imported one-app monorepo, in its setup turn', () => {
    const context = detectionContext({ apps: [web], busy: [], conflicts: [], harness: 'claude', monorepo: true });
    expect(assembled(false, startPrompt([], { pendingFrame: true }), context)).toMatchSnapshot();
  });

  it('on an imported repository with two apps, in its setup turn', () => {
    const context = detectionContext({ apps: [web, docs], busy: [], conflicts: [], harness: 'claude' });
    expect(assembled(false, startPrompt([], { pendingFrame: true }), context)).toMatchSnapshot();
  });

  it('in every session, as its Studio tools', () => {
    const specs = appServerToolSpecs({ ...inertToolSinks(), onSaveAttachment: () => ({ ok: true }) });
    const text = specs
      .map((spec) => [`## ${spec.name}`, spec.description, JSON.stringify(spec.inputSchema, null, 2)].join('\n\n'))
      .join('\n\n');
    expect(text).toMatchSnapshot();
  });
});
