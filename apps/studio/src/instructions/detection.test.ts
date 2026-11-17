import { describe, expect, it } from 'bun:test';
import { defaultStart, detectionAsks, detectionContext, type DetectionBriefing } from './detection.js';

const apps = [
  { name: 'web', path: 'apps/web', framework: 'Next.js', port: 3000 },
  { name: 'admin', path: 'apps/admin', framework: 'Vite', port: 4000 },
];

function briefing(overrides: Partial<DetectionBriefing> = {}): DetectionBriefing {
  return { apps, busy: [], conflicts: [], harness: 'claude', ...overrides };
}

const lines = (text: string | undefined): string[] => (text ?? '').split('\n');

describe('detectionAsks', () => {
  it('asks the app question for two apps with nothing remembered, and the port question for a busy port', () => {
    expect(detectionAsks(briefing())).toEqual(['app']);
    expect(detectionAsks(briefing({ remembered: 'apps/web' }))).toEqual([]);
    expect(detectionAsks(briefing({ apps: [apps[0]!] }))).toEqual([]);
    expect(detectionAsks(briefing({ busy: [{ port: 3000, path: 'apps/web' }] }))).toEqual(['app', 'port']);
    expect(detectionAsks(briefing({ apps: [apps[0]!], busy: [{ port: 3000, path: 'apps/web' }] }))).toEqual(['port']);
  });

  it('asks nothing on codex, whatever was found', () => {
    expect(detectionAsks(briefing({ harness: 'codex', busy: [{ port: 3000, path: 'apps/web' }] }))).toEqual([]);
  });

  it('asks nothing about a port something else holds', () => {
    expect(detectionAsks(briefing({ apps: [apps[0]!], conflicts: [{ port: 3000 }] }))).toEqual([]);
  });
});

describe('detectionContext on Claude', () => {
  it('hands the agent every app with its name, path, framework and port, and names AskUserQuestion when it should ask', () => {
    const text = detectionContext(briefing());
    for (const app of apps) {
      const facts = [app.name, app.path, app.framework, String(app.port)];
      expect(lines(text).some((line) => facts.every((fact) => line.includes(fact)))).toBe(true);
    }
    expect(text).toContain('AskUserQuestion');
  });

  it('a remembered or a single app is started without a question, and the remembered choice reaches the agent', () => {
    const unremembered = detectionContext(briefing());
    const remembered = detectionContext(briefing({ remembered: 'apps/admin' })) ?? '';
    expect(remembered).not.toContain('AskUserQuestion');
    const added = lines(remembered).filter((line) => !lines(unremembered).includes(line));
    expect(added.some((line) => line.includes('apps/admin'))).toBe(true);
    expect(detectionContext(briefing({ apps: [apps[0]!] }))).not.toContain('AskUserQuestion');
  });

  it('speaks when only a conflict was found', () => {
    expect(detectionContext(briefing({ apps: [], conflicts: [{ port: 3000 }] }))).toBeDefined();
  });
});

describe('an unusual start is proposed before it runs (ONL-2960)', () => {
  const studio = { name: 'studio', path: 'apps/studio', framework: 'Vite', electron: true as const, frameworkPort: 5173 };
  const proposing = (overrides: Partial<DetectionBriefing> = {}): DetectionBriefing =>
    briefing({ apps: [apps[0]!], ...overrides });

  it('asks for a plan in a monorepo with one dev package, for an Electron app, and where no package has a dev script', () => {
    expect(detectionAsks(proposing({ monorepo: true }))).toEqual(['plan']);
    expect(detectionAsks(proposing({ apps: [studio] }))).toEqual(['plan']);
    expect(detectionAsks(proposing({ apps: [] }))).toEqual(['plan']);
    expect(detectionAsks(proposing())).toEqual([]);
  });

  it('keeps the app question for several apps, and asks nothing once the user has chosen before', () => {
    expect(detectionAsks(proposing({ apps, monorepo: true }))).toEqual(['app']);
    expect(detectionAsks(proposing({ monorepo: true, remembered: 'apps/web' }))).toEqual([]);
  });

  it('asks nothing new on codex', () => {
    expect(detectionAsks(proposing({ monorepo: true, harness: 'codex' }))).toEqual([]);
  });

  it('tells the agent what makes the start unusual and to propose with AskUserQuestion before starting', () => {
    const text = detectionContext(proposing({ apps: [studio], monorepo: true })) ?? '';
    expect(lines(text).some((line) => line.includes('apps/studio') && line.includes('Electron'))).toBe(true);
    expect(text).toContain('monorepo');
    expect(text).toContain('AskUserQuestion');
    expect(text).toContain('get_project_setup');
    expect(detectionContext(proposing({ apps: [] }))).toContain('AskUserQuestion');
  });
});

describe('the default start on codex, which starts without asking', () => {
  it('starts the remembered app, else the first, and names no question tool', () => {
    expect(defaultStart(briefing({ harness: 'codex' }))).toEqual({ kind: 'start', path: 'apps/web' });
    expect(defaultStart(briefing({ harness: 'codex', remembered: 'apps/admin' }))).toEqual({
      kind: 'start',
      path: 'apps/admin',
    });
    const text = detectionContext(briefing({ harness: 'codex' }));
    expect(text).not.toContain('AskUserQuestion');
    expect(text).not.toContain('request_user_input');
  });

  it('leaves a busy port running and starts its own copy (ONL-2310)', () => {
    expect(
      defaultStart(briefing({ harness: 'codex', apps: [apps[0]!], busy: [{ port: 3000, path: 'apps/web' }] })),
    ).toEqual({ kind: 'copy', port: 3000, path: 'apps/web' });
  });

  it('with no app found, leaves the agent to work it out from the code', () => {
    expect(defaultStart(briefing({ harness: 'codex', apps: [], conflicts: [{ port: 3000 }] }))).toEqual({
      kind: 'work-out',
    });
  });
});
