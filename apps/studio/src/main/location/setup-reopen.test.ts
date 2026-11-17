import { describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot } from '@studio/events';
import { restartProjectOnOpen, type SetupReopenDeps } from './setup-reopen.js';

function fixture(saved = true) {
  const calls: string[] = [];
  const snapshot: ProjectSetupSnapshot = {
    saved: saved ? { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] } } : null,
    verified: null, state: 'idle', failure: null,
  };
  const deps: SetupReopenDeps = {
    registered: (cwd) => cwd === '/project-a' || cwd === '/project-b',
    stillOpen: () => true,
    isStarterProject: () => false,
    setup: () => ({
      read: (cwd) => { calls.push(`read:${cwd}`); return snapshot; },
      run: async (cwd, action) => { calls.push(`${action.action}:${cwd}`); return { ok: true, snapshot }; },
    }),
    restartStarter: async (cwd) => { calls.push(`starter:${cwd}`); },
  };
  return { deps, calls, snapshot };
}

describe('project reopen startup', () => {
  it('does not start saved setup or a starter when a queued reopen runs after the last Tab closes', async () => {
    for (const saved of [true, false]) {
      const { deps, calls } = fixture(saved);
      let stillOpen = true;
      deps.stillOpen = () => stillOpen;
      deps.isStarterProject = () => true;
      const queued = Promise.resolve().then(() => restartProjectOnOpen('/project-a', deps));
      stillOpen = false;
      expect(await queued).toBe('unknown');
      expect(calls).toEqual([]);
    }
  });

  it('auto-starts saved setup for the opened project without agent discovery or proof interception', async () => {
    const { deps, calls } = fixture();
    expect(await restartProjectOnOpen('/project-b', deps)).toBe('saved');
    expect(calls).toEqual(['read:/project-b', 'start:/project-b']);
  });

  it('leaves unknown setup on the normal project-open flow without guessed commands', async () => {
    const { deps, calls } = fixture(false);
    expect(await restartProjectOnOpen('/project-a', deps)).toBe('unknown');
    expect(calls).toEqual(['read:/project-a']);
  });

  it('preserves blank starter startup when the initialized setup service has no saved definition', async () => {
    const { deps, calls } = fixture(false);
    deps.isStarterProject = () => true;
    expect(await restartProjectOnOpen('/project-a', deps)).toBe('starter');
    expect(calls).toEqual(['read:/project-a', 'starter:/project-a']);
  });

  it('prefers agent-authored saved setup for a blank project without spawning its existing starter', async () => {
    const { deps, calls } = fixture();
    deps.isStarterProject = () => true;
    expect(await restartProjectOnOpen('/project-a', deps)).toBe('saved');
    expect(calls).toEqual(['read:/project-a', 'start:/project-a']);
  });

  it('rejects unregistered projects before reading setup or restarting a starter', async () => {
    const { deps, calls } = fixture();
    expect(await restartProjectOnOpen('/unregistered', deps)).toBe('unknown');
    expect(calls).toEqual([]);
  });

  it('uses saved setup after a blank project has retired its starter', async () => {
    const { deps, calls } = fixture();
    deps.isStarterProject = () => false;
    expect(await restartProjectOnOpen('/project-a', deps)).toBe('saved');
    expect(calls).toEqual(['read:/project-a', 'start:/project-a']);
  });

  it('keeps failed saved startup in the runtime snapshot without invoking an agent repair turn', async () => {
    const { deps, calls, snapshot } = fixture();
    snapshot.state = 'failed';
    snapshot.failure = { revision: 'saved', stage: 'install', command: 'npm ci', reason: 'install failed', outputTail: '', elapsedMs: 1 };
    deps.setup = () => ({ read: () => snapshot, run: async (cwd) => { calls.push(`start:${cwd}`); return { ok: false, snapshot, reason: 'install failed' }; } });
    expect(await restartProjectOnOpen('/project-a', deps)).toBe('saved');
    expect(snapshot.state).toBe('failed');
    expect(calls).toEqual(['start:/project-a']);
  });
});
