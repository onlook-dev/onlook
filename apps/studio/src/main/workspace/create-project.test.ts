import { t } from '@studio/i18n';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import type { WebContents } from 'electron';
import {
  IPC_EMIT,
  type ProjectCreateState,
  type WorkspaceCreated,
  type WorkspaceCreateResult,
  type WorkspacePlan,
} from '@studio/events';
import {
  cleanupTempFixtures,
  gitOutput,
  type SourceCheckout,
  installPostCheckoutHook,
  makeCopySourceDir,
  makeSourceCheckout,
  makeGitRepo,
  makeStateRoot,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { needsTelling } from '../tabs/assignment.js';
import { tabDecisions } from '../tabs/decisions.js';
import { capture as telemetryCapture, peekQueueForTesting } from '../telemetry/index.js';
import type { InstallOutcome } from '../install/index.js';
import { setRendererSource } from '../tabs/broadcast.js';
import { unregisterView, workspaceOf } from '../tabs/views.js';
import { everyRenderer } from '../window/host.js';
import { createCancelToken } from './cancel.js';
import { completeCopiedRegistration, copiedBucket } from './copy.js';
import {
  appProjectCreateDeps,
  createLabel,
  createProject,
  ProjectCreations,
  resetForcedFailures,
  type ProjectCreateDeps,
  type ProjectCreateRequest,
} from './create-project.js';
import type { DetectionOutcome } from './detect.js';
import { fabricateFromPlan, planWorkspace, rollbackFromPlan, type ReadyWorkspacePlan } from './index.js';
import {
  awaitSessionIdle,
  isSessionStreaming,
  noteSetupStreaming,
  resetSetupSignals,
  type FirstFrameAnswer,
  type StartOutcome,
} from './setup-signals.js';
import { knownProject, listWorkspaces, rememberProject, resetWorkspaceCache } from './store.js';
import { configureLogExport, flushLog, peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';

const savedFailAt = process.env['STUDIO_SETUP_FAIL_AT'];

afterEach(() => {
  if (savedFailAt === undefined) delete process.env['STUDIO_SETUP_FAIL_AT'];
  else process.env['STUDIO_SETUP_FAIL_AT'] = savedFailAt;
  resetForcedFailures();
});

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `create-project-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  return root;
}

interface Script {
  cut?: 'real';
  start?: Exclude<StartOutcome, { kind: 'reported' }> | { kind: 'reported'; port: number };
  sent?: boolean;
  install?: InstallOutcome;
  holdInstall?: boolean;
  running?: 'running' | 'timed-out';
  detect?: DetectionOutcome;
}

interface Recorder {
  deps: ProjectCreateDeps;
  calls: string[];
  states: ProjectCreateState[];
  registered: WorkspaceCreated[];
  installed: string[];
  sessions: string[];
  intents: { cwd: string; context: string | undefined }[];
  framed: { cwd: string; port: number }[];
  captured: { event: string; properties: Record<string, unknown> }[];
  plans: ReadyWorkspacePlan[];
  rolledBack: ReadyWorkspacePlan[];
  aborted: () => boolean;
}

const realFabricate = fabricateFromPlan;
const realRollback = rollbackFromPlan;

let shared: SourceCheckout | undefined;
function sharedProject(): SourceCheckout {
  shared ??= makeSourceCheckout({ name: 'create-project-shared' });
  return shared;
}

let drawn = 0;
function fakePlan(sourcePath: string): ReadyWorkspacePlan {
  drawn += 1;
  const workspaceName = `ws-${String(drawn)}`;
  return {
    kind: 'ready',
    sourcePath,
    sourceRepoRoot: sourcePath,
    sourceRepoName: basename(sourcePath),
    repoIdentity: `local:${sourcePath}`,
    baseBranch: 'main',
    baseRef: 'origin/main',
    baseRefSource: 'remote-head',
    workspaceName,
    branchName: `fixture/${workspaceName}`,
    workspacePath: join('/workspaces', basename(sourcePath), workspaceName),
  };
}

function fakeCut(plan: ReadyWorkspacePlan): WorkspaceCreateResult {
  return {
    ok: true,
    workspace: {
      workspacePath: plan.workspacePath,
      workspaceName: plan.workspaceName,
      branchName: plan.branchName,
      baseBranch: plan.baseBranch,
      sourceRepoName: plan.sourceRepoName,
      sourcePath: plan.sourcePath,
      sourceRepoRoot: plan.sourceRepoRoot,
      repoIdentity: plan.repoIdentity,
      copiedEnvFiles: [],
    },
  };
}

function makeRecorder(overrides: Partial<ProjectCreateDeps> = {}, script: Script = {}): Recorder {
  const calls: string[] = [];
  const states: ProjectCreateState[] = [];
  const registered: WorkspaceCreated[] = [];
  const installed: string[] = [];
  const sessions: string[] = [];
  const intents: { cwd: string; context: string | undefined }[] = [];
  const framed: { cwd: string; port: number }[] = [];
  const captured: { event: string; properties: Record<string, unknown> }[] = [];
  const plans: ReadyWorkspacePlan[] = [];
  const rolledBack: ReadyWorkspacePlan[] = [];
  let aborted = false;
  let placement: Promise<FirstFrameAnswer> | undefined;
  let markSent: () => void = () => undefined;
  const sentOnce = new Promise<void>((resolve) => {
    markSent = resolve;
  });
  const deps: ProjectCreateDeps = {
    plan: async (sourcePath) => {
      calls.push('plan');
      return script.cut === 'real' ? planWorkspace(sourcePath) : fakePlan(sourcePath);
    },
    fabricate: async (plan) => {
      calls.push('fabricate');
      plans.push(plan);
      return script.cut === 'real' ? realFabricate(plan) : fakeCut(plan);
    },
    // Recorded once it finishes, a macrotask later, so a caller that did not await it reads nothing.
    rollback: async (plan) => {
      calls.push('rollback');
      if (script.cut === 'real') await realRollback(plan);
      else await new Promise((resolve) => setTimeout(resolve, 0));
      rolledBack.push(plan);
    },
    register: (workspace) => {
      calls.push('register');
      registered.push(workspace);
    },
    capture: (event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    },
    startSession: async (cwd) => {
      calls.push('startSession');
      sessions.push(cwd);
    },
    install: (path, signal) => {
      calls.push('install');
      installed.push(path);
      if (script.holdInstall) {
        return new Promise<InstallOutcome>((resolve) => {
          signal.addEventListener('abort', () => {
            aborted = true;
            resolve({ outcome: 'canceled' });
          });
        });
      }
      return Promise.resolve(script.install ?? { outcome: 'installed', manager: 'bun' });
    },
    awaitIdle: async () => {
      calls.push('awaitIdle');
      return 'idle';
    },
    detect: async () => {
      calls.push('detect');
      return script.detect ?? { asks: [] };
    },
    awaitOpen: async () => {
      calls.push('awaitOpen');
      return 'open';
    },
    awaitStart: (_cwd, token, place) => {
      calls.push('awaitStart');
      return Promise.race([
        sentOnce.then(async (): Promise<StartOutcome> => {
          const start = script.start ?? { kind: 'reported', port: 3000 };
          if (start.kind !== 'reported') return start;
          placement ??= place(start.port);
          return { ...start, frame: await placement };
        }),
        token.whenCanceled.then(() => ({ kind: 'canceled' }) as const),
      ]);
    },
    sendStartIntent: async (cwd, context) => {
      calls.push('sendStartIntent');
      intents.push({ cwd, context });
      markSent();
      return script.sent ?? true;
    },
    authorFrame: async (cwd, port) => {
      calls.push('authorFrame');
      framed.push({ cwd, port });
      return { kind: 'not-placed', reason: 'the recorder places nothing' };
    },
    awaitRunning: async () => {
      calls.push('awaitRunning');
      return script.running ?? 'running';
    },
    emit: (state) => {
      calls.push(`emit:${state === null ? 'cleared' : state.kind}`);
      if (state !== null) states.push(state);
    },
    ...overrides,
  };
  return {
    deps,
    calls,
    states,
    registered,
    installed,
    sessions,
    intents,
    framed,
    captured,
    plans,
    rolledBack,
    aborted: () => aborted,
  };
}

function refusedPlan(plan: WorkspacePlan): Partial<ProjectCreateDeps> {
  return { plan: async () => plan };
}

function kinds(recorder: Recorder): string[] {
  return recorder.states.map((state) => state.kind);
}

function expectKind<K extends ProjectCreateState['kind']>(
  state: ProjectCreateState,
  kind: K,
): Extract<ProjectCreateState, { kind: K }> {
  if (state.kind !== kind) throw new Error(`expected ${kind}, got ${JSON.stringify(state)}`);
  return state as Extract<ProjectCreateState, { kind: K }>;
}

const HAPPY_PATH = [
  'emit:planning',
  'plan',
  'emit:copying',
  'fabricate',
  'register',
  'startSession',
  'emit:ready',
  'emit:installing',
  'install',
  'emit:starting',
  'awaitIdle',
  'detect',
  'awaitOpen',
  'awaitIdle',
  'awaitStart',
  'sendStartIntent',
  'authorFrame',
  'awaitRunning',
  'emit:live',
];

describe('the sequence', () => {
  it('reuses the machine diagnosis when a later project cannot be planned', async () => {
    const recorder = makeRecorder({
      plan: async () => { throw new Error('raw Git failure'); },
      diagnoseFailure: async () => 'what the machine checks say',
    });
    const state = await createProject({ sourcePath: '/somewhere/project', entryPoint: 'projects' }, recorder.deps);
    expect(state).toMatchObject({ kind: 'failed', phase: 'planning', detail: 'what the machine checks say' });
  });
  // What `appProjectCreateDeps` hands it with `machine-check` off: the failing step's own report, as on main (ONL-3111).
  it('reports the raw failure with no diagnosis wired at all', async () => {
    const recorder = makeRecorder({ plan: async () => { throw new Error('raw Git failure'); } });
    const state = await createProject({ sourcePath: '/somewhere/project', entryPoint: 'projects' }, recorder.deps);
    expect(state).toMatchObject({ kind: 'failed', phase: 'planning', detail: 'Error: raw Git failure' });
  });
  it('lets an unsaved copied project reach discovery without a guessed install prerequisite', async () => {
    const recorder = makeRecorder({
      hasSavedSetup: () => false,
      runSavedSetup: async () => { throw new Error('no saved setup should run'); },
      install: async () => { throw new Error('guessed manager is unavailable'); },
    });
    const state = await createProject({ sourcePath: '/somewhere/unsaved-toolchain', entryPoint: 'projects' }, recorder.deps, createCancelToken());
    expect(state.kind).toBe('live');
    expect(recorder.calls).toContain('detect');
    expect(recorder.calls).toContain('sendStartIntent');
    expect(recorder.calls).not.toContain('install');
    expect(kinds(recorder)).not.toContain('installing');
    expect(recorder.intents).toHaveLength(1);
  });

  it('continues normal discovery when the saved runner reports an unknown setup', async () => {
    const recorder = makeRecorder({ runSavedSetup: async () => null, install: async () => { throw new Error('guessed install is not part of discovery'); } });
    const state = await createProject({ sourcePath: '/somewhere/unknown-setup', entryPoint: 'projects' }, recorder.deps, createCancelToken());
    expect(state.kind).toBe('live');
    expect(recorder.calls).toContain('detect');
    expect(recorder.intents).toHaveLength(1);
  });

  it('reuses saved setup on resumed creation without another install, agent session or discovery turn', async () => {
    const workspace = fakeCut(fakePlan('/somewhere/saved'));
    if (!workspace.ok) throw new Error('fixture failed');
    const recorder = makeRecorder({
      runSavedSetup: async () => ({ ok: true, snapshot: { saved: null, verified: null, failure: null, state: 'running' } }),
    });
    const state = await createProject({ sourcePath: '/somewhere/saved', entryPoint: 'projects' }, recorder.deps, createCancelToken(), { phase: 'starting', workspace: workspace.workspace });
    expect(state.kind).toBe('live');
    expect(recorder.installed).toEqual([]);
    expect(recorder.sessions).toEqual([]);
    expect(recorder.intents).toEqual([]);
    expect(kinds(recorder)).toEqual(['starting', 'live']);
  });

  it('emits planning before it awaits anything — the press is answered first', () => {
    const project = { path: '/somewhere/optimistic' };
    const recorder = makeRecorder({ plan: () => new Promise<WorkspacePlan>(() => undefined) });

    void createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(recorder.states).toEqual([
      { kind: 'planning', sourceRepoName: basename(project.path) },
    ]);
  });

  it('plans, cuts, registers, starts the session, lands, installs, starts, frames the report and answers live', async () => {
    const project = { path: '/somewhere/happy' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    expect(recorder.calls).toEqual(HAPPY_PATH);
    expect(kinds(recorder)).toEqual(['planning', 'copying', 'ready', 'installing', 'starting', 'live']);
    const live = expectKind(state, 'live');
    expect(recorder.registered).toEqual([live.workspace]);
    expect(recorder.installed).toEqual([live.workspace.workspacePath]);
    expect(recorder.framed).toEqual([{ cwd: live.workspace.workspacePath, port: 3000 }]);
  });

  it('starts the session AFTER registering and BEFORE the landing, so the tab’s own start is a join', async () => {
    const project = { path: '/somewhere/session-order' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const register = recorder.calls.indexOf('register');
    const session = recorder.calls.indexOf('startSession');
    const ready = recorder.calls.indexOf('emit:ready');
    expect(register).toBeGreaterThanOrEqual(0);
    expect(session).toBeGreaterThan(register);
    expect(ready).toBeGreaterThan(session);
    expect(recorder.sessions).toEqual([expectKind(state, 'live').workspace.workspacePath]);
  });

  it('installs only AFTER registering, so nothing writes into a bucket a rollback could take', async () => {
    const project = { path: '/somewhere/install-order' };
    const recorder = makeRecorder();

    await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(recorder.calls.indexOf('register')).toBeLessThan(recorder.calls.indexOf('install'));
  });

  it('sends the Start intent only after its wait is registered, and with the detection seam’s answer', async () => {
    const project = { path: '/somewhere/intent-order' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(recorder.calls.indexOf('awaitStart')).toBeLessThan(recorder.calls.indexOf('sendStartIntent'));
    expect(recorder.intents).toEqual([{ cwd: expectKind(state, 'live').workspace.workspacePath, context: undefined }]);
  });

  it('a skipped install (no package manager) still reaches starting', async () => {
    const project = { path: '/somewhere/skipped-install' };
    const recorder = makeRecorder({}, { install: { outcome: 'skipped' } });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('live');
    expect(kinds(recorder)).toContain('starting');
  });

  it('names the chosen folder while planning, then the repo and project the plan drew', async () => {
    const project = { path: '/somewhere/naming' };
    const chosen = join(project.path, 'packages');
    const recorder = makeRecorder({ plan: async () => ({ ...fakePlan(project.path), sourcePath: chosen }) });

    await createProject({ sourcePath: chosen, entryPoint: 'projects' }, recorder.deps);

    const planning = recorder.states[0];
    const copying = recorder.states[1];
    if (planning?.kind !== 'planning') throw new Error('expected planning first');
    if (copying?.kind !== 'copying') throw new Error('expected copying second');
    expect(planning.sourceRepoName).toBe('packages');
    expect(copying.sourceRepoName).toBe(basename(project.path));
    expect(copying.sourceRepoName).not.toBe(planning.sourceRepoName);
    expect(copying.workspaceName.length).toBeGreaterThan(0);
  });

  it('cuts the plan it announced — the worktree holds what was pushed, not the dirty checkout', async () => {
    useOwnWorkspaceRoot('isolation');
    const project = sharedProject();
    const recorder = makeRecorder({}, { cut: 'real' });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const seeded = join(expectKind(state, 'live').workspace.workspacePath, 'index.js');
    expect(await Bun.file(seeded).text()).toBe(project.pushedContent);
  });

  it('a repo with no remote cuts from local main with no upstream and no push target', async () => {
    useOwnWorkspaceRoot('no-remote');
    const { path: repo } = makeGitRepo({ name: 'create-project-noremote', remote: false });
    expect(gitOutput(repo, ['remote'])).toBe('');
    gitOutput(repo, ['checkout', '--quiet', '-b', 'wip']);
    gitOutput(repo, ['commit', '--quiet', '--allow-empty', '-m', 'ahead of main']);
    const mainSha = gitOutput(repo, ['rev-parse', 'refs/heads/main']);
    expect(gitOutput(repo, ['rev-parse', 'HEAD'])).not.toBe(mainSha);
    const recorder = makeRecorder({}, { cut: 'real' });

    const state = await createProject({ sourcePath: repo, entryPoint: 'projects' }, recorder.deps);

    const { workspacePath, branchName, baseBranch } = expectKind(state, 'live').workspace;
    expect(baseBranch).toBe('main');
    expect(gitOutput(workspacePath, ['rev-parse', 'HEAD'])).toBe(mainSha);
    expect(() => gitOutput(workspacePath, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(() => gitOutput(repo, ['config', `branch.${branchName}.remote`])).toThrow();
    expect(() => gitOutput(workspacePath, ['push'])).toThrow();
  });
});

describe('the comfort answer (ONL-2178, ONL-2179)', () => {
  it('design ends the machine at ready: the session starts, no install, no Start intent, no frame', async () => {
    const project = { path: '/somewhere/design' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, comfort: 'design', entryPoint: 'projects' }, recorder.deps);

    expect(kinds(recorder)).toEqual(['planning', 'copying', 'ready']);
    expect(state.kind).toBe('ready');
    expect(recorder.sessions).toHaveLength(1);
    expect(recorder.calls).not.toContain('install');
    expect(recorder.calls).not.toContain('sendStartIntent');
    expect(recorder.framed).toEqual([]);
  });

  it('stamps the record, announces the stamped record, and captures one project_mode_chosen with a hashed id', async () => {
    const project = { path: '/somewhere/comfort' };
    const recorder = makeRecorder();

    const state = await createProject(
      { sourcePath: project.path, comfort: 'experiment', entryPoint: 'projects' },
      recorder.deps,
    );

    const live = expectKind(state, 'live');
    expect(live.workspace.comfort).toBe('experiment');
    expect(recorder.registered.map((workspace) => workspace.comfort)).toEqual(['experiment']);
    expect(recorder.captured).toEqual([
      {
        event: 'project_created',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          source: 'imported',
          entry_point: 'projects',
        },
      },
      {
        event: 'project_mode_chosen',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          mode: 'experiment',
          source: 'imported',
          entry_point: 'projects',
        },
      },
    ]);
    const sent = JSON.stringify(recorder.captured);
    expect(sent).not.toContain(project.path);
    expect(sent).not.toContain(live.workspace.branchName);
  });

  it('a request that asked no question stamps nothing, captures no mode, and still runs the whole sequence', async () => {
    const project = { path: '/somewhere/no-comfort' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(expectKind(state, 'live').workspace.comfort).toBeUndefined();
    expect(recorder.captured.map((c) => c.event)).toEqual(['project_created']);
  });
});

describe('project_created on the source-repo path (ONL-2257)', () => {
  it("the band's + emits once at registration, as imported, carrying its own entry point", async () => {
    const project = { path: '/somewhere/band-source' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, entryPoint: 'band' }, recorder.deps);

    expectKind(state, 'live');
    expect(recorder.captured).toEqual([
      {
        event: 'project_created',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          source: 'imported',
          entry_point: 'band',
        },
      },
    ]);
    const sent = JSON.stringify(recorder.captured);
    expect(sent).not.toContain(project.path);
    expect(sent).not.toContain(basename(project.path));
  });

  it('each entry keeps its own name, so New Project and onboarding stay apart from the band', async () => {
    for (const entryPoint of ['projects', 'onboarding', 'switcher'] as const) {
      const project = { path: `/somewhere/entry-${entryPoint}` };
      const recorder = makeRecorder();
      await createProject({ sourcePath: project.path, entryPoint }, recorder.deps);
      expect(recorder.captured.map((c) => [c.event, c.properties['entry_point']])).toEqual([['project_created', entryPoint]]);
    }
  });

  it('a refused plan emits no project_created', async () => {
    const recorder = makeRecorder(
      refusedPlan({ kind: 'refused', reason: 'name-unavailable', detail: 'No unused workspace name after 10 attempts.' }),
    );

    const state = await createProject({ sourcePath: '/somewhere/repo', entryPoint: 'band' }, recorder.deps);

    expectKind(state, 'refused');
    expect(recorder.captured.map((c) => c.event)).not.toContain('project_created');
  });

  it('bound to the real telemetry with no key configured, the emit is a no-op', async () => {
    const project = { path: '/somewhere/no-key' };
    const recorder = makeRecorder({ capture: telemetryCapture });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'band' }, recorder.deps);

    expectKind(state, 'live');
    expect(peekQueueForTesting()).toHaveLength(0);
  });
});

describe('refusals — the isolation ladder is an answer, not an error', () => {
  it('copies a folder with no git history in the copying phase, and runs on to live with origin copied', async () => {
    const root = useOwnWorkspaceRoot('not-a-repo');
    const plain = makeDirWithFiles({ name: 'not-a-repo', files: { 'index.js': '// plain\n' } });
    const recorder = makeRecorder({}, { cut: 'real' });

    const state = await createProject({ sourcePath: plain, entryPoint: 'projects' }, recorder.deps);

    expect(kinds(recorder)).toEqual(['planning', 'copying', 'ready', 'installing', 'starting', 'live']);
    const live = expectKind(state, 'live');
    expect(live.workspace.origin).toBe('copied');
    expect(live.workspace.sourcePath).toBe(plain);
    expect(live.workspace.workspacePath.startsWith(root)).toBe(true);
    expect(existsSync(join(live.workspace.workspacePath, 'index.js'))).toBe(true);
    expect(existsSync(join(plain, '.git'))).toBe(false);
    expect(recorder.registered).toEqual([live.workspace]);
  });

  it('carries no-base-ref with its detail', async () => {
    const recorder = makeRecorder(
      refusedPlan({ kind: 'refused', reason: 'no-base-ref', detail: 'No remote, and no local branch named main.' }),
    );

    const state = await createProject({ sourcePath: '/somewhere/repo', entryPoint: 'projects' }, recorder.deps);

    expect(state).toEqual({
      kind: 'refused',
      sourceRepoName: 'repo',
      reason: 'no-base-ref',
      detail: 'No remote, and no local branch named main.',
    });
    expect(recorder.calls).not.toContain('fabricate');
  });

  it('carries already-copied with the existing project name for the headline', async () => {
    const recorder = makeRecorder(
      refusedPlan({ kind: 'refused', reason: 'already-copied', projectName: 'lemonade' }),
    );

    const state = await createProject({ sourcePath: '/somewhere/lemonade', entryPoint: 'projects' }, recorder.deps);

    expect(state).toEqual({
      kind: 'refused',
      sourceRepoName: 'lemonade',
      reason: 'already-copied',
      projectName: 'lemonade',
    });
    expect(recorder.calls).not.toContain('fabricate');
  });

  it('carries name-unavailable', async () => {
    const recorder = makeRecorder(
      refusedPlan({ kind: 'refused', reason: 'name-unavailable', detail: 'No unused workspace name after 10 attempts.' }),
    );

    const state = await createProject({ sourcePath: '/somewhere/repo', entryPoint: 'projects' }, recorder.deps);

    expect(expectKind(state, 'refused').reason).toBe('name-unavailable');
    expect(recorder.registered).toEqual([]);
  });

  it('answers failed at planning, with no project id to hash, when the plan itself throws', async () => {
    const recorder = makeRecorder({
      plan: () => Promise.reject(new Error('git is not on PATH')),
    });

    const state = await createProject({ sourcePath: '/somewhere/repo', entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('planning');
    expect(failed.detail).toContain('git is not on PATH');
    expect(recorder.captured).toEqual([
      {
        event: 'project_setup_failed',
        properties: {
          stage: 'planning',
          duration_ms: expect.any(Number),
          error_class: 'unknown',
        },
      },
    ]);
  });
});

describe('the cut going wrong', () => {
  it('keeps session startup failure output in the local log, never the PostHog export', async () => {
    const savedRoot = process.env['STUDIO_STATE_ROOT'];
    const savedFetch = globalThis.fetch;
    const bodies: string[] = [];
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'setup-private-log' });
    resetLogForTesting();
    recordLinesForTesting();
    configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
    globalThis.fetch = ((_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return Promise.resolve(new Response('{}'));
    }) as typeof fetch;
    try {
      const detail = 'private-repository private-branch arbitrary tool output';
      const recorder = makeRecorder({ startSession: async () => { throw new Error(detail); } });
      const state = await createProject({ sourcePath: '/somewhere/repo', comfort: 'design', entryPoint: 'projects' }, recorder.deps);
      expect(state.kind).toBe('ready');
      expect(JSON.stringify(peekLinesForTesting())).toContain(detail);
      await flushLog();
      expect(bodies).toHaveLength(1);
      expect(bodies[0]).toContain('session start at setup failed');
      expect(bodies[0]).not.toContain('private-repository');
      expect(bodies[0]).not.toContain('private-branch');
      expect(bodies[0]).not.toContain('arbitrary tool output');
    } finally {
      globalThis.fetch = savedFetch;
      resetLogForTesting();
      if (savedRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
      else process.env['STUDIO_STATE_ROOT'] = savedRoot;
    }
  });

  it('keeps raw setup output local and sends only classified failure metadata', async () => {
    const detail = "Preparing worktree (new branch 'private-handle/private-project')\nfatal: private-folder failed\n\tLICENSE\n\t.env";
    const recorder = makeRecorder({
      fabricate: async () => ({ ok: false, reason: 'create-failed', detail }),
    });

    const state = await createProject({ sourcePath: '/somewhere/repo', entryPoint: 'projects' }, recorder.deps);

    expect(expectKind(state, 'failed').detail).toBe(detail);
    const failure = recorder.captured.find((entry) => entry.event === 'project_setup_failed');
    expect(failure).toBeDefined();
    expect(failure?.properties).toEqual({
      project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
      stage: 'copying',
      duration_ms: expect.any(Number),
      error_class: 'clone_failed',
    });
  });

  it('answers failed at copying when the cut reports create-failed, and captures the stage with a hashed id', async () => {
    const project = { path: '/somewhere/create-failed' };
    const recorder = makeRecorder({
      fabricate: async () => ({
        ok: false,
        reason: 'create-failed',
        detail: 'Making the copy took too long and was stopped.',
      }),
    });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('copying');
    expect(failed.detail).toContain('took too long');
    expect(failed.workspace).toBeUndefined();
    expect(recorder.registered).toEqual([]);
    expect(recorder.installed).toEqual([]);
    expect(recorder.captured).toEqual([
      {
        event: 'project_setup_failed',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          stage: 'copying',
          duration_ms: expect.any(Number),
          error_class: 'clone_failed',
        },
      },
    ]);
    expect(JSON.stringify(recorder.captured)).not.toContain(project.path);
  });

  it('carries a refusal discovered by the cut as a refusal, not a failure', async () => {
    const project = { path: '/somewhere/late-refusal' };
    const recorder = makeRecorder({
      fabricate: async () => ({ ok: false, reason: 'name-unavailable' }),
    });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(expectKind(state, 'refused').reason).toBe('name-unavailable');
  });

  it('answers failed at copying when the cut throws', async () => {
    const project = { path: '/somewhere/fabricate-throws' };
    const recorder = makeRecorder({
      fabricate: () => Promise.reject(new Error('disk full')),
    });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('copying');
    expect(failed.detail).toContain('disk full');
  });

  it("an advisory hook's complaint is a SUCCESS that still lands the workspace (ONL-1871)", async () => {
    useOwnWorkspaceRoot('advisory-hook');
    const source = makeSourceCheckout({ name: 'advisory-hook' });
    installPostCheckoutHook(source.path, '#!/bin/sh\nexit 1\n', { name: 'advisory' });
    const recorder = makeRecorder({}, { cut: 'real' });

    const state = await createProject({ sourcePath: source.path, entryPoint: 'projects' }, recorder.deps);

    const live = expectKind(state, 'live');
    const ready = recorder.states.find((s) => s.kind === 'ready');
    if (ready?.kind !== 'ready') throw new Error('no landing emitted');
    expect(existsSync(live.workspace.workspacePath)).toBe(true);
    expect(recorder.registered).toHaveLength(1);
    expect(recorder.installed).toHaveLength(1);
  });
});

describe('the stages inside the project failing (ONL-2179)', () => {
  it('install failure answers failed at installing, landed, with the manager’s words', async () => {
    const source = { path: '/somewhere/install-fails' };
    const recorder = makeRecorder({}, { install: { outcome: 'failed', manager: 'pnpm', detail: 'ERR_PNPM_NO_LOCKFILE' } });

    const state = await createProject({ sourcePath: source.path, entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('installing');
    expect(failed.detail).toBe('ERR_PNPM_NO_LOCKFILE');
    expect(failed.workspace?.workspacePath).toBe(recorder.registered[0]?.workspacePath);
    expect(kinds(recorder)).toEqual(['planning', 'copying', 'ready', 'installing', 'failed']);
    expect(recorder.calls).not.toContain('sendStartIntent');
    expect(recorder.captured.map((c) => c.event)).toContain('project_setup_failed');
  });

  it('a Start turn that ends with no report answers failed at starting', async () => {
    const project = { path: '/somewhere/no-report' };
    const recorder = makeRecorder({}, { start: { kind: 'turn-ended' } });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('starting');
    expect(failed.detail).toBe(t('project.create.detail.noServer'));
    expect(failed.workspace).toBeDefined();
    expect(recorder.framed).toEqual([]);
    expect(recorder.calls).not.toContain('awaitRunning');
    expect(recorder.captured.find((entry) => entry.event === 'project_setup_failed')?.properties).toMatchObject({
      stage: 'starting', error_class: 'dev_server_failed',
    });
  });

  it('a failed Start turn names the agent and records an agent failure', async () => {
    const recorder = makeRecorder({}, { start: { kind: 'turn-failed' } });

    const state = await createProject({ sourcePath: '/somewhere/agent-fails', entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('starting');
    expect(failed.detail).toBe('The Onlook Agent ran into an error while starting your app.');
    expect(failed.workspace).toBeDefined();
    expect(recorder.framed).toEqual([]);
    expect(recorder.calls).not.toContain('awaitRunning');
    expect(recorder.captured.find((entry) => entry.event === 'project_setup_failed')?.properties).toMatchObject({
      stage: 'starting', error_class: 'agent_turn_failed',
    });
  });

  it('a Start turn that is over with no verdict names the agent and records a stopped turn (ONL-3343)', async () => {
    const recorder = makeRecorder({}, { start: { kind: 'turn-stopped' } });

    const state = await createProject({ sourcePath: '/somewhere/agent-stops', entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('starting');
    expect(failed.detail).toBe('The Onlook Agent stopped before your app started.');
    expect(failed.workspace).toBeDefined();
    expect(recorder.framed).toEqual([]);
    expect(recorder.calls).not.toContain('awaitRunning');
    expect(recorder.captured.find((entry) => entry.event === 'project_setup_failed')?.properties).toMatchObject({
      stage: 'starting', error_class: 'agent_turn_stopped',
    });
  });

  it('a session that took no intent answers failed at starting', async () => {
    const project = { path: '/somewhere/no-session' };
    const recorder = makeRecorder({}, { sent: false });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('starting');
    expect(failed.detail).toBe(t('project.create.detail.noSession'));
  });

  it('a reported port that never measures running answers failed at starting, naming the port', async () => {
    const project = { path: '/somewhere/never-running' };
    const recorder = makeRecorder({}, { start: { kind: 'reported', port: 4321 }, running: 'timed-out' });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    const failed = expectKind(state, 'failed');
    expect(failed.phase).toBe('starting');
    expect(failed.detail).toContain('4321');
    expect(recorder.framed).toEqual([{ cwd: failed.workspace?.workspacePath ?? '', port: 4321 }]);
  });
});

describe('cancel — a half-cut worktree must not become a phantom project', () => {
  it('cancelled while planning: nothing is cut and nothing is registered', async () => {
    const project = { path: '/somewhere/cancel-planning' };
    const token = createCancelToken();
    const recorder = makeRecorder({
      plan: async (sourcePath) => {
        const plan = fakePlan(sourcePath);
        token.cancel();
        return plan;
      },
    });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps, token);

    expect(state).toEqual({ kind: 'canceled' });
    expect(recorder.calls).not.toContain('fabricate');
    expect(recorder.calls).not.toContain('rollback');
    expect(recorder.registered).toEqual([]);
  });

  it('cancelled once the cut is made: the worktree and its branch are removed, and no card is left', async () => {
    useOwnWorkspaceRoot('cancel-copying');
    const project = sharedProject();
    const token = createCancelToken();
    let cut: ReadyWorkspacePlan | undefined;
    const recorder = makeRecorder(
      {
        fabricate: async (plan) => {
          cut = plan;
          const result = await realFabricate(plan);
          expect(existsSync(plan.workspacePath)).toBe(true);
          token.cancel();
          return result;
        },
      },
      { cut: 'real' },
    );

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps, token);

    expect(state).toEqual({ kind: 'canceled' });
    expect(recorder.calls).toContain('rollback');
    expect(recorder.registered).toEqual([]);
    expect(recorder.installed).toEqual([]);
    if (!cut) throw new Error('the cut never ran');
    expect(existsSync(cut.workspacePath)).toBe(false);
    expect(gitOutput(project.path, ['branch', '--list', cut.branchName]).trim()).toBe('');
  });

  it('a cancel after registration stops the setup without rolling back — the project is real', async () => {
    const project = { path: '/somewhere/cancel-late' };
    const token = createCancelToken();
    const recorder = makeRecorder({
      register: () => {
        token.cancel();
      },
    });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps, token);

    expect(state).toEqual({ kind: 'canceled' });
    expect(kinds(recorder)).toEqual(['planning', 'copying', 'canceled']);
    expect(recorder.calls).not.toContain('rollback');
    expect(recorder.calls).not.toContain('install');
  });

  it('a last-tab close while the session is starting answers canceled, never ready — a late ready re-lands the editor (ONL-2265)', async () => {
    const project = { path: '/somewhere/cancel-starting-session' };
    const creations = new ProjectCreations();
    let reachedStart: () => void = () => undefined;
    const starting = new Promise<void>((resolve) => {
      reachedStart = resolve;
    });
    let finishStart: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      finishStart = resolve;
    });
    const recorder = makeRecorder({
      startSession: () => {
        reachedStart();
        return started;
      },
    });

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);
    await starting;
    creations.release('tab-1');
    finishStart();
    const state = await done;

    expect(state).toEqual({ kind: 'canceled' });
    expect(kinds(recorder)).toEqual(['planning', 'copying', 'canceled']);
    expect(recorder.calls).not.toContain('rollback');
    expect(recorder.calls).not.toContain('install');
  });

  it('answers whether there was a record to release, so a repeated report is not a change', async () => {
    const project = { path: '/somewhere/release-answers' };
    const creations = new ProjectCreations();
    const recorder = makeRecorder({});

    expect(creations.release('tab-1')).toBe(false);

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(creations.release('tab-1')).toBe(true);
    expect(creations.release('tab-1')).toBe(false);
    await done;
  });

  it('a tab closed during installing aborts the install once and rolls nothing back', async () => {
    const project = { path: '/somewhere/cancel-installing' };
    const creations = new ProjectCreations();
    let reachedInstalling: () => void = () => undefined;
    const installing = new Promise<void>((resolve) => {
      reachedInstalling = resolve;
    });
    const recorder = makeRecorder({}, { holdInstall: true });
    const deps: ProjectCreateDeps = {
      ...recorder.deps,
      emit: (state) => {
        recorder.deps.emit(state);
        if (state?.kind === 'installing') reachedInstalling();
      },
    };

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, deps);
    await installing;
    creations.release('tab-1');
    const state = await done;

    expect(state).toEqual({ kind: 'canceled' });
    expect(recorder.aborted()).toBe(true);
    expect(recorder.calls.filter((call) => call === 'rollback')).toHaveLength(0);
    expect(recorder.calls.filter((call) => call === 'install')).toHaveLength(1);
    expect(recorder.calls).not.toContain('sendStartIntent');
  });

  it('a rollback that throws still answers canceled, with the residue in detail', async () => {
    const project = { path: '/somewhere/rollback-throws' };
    const token = createCancelToken();
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        const result = fakeCut(plan);
        token.cancel();
        return result;
      },
      rollback: () => Promise.reject(new Error('worktree is locked')),
    });

    const state = await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps, token);

    expect(expectKind(state, 'canceled').detail).toContain('worktree is locked');
  });

  it('emits every phase it passed through before the cancel', async () => {
    const project = { path: '/somewhere/cancel-phases' };
    const token = createCancelToken();
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        const result = fakeCut(plan);
        token.cancel();
        return result;
      },
    });

    await createProject({ sourcePath: project.path, entryPoint: 'projects' }, recorder.deps, token);

    expect(kinds(recorder)).toEqual(['planning', 'copying', 'canceled']);
  });
});

describe('the starting phase carries detection (ONL-2182)', () => {
  it('runs detection after idle and before the wait, and the block reaches the Start intent as its context', async () => {
    const project = { path: '/somewhere/detect-context' };
    const recorder = makeRecorder({}, { detect: { context: 'Studio looked at this repository before this turn.', asks: [] } });

    const state = await createProject({ sourcePath: project.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('live');
    expect(recorder.calls).toEqual(HAPPY_PATH);
    expect(recorder.intents).toEqual([
      { cwd: recorder.registered[0]?.workspacePath ?? '', context: 'Studio looked at this repository before this turn.' },
    ]);
    expect(recorder.captured.map((c) => c.event)).not.toContain('setup_question');
  });

  it('captures setup_question once per ask the block carries, with the hashed id and nothing else', async () => {
    const project = { path: '/somewhere/detect-asks' };
    const recorder = makeRecorder({}, { detect: { context: 'ask', asks: ['app', 'port'] } });

    await createProject({ sourcePath: project.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    const asked = recorder.captured.filter((c) => c.event === 'setup_question');
    expect(asked.map((c) => c.properties)).toEqual([
      {
        project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        kind: 'app',
      },
      {
        project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
        kind: 'port',
      },
    ]);
    for (const { properties } of asked) {
      expect(JSON.stringify(properties)).not.toContain(project.path);
      expect(Object.keys(properties).sort()).toEqual(['kind', 'project_id', 'workspace_instance_id']);
    }
  });

  it('a plan question carries which unusual start Studio saw, as booleans and nothing else (ONL-2960)', async () => {
    const recorder = makeRecorder({}, { detect: { context: 'ask', asks: ['plan'], unusual: ['monorepo', 'electron'] } });

    await createProject({ sourcePath: '/somewhere/detect-plan', comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    const asked = recorder.captured.filter((c) => c.event === 'setup_question');
    expect(asked.map((c) => c.properties)).toEqual([
      expect.objectContaining({ kind: 'plan', monorepo: true, electron: true, no_dev_script: false }),
    ]);
  });

  it('a detection that throws is skipped, not a starting failure: the intent still goes, with no context', async () => {
    const project = { path: '/somewhere/detect-throws' };
    const recorder = makeRecorder({
      detect: async () => {
        throw new Error('lsof exploded');
      },
    });

    const state = await createProject({ sourcePath: project.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('live');
    expect(recorder.intents.map((intent) => intent.context)).toEqual([undefined]);
  });

  it('a turn that starts under detection is waited out: the intent goes once, between turns, and the machine does not fail', async () => {
    resetSetupSignals();
    const project = { path: '/somewhere/detect-busy' };
    const sentWhileStreaming: boolean[] = [];
    const recorder = makeRecorder({
      awaitIdle: awaitSessionIdle,
      detect: async (workspace) => {
        noteSetupStreaming(workspace.workspacePath, true);
        setTimeout(() => noteSetupStreaming(workspace.workspacePath, false), 30);
        return { asks: [] };
      },
    });
    const send = recorder.deps.sendStartIntent;
    recorder.deps.sendStartIntent = async (cwd, context) => {
      sentWhileStreaming.push(isSessionStreaming(cwd));
      return (await send(cwd, context)) && !isSessionStreaming(cwd);
    };

    const state = await createProject({ sourcePath: project.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('live');
    expect(sentWhileStreaming).toEqual([false]);
    expect(recorder.calls.filter((call) => call === 'sendStartIntent')).toHaveLength(1);
  });

  it('a push the session refused is offered once more after the next idle, on a fresh wait', async () => {
    const project = { path: '/somewhere/send-refused-once' };
    let pushes = 0;
    const recorder = makeRecorder();
    const send = recorder.deps.sendStartIntent;
    recorder.deps.sendStartIntent = async (cwd, context) => {
      pushes += 1;
      await send(cwd, context);
      return pushes > 1;
    };

    const state = await createProject({ sourcePath: project.path, comfort: 'ship', entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('live');
    expect(pushes).toBe(2);
    const fromStarting = recorder.calls.slice(recorder.calls.indexOf('emit:starting'));
    expect(fromStarting).toEqual([
      'emit:starting',
      'awaitIdle',
      'detect',
      'awaitOpen',
      'awaitIdle',
      'awaitStart',
      'sendStartIntent',
      'authorFrame',
      'awaitIdle',
      'awaitStart',
      'sendStartIntent',
      'awaitRunning',
      'emit:live',
    ]);
  });
});

describe('Retry re-enters at the failed stage, after its cleanup (ONL-2179)', () => {
  it('after a starting failure, re-sends the intent only — no plan, no cut, no install', async () => {
    const project = { path: '/somewhere/retry-starting' };
    const creations = new ProjectCreations();
    const first = makeRecorder({}, { start: { kind: 'turn-ended' } });
    expect((await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps)).kind).toBe('failed');

    const second = makeRecorder();
    second.deps.refreshEnvironment = async () => { second.calls.push('refreshEnvironment'); };
    const retried = creations.retry('tab-1', second.deps);
    expect(retried).toBeDefined();
    const state = await retried;

    expect(state?.kind).toBe('live');
    expect(second.calls).toEqual(['emit:starting', 'refreshEnvironment', 'awaitIdle', 'detect', 'awaitOpen', 'awaitIdle', 'awaitStart', 'sendStartIntent', 'authorFrame', 'awaitRunning', 'emit:live']);
    expect(second.intents).toHaveLength(1);
    expect(creations.stateFor('tab-1')?.kind).toBe('live');
  });

  it('after an install failure, re-runs the install only and reaches live', async () => {
    const project = { path: '/somewhere/retry-installing' };
    const creations = new ProjectCreations();
    const first = makeRecorder({}, { install: { outcome: 'failed', manager: 'bun', detail: 'boom' } });
    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');
    expect(failed.phase).toBe('installing');

    const second = makeRecorder();
    second.deps.refreshEnvironment = async () => { second.calls.push('refreshEnvironment'); };
    const state = await creations.retry('tab-1', second.deps);

    expect(state?.kind).toBe('live');
    expect(second.calls).toEqual(['emit:installing', 'refreshEnvironment', 'install', 'emit:starting', 'awaitIdle', 'detect', 'awaitOpen', 'awaitIdle', 'awaitStart', 'sendStartIntent', 'authorFrame', 'awaitRunning', 'emit:live']);
    expect(second.installed).toEqual([failed.workspace?.workspacePath ?? '']);
    expect(second.calls).not.toContain('fabricate');
  });

  it.each(['installing', 'starting'] as const)('cancels a %s retry while its environment refresh is pending', async (phase) => {
    const project = { path: `/somewhere/retry-${phase}-refresh-canceled` };
    const creations = new ProjectCreations();
    const first = makeRecorder({}, phase === 'installing'
      ? { install: { outcome: 'failed', manager: 'bun', detail: 'boom' } }
      : { start: { kind: 'turn-ended' } });
    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');
    expect(failed.phase).toBe(phase);

    let markRefreshing: () => void = () => undefined;
    const refreshing = new Promise<void>((resolve) => {
      markRefreshing = resolve;
    });
    let releaseRefresh: () => void = () => undefined;
    const refreshed = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const second = makeRecorder();
    second.deps.refreshEnvironment = async () => {
      second.calls.push('refreshEnvironment');
      markRefreshing();
      await refreshed;
    };

    const retried = creations.retry('tab-1', second.deps);
    expect(retried).toBeDefined();
    await refreshing;
    expect(creations.stateFor('tab-1')?.kind).toBe(phase);
    expect(second.calls).toEqual([`emit:${phase}`, 'refreshEnvironment']);

    const canceled = creations.cancel('tab-1');
    releaseRefresh();

    expect(await canceled).toEqual({ kind: 'canceled' });
    expect(await retried).toEqual({ kind: 'canceled' });
    expect(creations.stateFor('tab-1')?.kind).toBe('canceled');
    expect(second.installed).toEqual([]);
    expect(second.intents).toEqual([]);
    expect(second.calls).toEqual([`emit:${phase}`, 'refreshEnvironment', 'emit:canceled']);
  });

  it('after a copying failure, rolls the cut’s residue back, then plans and copies again', async () => {
    useOwnWorkspaceRoot('retry-copying');
    const project = sharedProject();
    const creations = new ProjectCreations();
    let residue: ReadyWorkspacePlan | undefined;
    const first = makeRecorder(
      {
        fabricate: async (plan) => {
          residue = plan;
          await realFabricate(plan);
          throw new Error('post-cut explosion');
        },
      },
      { cut: 'real' },
    );
    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');
    expect(failed.phase).toBe('copying');
    if (!residue) throw new Error('the cut never ran');
    const cut = residue;
    expect(existsSync(cut.workspacePath)).toBe(true);

    const second = makeRecorder({}, { cut: 'real' });
    const recordedRollback = second.deps.rollback;
    let residueAtRollback: { worktree: boolean; branch: string } | undefined;
    second.deps.rollback = async (plan) => {
      await recordedRollback(plan);
      residueAtRollback = {
        worktree: existsSync(cut.workspacePath),
        branch: gitOutput(project.path, ['branch', '--list', cut.branchName]).trim(),
      };
    };
    const state = await creations.retry('tab-1', second.deps);

    expect(state?.kind).toBe('live');
    expect(second.calls.slice(0, 5)).toEqual(['rollback', 'emit:planning', 'plan', 'emit:copying', 'fabricate']);
    expect(second.rolledBack.map((plan) => plan.workspacePath)).toEqual([cut.workspacePath]);
    expect(residueAtRollback).toEqual({ worktree: false, branch: '' });
  });

  it('after a LOST claim on a folder another tab is copying, rolls nothing back — the winner keeps its bucket, worktree and card', async () => {
    useOwnWorkspaceRoot('retry-lost-claim');
    const folder = makeCopySourceDir({ name: 'retry-lost-claim' });
    const creations = new ProjectCreations();
    let releaseWinner: () => void = () => undefined;
    const winnerHeld = new Promise<void>((resolve) => {
      releaseWinner = resolve;
    });
    let cutDone: () => void = () => undefined;
    const winnerCut = new Promise<void>((resolve) => {
      cutDone = resolve;
    });
    const registerForReal = (workspace: WorkspaceCreated): void => {
      rememberProject(workspace);
      completeCopiedRegistration(workspace);
    };
    let winnerPlan: ReadyWorkspacePlan | undefined;
    const winner = makeRecorder(
      {
        register: registerForReal,
        fabricate: async (plan) => {
          winnerPlan = plan;
          const result = await realFabricate(plan);
          cutDone();
          await winnerHeld;
          return result;
        },
      },
      { cut: 'real' },
    );
    const loser = makeRecorder({ register: registerForReal }, { cut: 'real' });

    const winning = creations.start('tab-1', { sourcePath: folder.path, entryPoint: 'projects' }, winner.deps);
    await winnerCut;
    const lost = expectKind(await creations.start('tab-2', { sourcePath: folder.path, entryPoint: 'projects' }, loser.deps), 'failed');
    expect(lost.phase).toBe('copying');
    expect(lost.detail).toContain('already being made');
    releaseWinner();
    const won = expectKind(await winning, 'live');
    if (!winnerPlan) throw new Error('the winner never cut');
    const bucket = copiedBucket(winnerPlan);

    const retried = await creations.retry('tab-2', loser.deps);

    expect(retried?.kind).toBe('refused');
    if (retried?.kind === 'refused') expect(retried.reason).toBe('already-copied');
    expect(loser.calls).not.toContain('rollback');
    expect(loser.rolledBack).toEqual([]);
    expect(existsSync(bucket.source)).toBe(true);
    expect(existsSync(won.workspace.workspacePath)).toBe(true);
    expect(gitOutput(bucket.source, ['rev-list', '--count', 'main']).trim()).toBe('1');
    expect(knownProject(won.workspace.workspacePath)).toBeDefined();
    expect(listWorkspaces()).toHaveLength(1);
  });

  it('answers undefined for a tab that is running, refused, or unknown — nothing to retry', async () => {
    const creations = new ProjectCreations();
    expect(creations.retry('tab-9', makeRecorder().deps)).toBeUndefined();

    const refused = makeRecorder(refusedPlan({ kind: 'refused', reason: 'no-base-ref' }));
    await creations.start('tab-1', { sourcePath: '/nope/repo', entryPoint: 'projects' }, refused.deps);
    expect(creations.retry('tab-1', makeRecorder().deps)).toBeUndefined();
  });
});

describe('STUDIO_SETUP_FAIL_AT — the harness door fails a stage once', () => {
  it('fails the named stage on the first pass and lets Retry through', async () => {
    process.env['STUDIO_SETUP_FAIL_AT'] = 'installing';
    const project = { path: '/somewhere/fail-at' };
    const creations = new ProjectCreations();
    const first = makeRecorder();

    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');
    expect(failed.phase).toBe('installing');
    expect(failed.detail).toContain('STUDIO_SETUP_FAIL_AT');
    expect(first.calls).not.toContain('install');

    const second = makeRecorder();
    expect((await creations.retry('tab-1', second.deps))?.kind).toBe('live');
    expect(second.calls).toContain('install');
  });

  it('touches nothing when it names a stage the sequence never reaches', async () => {
    process.env['STUDIO_SETUP_FAIL_AT'] = 'starting';
    const project = { path: '/somewhere/fail-at-unset' };
    const recorder = makeRecorder();

    const state = await createProject({ sourcePath: project.path, comfort: 'design', entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('ready');
  });
});

describe('ProjectCreations — one creation per tab', () => {
  function heldRecorder(): { recorder: Recorder; release: () => void; cuts: () => number } {
    let release: () => void = () => undefined;
    let cuts = 0;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        cuts += 1;
        await held;
        return fakeCut(plan);
      },
    });
    return { recorder, release, cuts: () => cuts };
  }

  it('joins a second start on the same tab rather than cutting twice', async () => {
    const project = { path: '/somewhere/join' };
    const creations = new ProjectCreations();
    const { recorder, release, cuts } = heldRecorder();
    const request: ProjectCreateRequest = { sourcePath: project.path, entryPoint: 'projects' };

    const first = creations.start('tab-1', request, recorder.deps);
    const second = creations.start('tab-1', request, recorder.deps);
    expect(second).toBe(first);
    release();

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(cuts()).toBe(1);
    expect(recorder.registered).toHaveLength(1);
  });

  it('starts again on the same tab once the first has settled — a retry after a refusal', async () => {
    const creations = new ProjectCreations();
    const refused = makeRecorder(refusedPlan({ kind: 'refused', reason: 'no-base-ref' }));

    const first = await creations.start('tab-1', { sourcePath: '/nope/repo', entryPoint: 'projects' }, refused.deps);
    expect(first.kind).toBe('refused');

    const project = { path: '/somewhere/retry' };
    const second = makeRecorder();
    const state = await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, second.deps);

    expect(state.kind).toBe('live');
    expect(second.calls.filter((call) => call === 'fabricate')).toHaveLength(1);
  });

  it('keeps two tabs apart — neither joins the other', async () => {
    const project = { path: '/somewhere/two-tabs' };
    const creations = new ProjectCreations();
    const one = makeRecorder();
    const two = makeRecorder();

    const [a, b] = await Promise.all([
      creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, one.deps),
      creations.start('tab-2', { sourcePath: project.path, entryPoint: 'projects' }, two.deps),
    ]);

    expect(expectKind(a, 'live').workspace.workspacePath).not.toBe(expectKind(b, 'live').workspace.workspacePath);
    expect(one.calls.filter((call) => call === 'fabricate')).toHaveLength(1);
    expect(two.calls.filter((call) => call === 'fabricate')).toHaveLength(1);
  });

  it('answers the live phase while it runs, and the terminal state after', async () => {
    const project = { path: '/somewhere/state-for' };
    const creations = new ProjectCreations();
    const { recorder, release } = heldRecorder();
    let reachedCopying: () => void = () => undefined;
    const copying = new Promise<void>((resolve) => {
      reachedCopying = resolve;
    });
    const deps: ProjectCreateDeps = {
      ...recorder.deps,
      emit: (state) => {
        recorder.deps.emit(state);
        if (state?.kind === 'copying') reachedCopying();
      },
    };

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, deps);
    expect(creations.stateFor('tab-1')?.kind).toBe('planning');

    await copying;
    expect(creations.stateFor('tab-1')?.kind).toBe('copying');

    release();
    await done;
    expect(creations.stateFor('tab-1')?.kind).toBe('live');
  });

  it('forgets a tab, so a reused id inherits nothing', async () => {
    const project = { path: '/somewhere/forget' };
    const creations = new ProjectCreations();
    const recorder = makeRecorder();

    await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);
    expect(creations.stateFor('tab-1')).toBeDefined();

    creations.forget('tab-1');
    expect(creations.stateFor('tab-1')).toBeUndefined();
  });

  it('cancels a tab mid-flight and answers only once the rollback has run', async () => {
    const project = { path: '/somewhere/cancel-tab' };
    const creations = new ProjectCreations();
    let cut: ReadyWorkspacePlan | undefined;
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        cut = plan;
        const result = fakeCut(plan);
        void creations.cancel('tab-1');
        return result;
      },
    });

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);
    const state = await done;

    expect(state.kind).toBe('canceled');
    if (!cut) throw new Error('the cut never ran');
    expect(recorder.rolledBack).toEqual([cut]);
  });

  it('cancelling a tab with no creation answers undefined', async () => {
    const creations = new ProjectCreations();
    expect(await creations.cancel('tab-9')).toBeUndefined();
  });
});

describe('dismiss — the failed row can be closed once a project stands behind it (ONL-2363)', () => {
  it('forgets a failed install, emits the cleared record, and leaves Retry nothing to re-enter', async () => {
    process.env['STUDIO_SETUP_FAIL_AT'] = 'installing';
    const project = { path: '/somewhere/dismiss-failed' };
    const creations = new ProjectCreations();
    const first = makeRecorder();
    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');
    expect(failed.workspace).toBeDefined();

    const second = makeRecorder();
    expect(creations.dismiss('tab-1', second.deps)).toBe(true);

    expect(creations.stateFor('tab-1')).toBeUndefined();
    expect(second.calls).toEqual(['emit:cleared']);
    expect(creations.retry('tab-1', makeRecorder().deps)).toBeUndefined();
  });

  it('is a no-op on a creation in flight — a Retry that re-entered installing keeps painting', async () => {
    const project = { path: '/somewhere/dismiss-in-flight' };
    const creations = new ProjectCreations();
    const first = makeRecorder({}, { install: { outcome: 'failed', manager: 'bun', detail: 'boom' } });
    expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');

    const held = makeRecorder({}, { holdInstall: true });
    const retried = creations.retry('tab-1', held.deps);
    expect(creations.stateFor('tab-1')?.kind).toBe('installing');

    const third = makeRecorder();
    expect(creations.dismiss('tab-1', third.deps)).toBe(false);
    expect(third.calls).toEqual([]);
    expect(creations.stateFor('tab-1')?.kind).toBe('installing');

    await creations.cancel('tab-1');
    expect((await retried)?.kind).toBe('canceled');
  });

  it('keeps a pre-landing failure — no project, so Retry stays the only way out', async () => {
    const project = { path: '/somewhere/dismiss-copying' };
    const creations = new ProjectCreations();
    const first = makeRecorder({ fabricate: () => Promise.reject(new Error('disk full')) });
    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps), 'failed');
    expect(failed.phase).toBe('copying');

    const second = makeRecorder();
    expect(creations.dismiss('tab-1', second.deps)).toBe(false);
    expect(second.calls).toEqual([]);
    expect(creations.stateFor('tab-1')?.kind).toBe('failed');
  });

  it('does not throw for a tab with no creation', () => {
    const creations = new ProjectCreations();
    expect(creations.dismiss('tab-9', makeRecorder().deps)).toBe(false);
  });
});

describe("createLabel — what the tab's chip says, phase by phase (ONL-2244)", () => {
  const workspace = { workspaceName: 'teal-osprey' } as WorkspaceCreated;

  it('names the source repo the moment the press lands', () => {
    expect(createLabel({ kind: 'planning', sourceRepoName: 'react-project-v1' })).toBe(
      'react-project-v1',
    );
  });

  it('swaps to the drawn project name once the plan answers', () => {
    expect(
      createLabel({ kind: 'copying', sourceRepoName: 'react-project-v1', workspaceName: 'teal-osprey' }),
    ).toBe('teal-osprey');
  });

  it('keeps the project name through the landing and every phase after it, so the chip does not flicker back', () => {
    expect(createLabel({ kind: 'ready', workspace })).toBe('teal-osprey');
    expect(createLabel({ kind: 'installing', workspace })).toBe('teal-osprey');
    expect(createLabel({ kind: 'starting', workspace })).toBe('teal-osprey');
    expect(createLabel({ kind: 'live', workspace })).toBe('teal-osprey');
    expect(createLabel({ kind: 'failed', sourceRepoName: 'repo', phase: 'installing', workspace })).toBe('teal-osprey');
  });

  it('falls back to the repo on a refusal or a pre-landing failure — the tab stays and must still say what it tried', () => {
    expect(createLabel({ kind: 'refused', sourceRepoName: 'repo', reason: 'no-base-ref' })).toBe('repo');
    expect(createLabel({ kind: 'failed', sourceRepoName: 'repo', phase: 'copying' })).toBe('repo');
  });

  it('offers no name for a cancelled creation — the tab is going away', () => {
    expect(createLabel({ kind: 'canceled' })).toBeUndefined();
  });
});

describe('release — giving a creation up (ONL-2244)', () => {
  it('drops the record SYNCHRONOUSLY, so a band redraw cannot keep naming the project', async () => {
    const project = { path: '/somewhere/release-now' };
    const creations = new ProjectCreations();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        await held;
        return fakeCut(plan);
      },
    });

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);
    expect(creations.stateFor('tab-1')).toBeDefined();

    creations.release('tab-1');
    expect(creations.stateFor('tab-1')).toBeUndefined();

    release();
    expect((await done).kind).toBe('canceled');
  });

  it('rolls the worktree back, so a given-up creation leaves no phantom project', async () => {
    const project = { path: '/somewhere/release-rollback' };
    const creations = new ProjectCreations();
    let cut: ReadyWorkspacePlan | undefined;
    const recorder = makeRecorder({
      fabricate: async (plan) => {
        cut = plan;
        const result = fakeCut(plan);
        creations.release('tab-1');
        return result;
      },
    });

    const state = await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('canceled');
    expect(recorder.registered).toEqual([]);
    if (!cut) throw new Error('the cut never ran');
    expect(recorder.rolledBack).toEqual([cut]);
  });

  it("a released creation settling late leaves the tab's NEXT creation untouched — its state, and its Retry", async () => {
    const project = { path: '/somewhere/release-late-emit' };
    const creations = new ProjectCreations();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = makeRecorder({
      fabricate: async (plan) => {
        await held;
        return fakeCut(plan);
      },
    });
    const firstDone = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, first.deps);
    creations.release('tab-1');

    const second = makeRecorder({}, { install: { outcome: 'failed', manager: 'bun', detail: 'install exploded' } });
    const failed = expectKind(await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, second.deps), 'failed');
    expect(failed.phase).toBe('installing');

    release();
    expect((await firstDone).kind).toBe('canceled');
    expect(first.states.at(-1)?.kind).toBe('canceled');

    expect(creations.stateFor('tab-1')).toEqual(failed);
    const retried = await creations.retry('tab-1', makeRecorder().deps);
    expect(retried?.kind).toBe('live');
  });

  it('is a no-op on a tab with no creation — the close path calls it unconditionally', () => {
    const creations = new ProjectCreations();
    expect(() => creations.release('tab-9')).not.toThrow();
    expect(creations.stateFor('tab-9')).toBeUndefined();
  });
});

describe("appProjectCreateDeps — the announcement goes to the view that asked", () => {
  interface ViewSink {
    id: number;
    isDestroyed(): boolean;
    send(channel: string, payload?: unknown): void;
    once(event: string, listener: () => void): void;
    received: { channel: string; payload?: unknown }[];
  }
  let nextViewId = 9_000;
  function viewSink(): ViewSink {
    const received: { channel: string; payload?: unknown }[] = [];
    nextViewId += 1;
    return {
      id: nextViewId,
      received,
      isDestroyed: () => false,
      send: (channel, payload) => {
        received.push({ channel, payload });
      },
      once: () => undefined,
    };
  }

  afterEach(() => {
    setRendererSource(everyRenderer);
  });

  it('announces to the asker alone, while the projects list changes for every view', () => {
    useOwnWorkspaceRoot('announce');
    const asker = viewSink();
    const bystander = viewSink();
    setRendererSource(() => [asker, bystander] as unknown as WebContents[]);
    const workspace: WorkspaceCreated = {
      workspacePath: join(process.env['STUDIO_WORKSPACE_ROOT'] ?? '', 'announce', 'main'),
      workspaceName: 'main',
      branchName: 'test/main',
      baseBranch: 'main',
      sourceRepoName: 'announce-source',
      sourcePath: '/somewhere/announce-source',
      sourceRepoRoot: '/somewhere/announce-source',
      repoIdentity: 'announce-repo',
      copiedEnvFiles: [],
    };

    appProjectCreateDeps(asker as unknown as WebContents, () => undefined).register(workspace);

    expect(asker.received.filter((sent) => sent.channel === IPC_EMIT.workspaceCreated)).toEqual([
      { channel: IPC_EMIT.workspaceCreated, payload: workspace },
    ]);
    expect(bystander.received.map((sent) => sent.channel)).not.toContain(IPC_EMIT.workspaceCreated);
    for (const view of [asker, bystander]) {
      expect(view.received.map((sent) => sent.channel)).toContain(IPC_EMIT.workspacesChanged);
    }
  });

  it('registers the asking view for the cwd BEFORE starting the session, so the announce and the welcome have somewhere to go', () => {
    const asker = viewSink();
    const cwd = join(process.env['STUDIO_WORKSPACE_ROOT'] ?? '', 'register-first', 'main');
    expect(workspaceOf(asker.id)).toBeUndefined();

    const deps = appProjectCreateDeps(asker as unknown as WebContents, () => undefined);
    const started = deps.startSession(cwd);

    expect(workspaceOf(asker.id)).toBe(cwd);
    unregisterView(asker as unknown as WebContents);
    return started;
  });
});

function heldInstall(): { recorder: Recorder; reached: Promise<void>; finish: () => void } {
  let arrive: () => void = () => undefined;
  const reached = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const recorder = makeRecorder({
    install: async () => {
      arrive();
      await held;
      return { outcome: 'installed' } as InstallOutcome;
    },
  });
  return { recorder, reached, finish: () => release() };
}

describe("inFlight is the record's own isSettled, not its presence", () => {
  it('is true while the cut runs and false once it lands', async () => {
    const project = { path: '/somewhere/inflight-live' };
    const creations = new ProjectCreations();
    const held = heldInstall();

    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, held.recorder.deps);
    await held.reached;

    expect(creations.inFlight('tab-1')).toBe(true);

    held.finish();
    await done;

    expect(creations.inFlight('tab-1')).toBe(false);
    expect(creations.stateFor('tab-1')).toBeDefined();
  });

  it('is false after the terminal ready of a design-comfort cut', async () => {
    const project = { path: '/somewhere/inflight-design' };
    const creations = new ProjectCreations();
    const recorder = makeRecorder();

    const state = await creations.start(
      'tab-1',
      { sourcePath: project.path, comfort: 'design', entryPoint: 'projects' },
      recorder.deps,
    );

    expect(state.kind).toBe('ready');
    expect(creations.inFlight('tab-1')).toBe(false);
    expect(creations.stateFor('tab-1')).toBeDefined();
  });

  it('is false for a settled refusal, whose record never goes away', async () => {
    const creations = new ProjectCreations();
    const recorder = makeRecorder(refusedPlan({ kind: 'refused', reason: 'no-base-ref' }));

    const state = await creations.start('tab-1', { sourcePath: '/nowhere', entryPoint: 'projects' }, recorder.deps);

    expect(state.kind).toBe('refused');
    expect(creations.inFlight('tab-1')).toBe(false);
    expect(creations.stateFor('tab-1')).toBeDefined();
  });

  it('is false for a tab that never had a cut', () => {
    expect(new ProjectCreations().inFlight('tab-9')).toBe(false);
  });
});

describe('what the host decides from a real creation record (ONL-2209, ONL-2210, ONL-2244)', () => {
  const decide = (creations: ProjectCreations, tabId: string, workspacePath?: string) =>
    tabDecisions({
      isWorking: false,
      status: undefined,
      ...(workspacePath === undefined ? {} : { workspacePath }),
      isCreating: creations.inFlight(tabId),
      hasCreation: creations.stateFor(tabId) !== undefined,
    });

  it('a landed tab closes quietly, cools, and is still told what it is', async () => {
    const project = { path: '/somewhere/wiring-landed' };
    const creations = new ProjectCreations();
    const recorder = makeRecorder();

    const state = await creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, recorder.deps);
    const workspace = expectKind(state, 'live').workspace;
    const decided = decide(creations, 'tab-1', workspace.workspacePath);

    expect(decided.close.needsConfirm).toBe(false);
    expect(decided.isBusy).toBe(false);
    expect(needsTelling({ wasCold: true, tookSpare: false, wasWarmedCold: false, isCreating: creations.inFlight('tab-1') })).toBe(true);
  });

  it('a REFUSED cut keeps its chip, with no worktree to earn it (ONL-2244)', async () => {
    const creations = new ProjectCreations();
    const recorder = makeRecorder(refusedPlan({ kind: 'refused', reason: 'no-base-ref' }));

    await creations.start('tab-1', { sourcePath: '/nowhere', entryPoint: 'projects' }, recorder.deps);
    const decided = decide(creations, 'tab-1');

    expect(decided.purpose).toBe('project');
    expect(decided.close.needsConfirm).toBe(false);
    expect(decided.isBusy).toBe(false);
  });

  it('a tab mid-cut confirms on close, refuses to cool, and is left to its cut', async () => {
    const project = { path: '/somewhere/wiring-inflight' };
    const creations = new ProjectCreations();
    const held = heldInstall();
    const done = creations.start('tab-1', { sourcePath: project.path, entryPoint: 'projects' }, held.recorder.deps);
    await held.reached;
    const decided = decide(creations, 'tab-1');

    expect(decided.close).toEqual({ needsConfirm: true, losses: ['creation'] });
    expect(decided.isBusy).toBe(true);
    expect(needsTelling({ wasCold: true, tookSpare: false, wasWarmedCold: false, isCreating: creations.inFlight('tab-1') })).toBe(false);

    held.finish();
    await done;
  });
});
