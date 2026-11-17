import { describe, expect, it } from 'bun:test';
import { isRepairAskInPersonsWords, opensSetupSteps, type ProjectSetupAskResult, type ProjectSetupFailure, type ProjectSetupSnapshot } from '@studio/events';
import { t } from '@studio/i18n';
import { startPrompt } from '../../instructions/start.js';
import { createProjectSetupAsk } from './ask.js';
import { createProjectSetupHandlers } from './index.js';

const snapshot = (): ProjectSetupSnapshot => ({
  saved: { revision: 'saved-revision', definition: { prepare: 'test -f package.json', install: { script: 'npm ci', inputs: ['package-lock.json'], outputs: ['node_modules'] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] } },
  verified: null,
  state: 'failed',
  failure: { revision: 'saved-revision', stage: 'install', command: 'npm ci', reason: 'Setup command failed', exitCode: 17, outputTail: 'real install failure', elapsedMs: 12 },
});

describe('project setup IPC project binding', () => {
  it('binds reads and agent requests to their sending Tab across two projects', async () => {
    const first = snapshot();
    const second: ProjectSetupSnapshot = { saved: null, verified: null, state: 'idle', failure: null };
    const projects = new Map([['/project-a', first], ['/project-b', second]]);
    const asked: string[] = [];
    const handlers = createProjectSetupHandlers({
      workspaceOf: (senderId) => new Map([[11, '/project-a'], [22, '/project-b']]).get(senderId),
      registered: (cwd) => projects.has(cwd),
      read: (cwd) => projects.get(cwd)!,
      ask: async (cwd) => { asked.push(cwd); return { ok: true }; },
      noProject: () => 'Choose a registered project first',
    });
    expect(handlers.read(11)).toBe(first);
    expect(handlers.read(22)).toBe(second);
    expect(await handlers.ask(22)).toEqual({ ok: true });
    expect(await handlers.ask(11)).toEqual({ ok: true });
    expect(asked).toEqual(['/project-b', '/project-a']);
  });

  it('rejects unmapped and unregistered senders without touching the service', async () => {
    const calls: string[] = [];
    const handlers = createProjectSetupHandlers({
      workspaceOf: (senderId) => senderId === 22 ? '/unregistered' : undefined,
      registered: () => false,
      read: (cwd) => { calls.push(cwd); return snapshot(); },
      ask: async (cwd) => { calls.push(cwd); return { ok: true }; },
      noProject: () => 'localized missing project',
    });
    for (const senderId of [11, 22]) {
      expect(() => handlers.read(senderId)).toThrow('localized missing project');
      expect(await handlers.ask(senderId)).toEqual({ ok: false, reason: 'no-project' });
    }
    expect(calls).toEqual([]);
  });
});

describe('explicit setup requests to the agent', () => {
  it('preserves delivery results and notifies once when analytics throws', async () => {
    for (const sent of [true, false]) {
      let deliveries = 0;
      let notifications = 0;
      const ask = createProjectSetupAsk({ read: snapshot,
        busy: () => false,
        detect: async () => undefined,
        deliver: async () => { deliveries += 1; return sent; },
        completed: () => { notifications += 1; throw new Error('analytics unavailable'); },
      });
      expect(await ask('.')).toEqual(sent ? { ok: true } : { ok: false, reason: 'unavailable' });
      expect(deliveries).toBe(1);
      expect(notifications).toBe(1);
    }
  });


  it('sends the person’s own words for the step that failed, with the instruction and the failure hidden in the context (ONL-2961)', async () => {
    const asked = async (stage: ProjectSetupFailure['stage']) => {
      const current = snapshot();
      current.failure = { ...current.failure!, stage };
      let delivered: { prompt: string; context?: string } | undefined;
      const ask = createProjectSetupAsk({ read: () => current, busy: () => false, detect: async () => undefined, deliver: async (_cwd, prompt, context) => { delivered = { prompt, context }; return true; } });
      expect(await ask('.')).toEqual({ ok: true });
      return { ...delivered!, current };
    };
    for (const stage of ['prepare', 'install'] as const) expect((await asked(stage)).prompt).toBe(t('projectSetup.ask.install'));
    for (const stage of ['start', 'ready', 'stop'] as const) expect((await asked(stage)).prompt).toBe(t('projectSetup.ask.start'));
    const { prompt, context, current } = await asked('install');
    const row = { text: prompt, ...(context === undefined ? {} : { context }) };
    expect(isRepairAskInPersonsWords(row)).toBe(true);
    expect(opensSetupSteps(row)).toBe(false);
    const [framing, facts] = context!.split('\n\n');
    expect(framing).toContain('get_project_setup');
    expect(JSON.parse(facts!)).toEqual(current);
  });

  it('asks a project with no script for the setup the first start asks for, with no failure to carry', async () => {
    const deliveries: { prompt: string; context?: string }[] = [];
    const kinds: (string | null)[] = [];
    const ask = createProjectSetupAsk({ read: () => ({ saved: null, verified: null, state: 'idle', failure: null }),
      busy: () => false,
      detect: async () => 'Detected apps: web on 3000. Port 4000 already answers.',
      deliver: async (_cwd, prompt, context) => { deliveries.push({ prompt, context }); return true; },
      completed: (_cwd, _result, kind) => { kinds.push(kind); },
    });
    expect(await ask('.')).toEqual({ ok: true });
    expect(deliveries[0]?.prompt).toBe(startPrompt());
    expect(deliveries[0]?.context).toBe('Detected apps: web on 3000. Port 4000 already answers.');
    expect(kinds).toEqual(['setup']);
  });

  it('returns typed busy/unavailable/not-applicable results and prevents duplicate delivery', async () => {
    let resolve: (value: boolean) => void = () => undefined;
    const pending = new Promise<boolean>((done) => { resolve = done; });
    const outcomes: ProjectSetupAskResult[] = [];
    const completed = (_cwd: string, result: ProjectSetupAskResult) => { outcomes.push(result); };
    const ask = createProjectSetupAsk({ read: snapshot, busy: () => false, detect: async () => undefined, deliver: () => pending, completed });
    const first = ask('.');
    expect(await ask('.')).toEqual({ ok: false, reason: 'busy' });
    resolve(false);
    expect(await first).toEqual({ ok: false, reason: 'unavailable' });
    const working = createProjectSetupAsk({ read: () => ({ ...snapshot(), state: 'running', failure: null }), busy: () => false, detect: async () => undefined, deliver: async () => { throw new Error('not reached'); }, completed });
    expect(await working('.')).toEqual({ ok: false, reason: 'not-applicable' });
    const rejected = createProjectSetupAsk({ read: snapshot, busy: () => false, detect: async () => undefined, deliver: async () => { throw new Error('private delivery error'); }, completed });
    expect(await rejected('.')).toEqual({ ok: false, reason: 'unavailable' });
    expect(outcomes).toEqual([{ ok: false, reason: 'busy' }, { ok: false, reason: 'unavailable' }, { ok: false, reason: 'not-applicable' }, { ok: false, reason: 'unavailable' }]);
  });

  it('records which request a busy agent refused', async () => {
    const kinds: (string | null)[] = [];
    const ask = createProjectSetupAsk({ read: () => ({ saved: null, verified: null, state: 'idle', failure: null }),
      busy: () => true,
      detect: async () => undefined,
      deliver: async () => { throw new Error('not reached'); },
      completed: (_cwd, _result, kind) => { kinds.push(kind); },
    });
    expect(await ask('.')).toEqual({ ok: false, reason: 'busy' });
    expect(kinds).toEqual(['setup']);
  });
});
