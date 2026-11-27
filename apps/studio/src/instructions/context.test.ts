import { describe, expect, it } from 'bun:test';
import type { WelcomeProject } from '@studio/events';
import { studioToolDefinitions } from '../main/agent-host/studio-tools.js';
import { inertToolSinks } from '../main/agent-host/appserver/tools.js';
import { SERVER_RUNNING_TOOL_NAME } from '../main/agent-host/tool-names.js';
import { REACT_ADAPTER, REACT_MARKERS } from '../main/starter/adapters/react.js';
import { STATIC_ADAPTER } from '../main/starter/adapters/static.js';
import { STARTER_SERVER_FILE } from '../main/starter/scaffold.js';
import { briefing, sharedWriterNotice } from './context.js';
import { detectionContext, type DetectionBriefing } from './detection.js';
import { askMethod } from './harness.js';
import { renameInstruction } from './naming.js';
import { startPrompt } from './start.js';

const staticStarter = { paragraph: STATIC_ADAPTER.briefing(4712) };
const reactStarter = { paragraph: REACT_ADAPTER.briefing(4712) };

const workspace: WelcomeProject = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};

describe('canvas page creation (ONL-3092)', () => {
  for (const harness of ['claude', 'codex'] as const) {
    for (const context of [{ harness }, { harness, history: 'none' as const }]) {
      it(`keeps ${harness} on the current canvas page unless the user explicitly asks for a new one${context.history === 'none' ? ' without Git' : ''}`, () => {
        const text = briefing(workspace, context);
        expect(text).toContain('Keep new work on the current canvas page by default');
        expect(text).toContain('Use `create_page` only when the user explicitly asks for a new canvas page');
        expect(text).toContain('A new site route, design, or variant is not a request for a new canvas page');
        expect(text).not.toContain('rather than crowded onto what is already on screen');
      });
    }
  }
});

it('keeps history-free projects editable and asks for Git only after an explicit publishing or GitHub request', () => {
  for (const harness of ['claude', 'codex'] as const) {
    const text = briefing(workspace, { harness, history: 'none' });
    expect(text).toContain('Editing and the preview do not require Git');
    expect(text).toContain('unless the user asks to publish or connect GitHub');
    expect(text).toContain('Never install developer tools without their permission');
    expect(text).not.toContain('This is a git worktree');
    expect(text).not.toContain('on branch');
    expect(briefing(workspace, { harness })).toContain('This is a git worktree');
  }
});

describe('structured project file removal', () => {
  for (const harness of ['claude', 'codex'] as const) {
    it(`requires ${harness} to use the owned deletion tool rather than shell removal`, () => {
      const text = briefing(workspace, { harness });
      expect(text).toContain('For every project file removal, use `delete_project_file` with the file path, never Bash');
      expect(text).toContain('`rm`, or another shell command');
      expect(text).toContain('changed-files list');
      expect(text).toContain('Normal destructive permission approval still applies.');
    });
  }
});

describe('briefing() and the starter', () => {
  it("hands the agent the static starter's port, its server file and the tool that retires it", () => {
    const text = briefing(workspace, { starter: staticStarter });
    for (const fact of ['4712', STARTER_SERVER_FILE, SERVER_RUNNING_TOOL_NAME]) expect(text).toContain(fact);
  });

  it("hands the agent the react starter's port, its server file, the route paths its scaffold has, and the tool that retires it", () => {
    const text = briefing(workspace, { starter: reactStarter });
    for (const fact of ['4712', STARTER_SERVER_FILE, ...REACT_MARKERS, SERVER_RUNNING_TOOL_NAME]) {
      expect(text).toContain(fact);
    }
  });

  it('is nothing without a project, starter or not', () => {
    expect(briefing(undefined, { starter: reactStarter })).toBeUndefined();
  });
});

describe('the dev server outlives the chat it was started from (ONL-2556)', () => {
  // A new chat ends the session while the project stays open, so a server the harness holds open for it dies.
  it('asks for a server that survives this session, started outside the session’s own background tasks', () => {
    const text = briefing(workspace);
    expect(text).toContain('outlive this session');
    expect(text).toContain('never as a background task of this session');
  });

  it('does not ask for a server that dies with the session, which a new chat ends under an open project', () => {
    expect(briefing(workspace)).not.toContain('should end with it');
  });

  // The state a surviving server creates: the next chat did not start it, and both the Stop prompt
  // and a fresh start attempt would otherwise read it as somebody else's.
  it('tells the next chat the surviving server is still this project’s, to report and to stop', () => {
    const text = briefing(workspace);
    expect(text).toContain('may still be answering');
    expect(text).toContain(SERVER_RUNNING_TOOL_NAME);
    expect(text).toContain('run_project_setup for Stop and restart');
  });

  it('puts lifetime and output under Studio ownership rather than a session background task', () => {
    expect(briefing(workspace)).toContain('Onlook owns their lifetime, output and measured readiness');
    expect(briefing(workspace)).toContain('save_project_setup');
  });
});

describe('the tools the instructions name', () => {
  it('routes artifact requests to persistent Studio documents on both harnesses, not conversation-only skills', () => {
    for (const harness of ['claude', 'codex'] as const) {
      const text = briefing(workspace, {harness});
      expect(text).toContain('not an in-chat visualization');
      expect(text).toContain('existing tokens, styles and components');
      expect(text).toContain('create_artifact and place_artifact');
      expect(text).toContain('use list_frames to discover');
      expect(text).toContain('One artifact is one HTML document');
      expect(text).toContain('Multiple placements share edits');
      expect(text).toContain('set_artifact changes every place it appears');
      expect(text).toContain('project HTML and local images/fonts without approval, leaving the source unchanged');
    }
  });
  it('forks on demand: for asked-for, implied or uncertain variants, and edits in place for clear iteration', () => {
    for (const harness of ['claude', 'codex'] as const) {
      const text = briefing(workspace, {harness});
      expect(text).toContain('Fork first with fork_artifact, giving the copy its own title, then place the returned id beside the original');
      expect(text).toContain('when the request implies one');
      expect(text).toContain('or when you are unsure whether they want to keep the original');
      expect(text).toContain('Edit in place with set_artifact when they are clearly iterating on that same artifact');
      expect(text).toContain('Do not fork for every small edit');
    }
  });
  it('keeps project variants in project pages unless artifacts are requested, using one name on both harnesses', () => {
    for (const harness of ['claude', 'codex'] as const) {
      const text = briefing(workspace, {harness});
      expect(text).toContain('Create variants as pages in the project unless the designer asks to use an artifact');
      expect(text).toContain('shared space separate from the live app');
      expect(text).toContain('Call these objects artifacts in conversation and titles, not sketches');
      expect(text).toContain('Within an artifact workflow');
      expect(text).not.toContain('saved sketch');
      expect(text).not.toContain('same sketch');
    }
  });
  it('names only tools Studio registers, or a harness question tool', () => {
    const registered = new Set([
      ...studioToolDefinitions({ ...inertToolSinks(), onDeleteProjectFile: () => ({ ok: false, reason: 'inert' }) }).map((definition) => definition.name),
      ...(['claude', 'codex'] as const).flatMap((harness) => askMethod(harness).tool ?? []),
    ]);
    const found: Omit<DetectionBriefing, 'harness'> = {
      apps: [{ name: 'web', path: 'apps/web', port: 3000 }],
      busy: [{ port: 3000, path: 'apps/web' }],
      conflicts: [{ port: 4000 }],
    };
    const text = [
      ...(['claude', 'codex'] as const).flatMap((harness) =>
        (['design', 'experiment', 'ship'] as const).map((mode) =>
          briefing(workspace, { harness, mode, starter: reactStarter }),
        ),
      ),
      briefing(workspace, { starter: staticStarter, buildIntoFrame: true, quoteOnPlacedFrame: { liftsAtTurnEnd: true } }),
      startPrompt(),
      startPrompt(['apps/web']),
      renameInstruction(),
      detectionContext({ ...found, harness: 'claude' }),
      detectionContext({ ...found, harness: 'codex' }),
      detectionContext({ apps: [], busy: [], conflicts: [], harness: 'claude', monorepo: true }),
    ].join('\n');

    const named = new Set(text.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g));
    expect(named.size).toBeGreaterThan(0);
    expect([...named].filter((name) => !registered.has(name))).toEqual([]);
  });
});

describe('briefing() tells the agent it is not the only writer', () => {
  const standing = sharedWriterNotice(undefined);

  it('stands in every harness and mode', () => {
    for (const harness of ['claude', 'codex'] as const) {
      for (const mode of ['design', 'experiment', 'ship'] as const) {
        expect(briefing(workspace, { harness, mode, starter: reactStarter })).toContain(standing);
      }
    }
    expect(briefing(workspace)).toContain(standing);
  });

  it('names the stale-edit refusal to claude only', () => {
    const enforced = sharedWriterNotice('claude');
    expect(enforced).not.toBe(standing);
    expect(briefing(workspace, { harness: 'claude' })).toContain(enforced);
    expect(briefing(workspace, { harness: 'codex' })).not.toContain(enforced);
    expect(briefing(workspace)).not.toContain(enforced);
  });
});

describe('building a page into a frame already on the canvas (ONL-2960)', () => {
  const paragraph = (text: string | undefined): string =>
    text?.split('\n').find((line) => line.startsWith('Building a page into a frame')) ?? '';

  it('sizes the frame through move_frame first, then styles before markup, on both harnesses', () => {
    for (const harness of ['claude', 'codex'] as const) {
      const said = paragraph(briefing(workspace, { harness, starter: staticStarter, buildIntoFrame: true }));
      expect(said).toContain('`move_frame`');
      expect(said.indexOf('`move_frame`')).toBeLessThan(said.indexOf('styles'));
      expect(said.indexOf('styles')).toBeLessThan(said.indexOf('markup'));
    }
  });

  it('says the same order whether or not move_frame takes a quote, and quotes only when it does', () => {
    const plain = briefing(workspace, { buildIntoFrame: true }) ?? '';
    const quoting = briefing(workspace, { buildIntoFrame: true, quoteOnPlacedFrame: { liftsAtTurnEnd: true } }) ?? '';
    expect(paragraph(quoting)).toBe(paragraph(plain));
    expect(paragraph(plain)).not.toContain('quote');
    expect(plain).not.toContain('`move_frame` the page’s brief');
    expect(quoting).toContain('`move_frame` the page’s brief');
  });

  it('says nothing when the caller leaves it out', () => {
    expect(paragraph(briefing(workspace))).toBe('');
  });
});
