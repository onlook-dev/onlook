import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { BlankCreateStage, WorkspaceCreated } from '@studio/events';
import {
  bucketsIn,
  cleanupTempFixtures,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { resetServerBookCache } from '../server/book.js';
import type { InstallPlan, RunResult } from '../install/index.js';
import { STATIC_ADAPTER, STATIC_FILES } from '../starter/adapters/static.js';
import type { StarterAdapter } from '../starter/adapter.js';
import { StarterFailure } from '../starter/failure.js';
import { createCancelToken } from './cancel.js';
import { createBlankProject, type BlankCreateDeps } from './create-blank.js';
import { knownProject, listWorkspaces, resetWorkspaceCache } from './store.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `create-blank-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetServerBookCache();
  return root;
}


interface Recorder {
  deps: BlankCreateDeps;
  calls: string[];
  stages: BlankCreateStage[];
  captured: { event: string; properties: Record<string, unknown> }[];
  announced: WorkspaceCreated[];
}

function makeRecorder(overrides: Partial<BlankCreateDeps> = {}): Recorder {
  const calls: string[] = [];
  const stages: BlankCreateStage[] = [];
  const captured: Recorder['captured'] = [];
  const announced: WorkspaceCreated[] = [];
  const deps: BlankCreateDeps = {
    now: () => 0,
    starter: {
      spawn: async () => {
        calls.push('spawn');
        return 4310;
      },
      stop: async () => {
        calls.push('stop');
      },
    },
    server: {
      openProject: async () => {
        calls.push('book.open');
      },
      report: async (_worktree, _folder, port, workspaceTelemetry) => {
        expect(workspaceTelemetry).toEqual({
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        });
        calls.push(`report:${String(port)}`);
      },
      awaitRunning: async () => {
        calls.push('running');
        return 'running';
      },
    },
    canvas: {
      open: async () => {
        calls.push('canvas.open');
      },
    },
    emitStage: (stage) => {
      calls.push(`stage:${stage}`);
      stages.push(stage);
    },
    // Pinned: the real choice depends on this machine's PATH.
    adapter: async () => ({ adapter: STATIC_ADAPTER }),
    capture: (event, properties) => {
      calls.push(`capture:${event}`);
      captured.push({ event, properties: properties as Record<string, unknown> });
    },
    announce: (workspace) => {
      calls.push('announce');
      announced.push(workspace);
    },
    ...overrides,
  };
  return { deps, calls, stages, captured, announced };
}

function expectNoPathIn(root: string, recorder: Recorder): void {
  for (const { properties } of recorder.captured) {
    expect(JSON.stringify(properties)).not.toContain(root);
  }
}

describe('the full sequence, offline and keyless', () => {
  it('does not diagnose a canceled create as a machine failure', async () => {
    useOwnWorkspaceRoot('canceled-machine-diagnosis');
    let diagnoses = 0;
    const token = createCancelToken();
    token.cancel();
    const recorder = makeRecorder({ diagnoseFailure: async () => { diagnoses += 1; return 'must not run'; } });
    expect(await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token)).toMatchObject({ ok: false, canceled: true });
    expect(diagnoses).toBe(0);
  });
  it('uses the same machine diagnosis after a later failed create', async () => {
    useOwnWorkspaceRoot('machine-diagnosis');
    const recorder = makeRecorder({
      adapter: async () => { throw new Error('raw machine failure'); },
      diagnoseFailure: async () => 'what the machine checks say',
    });
    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);
    expect(result).toMatchObject({ ok: false, canceled: false, explanation: 'what the machine checks say', detail: 'Error: raw machine failure' });
  });
  // What `appDeps` hands it with `machine-check` off: no diagnosis to run, so the answer is main's (ONL-3111).
  it('explains nothing, and still cancels, with no diagnosis wired at all', async () => {
    useOwnWorkspaceRoot('no-machine-diagnosis');
    const failing = { adapter: async (): Promise<never> => { throw new Error('raw machine failure'); } };
    const failed = await createBlankProject({ entryPoint: 'projects' }, makeRecorder(failing).deps);
    expect(failed).toEqual({ ok: false, stage: 'setting-up', canceled: false, detail: 'Error: raw machine failure' });

    const token = createCancelToken();
    token.cancel();
    const canceled = await createBlankProject({ entryPoint: 'projects' }, makeRecorder(failing).deps, token);
    expect(canceled).toMatchObject({ ok: false, canceled: true });
    expect(canceled).not.toHaveProperty('explanation');
  });
  it('keeps a real failure a failure when a cancel lands while it is being diagnosed', async () => {
    useOwnWorkspaceRoot('cancel-during-diagnosis');
    const token = createCancelToken();
    const recorder = makeRecorder({
      adapter: async () => { throw new Error('raw machine failure'); },
      diagnoseFailure: async () => { token.cancel(); return 'what the machine checks say'; },
    });
    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);
    expect(result).toMatchObject({ ok: false, canceled: false, explanation: 'what the machine checks say' });
  });
  it('records a blank creation start before setup and correlates it with completion', async () => {
    const root = useOwnWorkspaceRoot('telemetry-start');
    const recorder = makeRecorder();
    recorder.deps.adapter = async () => {
      expect(recorder.captured).toEqual([{
        event: 'project_creation_started',
        properties: {
          creation_id: expect.any(String),
          source: 'blank',
          entry_point: 'projects',
        },
      }]);
      return { adapter: STATIC_ADAPTER };
    };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result.ok).toBe(true);
    expect(recorder.captured.map(({ event }) => event)).toEqual(['project_creation_started', 'project_created']);
    expect(recorder.captured[1]?.properties).toMatchObject({
      creation_id: recorder.captured[0]?.properties['creation_id'],
      duration_ms: expect.any(Number),
    });
    expectNoPathIn(root, recorder);
  });

  it('spawns, opens, reports, awaits running, then registers and announces with an empty canvas', async () => {
    const root = useOwnWorkspaceRoot('happy');
    const recorder = makeRecorder();

    const result = await createBlankProject({ entryPoint: 'onboarding' }, recorder.deps);

    if (!result.ok) throw new Error(`stage ${result.stage}: ${result.detail ?? ''}`);
    expect(recorder.calls).toEqual([
      'capture:project_creation_started',
      'stage:setting-up',
      'stage:starting',
      'spawn',
      'canvas.open',
      'book.open',
      'report:4310',
      'running',
      'capture:project_created',
      'announce',
    ]);
    const { workspace } = result;
    expect(workspace.origin).toBe('blank');
    expect(knownProject(workspace.workspacePath)?.origin).toBe('blank');
    expect(listWorkspaces().map((w) => w.name)).toEqual([workspace.sourceRepoName]);
    expect(recorder.announced).toEqual([workspace]);
    expect(existsSync(workspace.workspacePath)).toBe(true);
    expect(readdirSync(workspace.workspacePath + '/..')).not.toContain('creating');

    expect(recorder.captured.map((c) => c.event)).toEqual(['project_creation_started', 'project_created']);
    expect(recorder.captured[1]?.properties).toEqual({
      creation_id: recorder.captured[0]?.properties['creation_id'],
      duration_ms: 0,
      project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      source: 'blank',
      entry_point: 'onboarding',
    });
    expectNoPathIn(root, recorder);
  });
});

describe('blank creation wait telemetry', () => {
  it('includes setup, install and the running wait in the duration, without counting a pending starter as created', async () => {
    const root = useOwnWorkspaceRoot('telemetry-wait');
    let time = 100;
    const waiting = Promise.withResolvers<void>();
    const running = Promise.withResolvers<'running'>();
    const recorder = makeRecorder({
      now: () => time,
      adapter: async () => {
        time = 200;
        return { adapter: INSTALLING_ADAPTER, manager: { name: 'bun' } };
      },
      install: async () => {
        expect(recorder.captured.map(({ event }) => event)).toEqual(['project_creation_started']);
        time = 1100;
        return { ok: true, err: '', timedOut: false };
      },
    });
    recorder.deps.server.awaitRunning = () => {
      waiting.resolve();
      return running.promise;
    };
    const creating = createBlankProject({ entryPoint: 'onboarding' }, recorder.deps);
    await waiting.promise;
    expect(recorder.captured.map(({ event }) => event)).toEqual(['project_creation_started']);
    expect(recorder.announced).toEqual([]);
    time = 1650;
    running.resolve('running');
    const result = await creating;

    expect(result.ok).toBe(true);
    expect(recorder.captured).toEqual([
      { event: 'project_creation_started', properties: {
        creation_id: expect.stringMatching(/^[0-9a-f-]{36}$/), source: 'blank', entry_point: 'onboarding',
      } },
      { event: 'project_created', properties: {
        creation_id: recorder.captured[0]?.properties['creation_id'], source: 'blank', entry_point: 'onboarding',
        project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        duration_ms: 1550,
      } },
    ]);
    expectNoPathIn(root, recorder);
  });

  for (const stage of ['setting-up', 'installing', 'starting'] as const) {
    for (const reason of ['failed', 'canceled'] as const) {
      it(`correlates ${reason} in ${stage} with its start and elapsed wait`, async () => {
        const root = useOwnWorkspaceRoot(`telemetry-${stage}-${reason}`);
        let time = 100;
        const token = createCancelToken();
        const recorder = makeRecorder({
          now: () => time,
          emitStage: (current) => {
            time = { 'setting-up': 150, installing: 450, starting: 950 }[current];
            if (reason === 'canceled' && current === stage) token.cancel();
          },
          adapter: async () => {
            if (reason === 'failed' && stage === 'setting-up') throw new Error(root);
            return { adapter: INSTALLING_ADAPTER, manager: { name: 'bun' } };
          },
          install: async () => ({ ok: stage !== 'installing', err: root, timedOut: false }),
        });
        recorder.deps.starter.spawn = async () => { throw new Error(root); };

        const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);

        expect(result).toMatchObject({ ok: false, stage, canceled: reason === 'canceled' });
        expect(recorder.captured).toEqual([
          { event: 'project_creation_started', properties: {
            creation_id: expect.any(String), source: 'blank', entry_point: 'projects',
          } },
          { event: 'project_creation_failed', properties: {
            creation_id: recorder.captured[0]?.properties['creation_id'], source: 'blank', entry_point: 'projects',
            stage, reason, duration_ms: { 'setting-up': 50, installing: 350, starting: 850 }[stage],
            ...(reason === 'canceled' ? {} : {
              'setting-up': { failure_step: 'scaffold', failure_cause: 'unknown' },
              installing: { failure_step: 'install', failure_cause: 'install_failed' },
              starting: { failure_step: 'starter_spawn', failure_cause: 'unknown' },
            }[stage]),
          } },
        ]);
        expectNoPathIn(root, recorder);
      });
    }
  }

  it('gives retries separate creation ids', async () => {
    useOwnWorkspaceRoot('telemetry-retry');
    const recorder = makeRecorder({ adapter: async () => { throw new Error('setup failed'); } });

    await createBlankProject({ entryPoint: 'projects' }, recorder.deps);
    await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    const starts = recorder.captured.filter(({ event }) => event === 'project_creation_started');
    const failures = recorder.captured.filter(({ event }) => event === 'project_creation_failed');
    expect(starts).toHaveLength(2);
    expect(failures.map(({ properties }) => properties['creation_id'])).toEqual(starts.map(({ properties }) => properties['creation_id']));
    expect(starts[0]?.properties['creation_id']).not.toBe(starts[1]?.properties['creation_id']);
  });
});

const INSTALLING_ADAPTER: StarterAdapter = {
  id: 'react',
  install: true,
  files: () => ({ ...STATIC_FILES, 'package.json': '{ "name": "fixture", "private": true }\n' }),
  briefing: () => 'fixture',
};

interface InstallRecorder {
  runs: { plan: InstallPlan; cwd: string; signal: AbortSignal }[];
  install: NonNullable<BlankCreateDeps['install']>;
}

function installRecorder(answer: (signal: AbortSignal) => Promise<RunResult> | RunResult): InstallRecorder {
  const runs: InstallRecorder['runs'] = [];
  return {
    runs,
    install: async (plan, cwd, signal) => {
      runs.push({ plan, cwd, signal });
      return answer(signal);
    },
  };
}

async function withInstallLog<T>(run: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  recordLinesForTesting();
  try {
    const result = await run();
    const lines = peekLinesForTesting()
      .filter((line) => line.subsystem === 'install')
      .map((line) => line.msg);
    return { result, lines };
  } finally {
    resetLogForTesting();
  }
}

describe("the 'installing' stage", () => {
  it('an adapter with no install emits no installing stage and runs no installer', async () => {
    useOwnWorkspaceRoot('no-install');
    const installer = installRecorder(() => ({ ok: true, err: '', timedOut: false }));
    const recorder = makeRecorder({ install: installer.install });

    const { result, lines } = await withInstallLog(() => createBlankProject({ entryPoint: 'projects' }, recorder.deps));

    expect(result.ok).toBe(true);
    expect(recorder.stages).toEqual(['setting-up', 'starting']);
    expect(installer.runs).toEqual([]);
    expect(lines).toEqual([]);
  });

  it('installs in the worktree between the cut and the spawn, and the connect-time auto-install never fires', async () => {
    useOwnWorkspaceRoot('install-ok');
    const installer = installRecorder(() => ({ ok: true, err: '', timedOut: false }));
    const recorder = makeRecorder({
      adapter: async () => ({ adapter: INSTALLING_ADAPTER, manager: { name: 'bun', version: '1.0.0' } }),
      install: installer.install,
    });

    const { result, lines } = await withInstallLog(() => createBlankProject({ entryPoint: 'projects' }, recorder.deps));

    if (!result.ok) throw new Error(`stage ${result.stage}: ${result.detail ?? ''}`);
    expect(recorder.stages).toEqual(['setting-up', 'installing', 'starting']);
    expect(recorder.calls.slice(0, 5)).toEqual(['capture:project_creation_started', 'stage:setting-up', 'stage:installing', 'stage:starting', 'spawn']);
    expect(installer.runs).toHaveLength(1);
    expect(installer.runs[0]?.plan).toEqual({ manager: 'bun', command: 'bun', args: ['install'] });
    expect(installer.runs[0]?.cwd).toBe(result.workspace.workspacePath);
    expect(installer.runs[0]?.cwd).not.toContain('/source');
    expect(existsSync(join(result.workspace.workspacePath, 'package.json'))).toBe(true);
    expect(lines).toEqual([]);
  });

  it("a failed install answers 'installing' with the manager's words and leaves nothing", async () => {
    const root = useOwnWorkspaceRoot('install-fails');
    const installer = installRecorder(() => ({ ok: false, err: 'ERR_PNPM_NO_OFFLINE_META  fixture', timedOut: false }));
    const recorder = makeRecorder({
      adapter: async () => ({ adapter: INSTALLING_ADAPTER, manager: { name: 'pnpm' } }),
      install: installer.install,
    });

    const result = await createBlankProject({ entryPoint: 'onboarding' }, recorder.deps);

    expect(result).toEqual({ ok: false, stage: 'installing', canceled: false, detail: 'ERR_PNPM_NO_OFFLINE_META  fixture' });
    expect(recorder.calls).not.toContain('spawn');
    expect(recorder.captured[1]?.properties).toMatchObject({ stage: 'installing', reason: 'failed', entry_point: 'onboarding' });
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
    expectNoPathIn(root, recorder);
  });

  it('a timed-out install is named as such', async () => {
    useOwnWorkspaceRoot('install-timeout');
    const installer = installRecorder(() => ({ ok: false, err: '', timedOut: true }));
    const recorder = makeRecorder({
      adapter: async () => ({ adapter: INSTALLING_ADAPTER, manager: { name: 'npm' } }),
      install: installer.install,
    });

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toEqual({ ok: false, stage: 'installing', canceled: false, detail: 'npm install timed out' });
  });

  it('cancel during the install aborts the child, answers canceled, and rolls back once', async () => {
    const root = useOwnWorkspaceRoot('install-cancel');
    const token = createCancelToken();
    const installer = installRecorder(
      (signal) =>
        new Promise<RunResult>((resolve) => {
          signal.addEventListener('abort', () => resolve({ ok: false, err: 'canceled', timedOut: false, aborted: true }));
          token.cancel();
        }),
    );
    const recorder = makeRecorder({
      adapter: async () => ({ adapter: INSTALLING_ADAPTER, manager: { name: 'bun' } }),
      install: installer.install,
    });

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);

    expect(result).toEqual({ ok: false, stage: 'installing', canceled: true });
    expect(installer.runs[0]?.signal.aborted).toBe(true);
    expect(recorder.calls).not.toContain('spawn');
    expect(recorder.calls.filter((c) => c === 'capture:project_creation_failed')).toHaveLength(1);
    expect(bucketsIn(root)).toEqual([]);
  });

  it('an installing adapter with no manager chosen fails before the install', async () => {
    const root = useOwnWorkspaceRoot('install-no-manager');
    const installer = installRecorder(() => ({ ok: true, err: '', timedOut: false }));
    const recorder = makeRecorder({ adapter: async () => ({ adapter: INSTALLING_ADAPTER }), install: installer.install });

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result.ok).toBe(false);
    expect(installer.runs).toEqual([]);
    expect(bucketsIn(root)).toEqual([]);
  });
});

describe('failure and cancel — residue-free, answered after rollback', () => {
  it("a starter that never becomes ready fails the 'starting' stage and rolls back in order", async () => {
    const root = useOwnWorkspaceRoot('spawn-fails');
    const recorder = makeRecorder();
    recorder.deps.starter.spawn = async () => {
      recorder.calls.push('spawn');
      throw new Error('no ready line');
    };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: false, detail: 'Error: no ready line' });
    expect(recorder.calls).toEqual([
      'capture:project_creation_started',
      'stage:setting-up',
      'stage:starting',
      'spawn',
      'capture:project_creation_failed',
      'stop',
    ]);
    expect(recorder.captured[1]?.properties).toEqual({
      creation_id: recorder.captured[0]?.properties['creation_id'],
      source: 'blank',
      duration_ms: 0,
      stage: 'starting',
      reason: 'failed',
      entry_point: 'projects',
      failure_step: 'starter_spawn',
      failure_cause: 'unknown',
    });
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
    expect(recorder.announced).toEqual([]);
    expectNoPathIn(root, recorder);
  });

  it("a starter that answers ready but never measures running fails 'starting' with no project_created", async () => {
    const root = useOwnWorkspaceRoot('never-running');
    const recorder = makeRecorder({
      server: {
        openProject: async () => undefined,
        report: async () => undefined,
        awaitRunning: async () => 'timed-out',
      },
    });

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: false });
    expect(recorder.captured.map((c) => c.event)).toEqual(['project_creation_started', 'project_creation_failed']);
    expect(recorder.captured[1]?.properties).toMatchObject({ failure_step: 'await_running', failure_cause: 'never_running' });
    expect(recorder.calls).toContain('stop');
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });

  it("cancel during 'setting-up' answers canceled after the bucket is gone", async () => {
    const root = useOwnWorkspaceRoot('cancel-setup');
    const recorder = makeRecorder();
    const token = createCancelToken();
    recorder.deps.emitStage = (stage) => {
      recorder.calls.push(`stage:${stage}`);
      if (stage === 'setting-up') token.cancel();
    };

    const result = await createBlankProject({ entryPoint: 'onboarding' }, recorder.deps, token);

    expect(result).toEqual({ ok: false, stage: 'setting-up', canceled: true });
    expect(recorder.calls).not.toContain('spawn');
    expect(recorder.captured[1]?.properties).toMatchObject({ stage: 'setting-up', reason: 'canceled' });
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });

  it("cancel during 'starting' stops the spawned starter and leaves nothing", async () => {
    const root = useOwnWorkspaceRoot('cancel-starting');
    const recorder = makeRecorder();
    const token = createCancelToken();
    recorder.deps.starter.spawn = async () => {
      recorder.calls.push('spawn');
      token.cancel();
      return 4310;
    };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: true });
    const { calls } = recorder;
    expect(calls.indexOf('capture:project_creation_failed')).toBeGreaterThan(calls.indexOf('spawn'));
    expect(calls.indexOf('stop')).toBeGreaterThan(calls.indexOf('capture:project_creation_failed'));
    expect(calls).not.toContain('report:4310');
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
  });

  it('cancel while the spawn is still pending answers at once, and stops the starter when it does arrive', async () => {
    const root = useOwnWorkspaceRoot('cancel-mid-spawn');
    const recorder = makeRecorder();
    const token = createCancelToken();
    let arrive: () => void = () => undefined;
    recorder.deps.starter.spawn = () => {
      recorder.calls.push('spawn');
      token.cancel();
      return new Promise((resolve) => {
        arrive = () => resolve(4310);
      });
    };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: true });
    expect(recorder.calls.filter((c) => c === 'stop')).toHaveLength(1);
    expect(bucketsIn(root)).toEqual([]);
    arrive();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(recorder.calls.filter((c) => c === 'stop')).toHaveLength(2);
    expect(recorder.calls).not.toContain('report:4310');
    expect(listWorkspaces()).toEqual([]);
  });

  it('cancel while the running wait is open answers at once, not at the bound', async () => {
    const root = useOwnWorkspaceRoot('cancel-awaiting');
    const recorder = makeRecorder();
    const token = createCancelToken();
    recorder.deps.server.awaitRunning = () => {
      recorder.calls.push('running');
      // Never settles: only the token can end this wait.
      setTimeout(() => token.cancel(), 0);
      return new Promise(() => undefined);
    };
    recorder.deps.runningBoundMs = 60_000;

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: true });
    expect(recorder.calls.slice(-3)).toEqual(['running', 'capture:project_creation_failed', 'stop']);
    expect(bucketsIn(root)).toEqual([]);
    expect(listWorkspaces()).toEqual([]);
    expect(recorder.announced).toEqual([]);
  });

  it('a rollback that throws is reported once and answers rather than rejecting', async () => {
    useOwnWorkspaceRoot('rollback-throws');
    const recorder = makeRecorder();
    recorder.deps.starter.spawn = async () => {
      recorder.calls.push('spawn');
      throw new Error('no ready line');
    };
    recorder.deps.starter.stop = async () => {
      recorder.calls.push('stop');
      throw new Error('stop failed');
    };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toMatchObject({ ok: false, stage: 'starting', canceled: false });
    expect(result.ok === false && result.detail).toContain('rollback: Error: stop failed');
    expect(recorder.calls.filter((c) => c === 'capture:project_creation_failed')).toHaveLength(1);
    expect(recorder.calls.filter((c) => c === 'stop')).toHaveLength(1);
    expect(listWorkspaces()).toEqual([]);
  });

  it("a claim that throws answers a failed 'setting-up' rather than rejecting", async () => {
    const root = useOwnWorkspaceRoot('claim-throws');
    const blocked = join(root, 'not-a-dir');
    writeFileSync(blocked, '');
    process.env['STUDIO_WORKSPACE_ROOT'] = blocked;
    resetWorkspaceCache();
    const recorder = makeRecorder();

    const result = await createBlankProject({ entryPoint: 'onboarding' }, recorder.deps);

    expect(result).toMatchObject({ ok: false, stage: 'setting-up', canceled: false });
    expect(result.ok === false && result.detail).toBeTruthy();
    expect(recorder.calls).toEqual(['capture:project_creation_started', 'stage:setting-up', 'capture:project_creation_failed']);
    expect(recorder.captured[1]?.properties).toEqual({
      creation_id: recorder.captured[0]?.properties['creation_id'],
      source: 'blank',
      duration_ms: 0,
      stage: 'setting-up',
      reason: 'failed',
      entry_point: 'onboarding',
      failure_step: 'claim',
      failure_cause: 'system_error',
      system_error: 'EEXIST',
    });
    expectNoPathIn(root, recorder);
  });

  it('a failed git step names the step and its exit code, and the dialog keeps git\'s words', async () => {
    const root = useOwnWorkspaceRoot('commit-fails');
    const recorder = makeRecorder({ adapter: async () => ({ adapter: { ...STATIC_ADAPTER, files: () => ({}) } }) });

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toMatchObject({ ok: false, stage: 'setting-up', canceled: false });
    expect(result.ok === false && result.detail).toStartWith('git commit exited with code 1:');
    expect(recorder.captured[1]?.properties).toMatchObject({ failure_step: 'git_commit', failure_cause: 'git_failed', exit_code: 1 });
    expectNoPathIn(root, recorder);
  });

  it('a project that cannot open names that step by its system error, and the dialog keeps the message', async () => {
    const root = useOwnWorkspaceRoot('open-fails');
    const message = `EACCES: permission denied, open '${root}/canvas.json'`;
    const recorder = makeRecorder();
    recorder.deps.canvas.open = async () => { throw Object.assign(new Error(message), { code: 'EACCES' }); };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: false, detail: `Error: ${message}` });
    expect(recorder.captured[1]?.properties).toMatchObject({ failure_step: 'open_project', failure_cause: 'permission_denied', system_error: 'EACCES' });
    expectNoPathIn(root, recorder);
  });

  it('a starter that dies records its exit code, and its output stays with the dialog', async () => {
    const root = useOwnWorkspaceRoot('starter-dies');
    const message = `starter exited (code 7) before it was ready: ${root}`;
    const recorder = makeRecorder();
    recorder.deps.starter.spawn = async () => { throw new StarterFailure('starter_exited', message, 7); };

    const result = await createBlankProject({ entryPoint: 'projects' }, recorder.deps);

    expect(result).toEqual({ ok: false, stage: 'starting', canceled: false, detail: `Error: ${message}` });
    expect(recorder.captured[1]?.properties).toMatchObject({ failure_step: 'starter_spawn', failure_cause: 'starter_exited', exit_code: 7 });
    expectNoPathIn(root, recorder);
  });

  it('a failure writes one log line with the same fields and none of the text', async () => {
    const root = useOwnWorkspaceRoot('failure-log');
    const recorder = makeRecorder();
    recorder.deps.canvas.open = async () => { throw Object.assign(new Error(root), { code: 'ENOSPC' }); };
    recordLinesForTesting();
    try {
      await createBlankProject({ entryPoint: 'projects' }, recorder.deps);
      const lines = peekLinesForTesting().filter((line) => line.msg === 'blank creation failed');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        level: 'warn',
        creation_id: recorder.captured[0]?.properties['creation_id'],
        stage: 'starting',
        failure_step: 'open_project',
        failure_cause: 'disk_full',
        system_error: 'ENOSPC',
      });
      expect(JSON.stringify(lines[0])).not.toContain(root);
    } finally {
      resetLogForTesting();
    }
  });

  it('a cancel carries no failure fields and writes no failure line', async () => {
    useOwnWorkspaceRoot('cancel-fields');
    const token = createCancelToken();
    const recorder = makeRecorder({ emitStage: () => token.cancel() });
    recordLinesForTesting();
    try {
      await createBlankProject({ entryPoint: 'projects' }, recorder.deps, token);
      expect(Object.keys(recorder.captured[1]?.properties ?? {}).filter((key) => key.startsWith('failure_'))).toEqual([]);
      expect(peekLinesForTesting().filter((line) => line.msg === 'blank creation failed')).toEqual([]);
    } finally {
      resetLogForTesting();
    }
  });
});
