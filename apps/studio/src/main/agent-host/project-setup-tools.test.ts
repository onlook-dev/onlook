import { describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot } from '@studio/events';
import { appServerToolNames, appServerToolRunner, APPSERVER_APPROVAL_TOOLS, inertToolSinks } from './appserver/tools.js';
import { projectSetupTools, respectServerStop, type ProjectSetupToolSinks } from './project-setup-tools.js';
import { noteServerStart, noteServerStop, serverStopContext } from '../server/user-stop.js';
import { STUDIO_AUTO_APPROVED_TOOLS, STUDIO_MCP_SERVER } from './tool-names.js';

describe('shared project setup tools', () => {
  it('refuses agent recovery after a user Stop through both Harnesses until Start, including a replaced setup', async () => {
    const cwd = '/tmp/onl-2827-stopped-project';
    let snapshot: ProjectSetupSnapshot = { saved: null, verified: null, failure: null, state: 'idle' };
    const actions: string[] = [];
    const sinks = respectServerStop(cwd, {
      read: () => snapshot,
      save: () => ({ ok: true, snapshot }),
      run: async (action) => { actions.push(action.action); return { ok: true, snapshot }; },
    });
    const codex = appServerToolRunner({ ...inertToolSinks(), projectSetup: sinks });
    const claude = projectSetupTools(sinks).find((tool) => tool.name === 'run_project_setup')!;
    noteServerStop(cwd);
    try {
      expect((await codex('run_project_setup', { action: 'start' })).success).toBe(false);
      snapshot = { ...snapshot, saved: { revision: 'new', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: 'apps/web', start: 'bun run dev', port: 3000 }] } } };
      expect((await claude.handler({ action: 'restart' } as never, {} as never)).isError).toBe(true);
      expect((await sinks.run({ action: 'restart', serverIds: ['old-web'] })).ok).toBe(false);
      expect((await sinks.run({ action: 'restart', serverIds: ['web', 'old-web'] })).ok).toBe(false);
      expect(actions).toEqual([]);
      expect(serverStopContext(cwd, 'Keep editing')).toContain('intentional, not a crash');
      expect((await sinks.run({ action: 'stop' })).ok).toBe(true);
      noteServerStart(cwd);
      expect((await codex('run_project_setup', { action: 'start' })).success).toBe(true);
      expect(actions).toEqual(['stop', 'start']);
      expect(serverStopContext(cwd, 'Keep editing')).toBe('Keep editing');
    } finally { noteServerStart(cwd); }
  });

  it('keeps an equivalent server on its stopped port blocked after moving its saved command', async () => {
    const cwd = '/tmp/onl-2827-moved-command';
    const snapshot: ProjectSetupSnapshot = { saved: { revision: 'moved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [
      { id: 'frontend', cwd: '.', start: 'cd web && bun dev', port: 3000 },
      { id: 'api', cwd: 'api', start: 'bun dev', port: 3001 },
    ] } }, verified: null, failure: null, state: 'idle' };
    const actions: string[] = [];
    const sinks = respectServerStop(cwd, { read: () => snapshot, save: () => ({ ok: true, snapshot }), run: async (action) => { actions.push(action.action); return { ok: true, snapshot }; } });
    const codex = appServerToolRunner({ ...inertToolSinks(), projectSetup: sinks });
    const claude = projectSetupTools(sinks).find((tool) => tool.name === 'run_project_setup')!;
    noteServerStop(cwd, [`${cwd}/web`], [3000]);
    try {
      expect((await codex('run_project_setup', { action: 'start', serverIds: ['frontend'] })).success).toBe(false);
      expect((await claude.handler({ action: 'restart', serverIds: ['frontend'] } as never, {} as never)).isError).toBe(true);
      expect(actions).toEqual([]);
      expect((await sinks.run({ action: 'start', serverIds: ['api'] })).ok).toBe(true);
      noteServerStart(cwd, [`${cwd}/web`], [3000]);
      expect((await sinks.run({ action: 'start', serverIds: ['frontend'] })).ok).toBe(true);
    } finally { noteServerStart(cwd); }
  });

  it('requires both restarted folder and port after Stop all before allowing agent recovery', async () => {
    const cwd = '/tmp/onl-2827-stop-all-partial-start';
    const snapshot: ProjectSetupSnapshot = { saved: { revision: 'moved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [
      { id: 'started', cwd: 'a', start: 'bun dev', port: 3000 },
      { id: 'moved-folder', cwd: 'a', start: 'cd ../b && bun dev', port: 3001 },
    ] } }, verified: null, failure: null, state: 'idle' };
    const calls: string[] = [];
    const sinks = respectServerStop(cwd, { read: () => snapshot, save: () => ({ ok: true, snapshot }), run: async (action) => { calls.push(...action.serverIds ?? []); return { ok: true, snapshot }; } });
    const codex = appServerToolRunner({ ...inertToolSinks(), projectSetup: sinks });
    const claude = projectSetupTools(sinks).find((tool) => tool.name === 'run_project_setup')!;
    noteServerStop(cwd);
    noteServerStart(cwd, [`${cwd}/a`], [3000]);
    try {
      expect((await codex('run_project_setup', { action: 'start', serverIds: ['moved-folder'] })).success).toBe(false);
      snapshot.saved!.definition.servers = [
        { id: 'started', cwd: 'a', start: 'bun dev', port: 3002 },
        { id: 'moved-port', cwd: 'b', start: 'bun dev', port: 3000 },
      ];
      expect((await claude.handler({ action: 'restart', serverIds: ['moved-port'] } as never, {} as never)).isError).toBe(true);
      expect(calls).toEqual([]);
      snapshot.saved!.definition.servers = [{ id: 'started', cwd: 'a', start: 'bun dev', port: 3000 }];
      expect((await sinks.run({ action: 'start', serverIds: ['started'] })).ok).toBe(true);
      expect(calls).toEqual(['started']);
    } finally { noteServerStart(cwd); }
  });

  it('keeps Stop and Start scoped to the selected folder and Project', async () => {
    const cwd = '/tmp/onl-2827-scoped-project';
    const snapshot: ProjectSetupSnapshot = { saved: { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [
      { id: 'web', cwd: 'web', start: 'bun dev', port: 3000 },
      { id: 'api', cwd: 'api', start: 'bun dev', port: 3001 },
    ] } }, verified: null, failure: null, state: 'idle' };
    const sinks = respectServerStop(cwd, { read: () => snapshot, save: () => ({ ok: true, snapshot }), run: async () => ({ ok: true, snapshot }) });
    noteServerStop(cwd, [`${cwd}/web`]);
    try {
      expect((await sinks.run({ action: 'start', serverIds: ['web'] })).ok).toBe(false);
      expect((await sinks.run({ action: 'start', serverIds: ['api'] })).ok).toBe(true);
      expect((await sinks.run({ action: 'restart' })).ok).toBe(false);
      expect(serverStopContext(`${cwd}-other`)).toBeUndefined();
      noteServerStart(cwd, [`${cwd}/api`]);
      expect((await sinks.run({ action: 'start', serverIds: ['web'] })).ok).toBe(false);
      noteServerStop(cwd);
      noteServerStart(cwd, [`${cwd}/web`], [3000]);
      expect((await sinks.run({ action: 'start', serverIds: ['web'] })).ok).toBe(true);
      expect((await sinks.run({ action: 'start', serverIds: ['api'] })).ok).toBe(false);
    } finally { noteServerStart(cwd); }
  });

  it('offers the same project-bound read/save/run through both Harnesses and retains approval policy', async () => {
    const snapshot: ProjectSetupSnapshot = { saved: null, verified: null, failure: null, state: 'idle' };
    const calls: string[] = [];
    const sinks: ProjectSetupToolSinks = {
      read: () => { calls.push('read'); return snapshot; },
      save: (_definition, expectedRevision) => { calls.push(`save:${String(expectedRevision)}`); return { ok: true, snapshot }; },
      run: async (action) => { calls.push(`run:${action.action}`); return { ok: true, snapshot }; },
    };
    const definitions = projectSetupTools(sinks);
    const names = ['get_project_setup', 'save_project_setup', 'run_project_setup'];
    expect(definitions.map((definition) => definition.name)).toEqual(names);
    const all = { ...inertToolSinks(), projectSetup: sinks };
    expect(appServerToolNames(all)).toEqual(expect.arrayContaining(names));
    for (const name of names) {
      expect(STUDIO_AUTO_APPROVED_TOOLS.includes(`mcp__${STUDIO_MCP_SERVER}__${name}`)).toBe(name === 'get_project_setup');
      expect(APPSERVER_APPROVAL_TOOLS.includes(name)).toBe(name !== 'get_project_setup');
    }
    expect(STUDIO_AUTO_APPROVED_TOOLS[0]).toBe(`mcp__${STUDIO_MCP_SERVER}__get_project_setup`);
    expect(APPSERVER_APPROVAL_TOOLS.slice(0, 2)).toEqual(['save_project_setup', 'run_project_setup']);
    const run = appServerToolRunner(all);
    expect((await run('get_project_setup', {})).success).toBe(true);
    expect((await run('save_project_setup', { expectedRevision: null, definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] } })).success).toBe(true);
    expect((await run('run_project_setup', { action: 'start' })).success).toBe(true);
    expect(calls).toEqual(['read', 'save:null', 'run:start']);
    expect((await run('run_project_setup', { action: 'erase', cwd: '/elsewhere' })).success).toBe(false);
    expect((await run('run_project_setup', { action: 'start', cwd: '/elsewhere' })).success).toBe(false);
    expect((await run('run_project_setup', { action: 'start', serverIds: [1] })).success).toBe(false);
    expect((await run('save_project_setup', { expectedRevision: null, definition: { env: { TOKEN: 'secret' } } })).success).toBe(false);
    expect(calls).toHaveLength(3);
  });
});
