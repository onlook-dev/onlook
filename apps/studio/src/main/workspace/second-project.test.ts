import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import {
  creationWorkspace,
  newProjectTargetFor,
  type ProjectCreateState,
  type WorkspaceCreated,
  type WorkspacePlan,
} from '@studio/events';
import {
  cleanupTempFixtures,
  gitOutput,
  makeCopySourceDir,
  makeGitRepo,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { canonicalPath } from '../lib/canonical-path.js';
import { resetCanvasRegistryCache } from '../canvas/registry.js';
import { userEnv } from '../env/shell-env.js';
import { resetServerBookCache } from '../server/book.js';
import { STATIC_ADAPTER } from '../starter/adapters/static.js';
import { createFromSource } from '../tabs/create-from.js';
import { observeTabSignals, resetTabSignals } from '../tabs/signals.js';
import { createProjectTabByAgent } from './agent-tab.js';
import { completeCopiedRegistration } from './copy.js';
import { createBlankProject, type BlankCreateDeps } from './create-blank.js';
import { createProject, type ProjectCreateRequest } from './create-project.js';
import { fabricateFromPlan, planWorkspace, rollbackFromPlan } from './index.js';
import {
  listWorkspaces,
  rememberProject,
  renameWorkspace,
  resetWorkspaceCache,
  workspaceOrigin,
} from './store.js';

setDefaultTimeout(30_000);

let createdSources: unknown[] = [];

beforeAll(async () => {
  await userEnv();
});

afterEach(() => {
  resetTabSignals();
});

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `second-project-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetWorkspaceCache();
  resetCanvasRegistryCache();
  resetServerBookCache();
  createdSources = [];
  return root;
}

function plusSource(first: WorkspaceCreated): string {
  const source = createFromSource({ workspacePath: first.workspacePath });
  if (source === undefined) throw new Error('the tab\u2019s + resolved no source');
  return source;
}

function newProjectSourceOf(first: WorkspaceCreated): string {
  const target = newProjectTargetFor({ kind: 'workspace', repoIdentity: first.repoIdentity }, listWorkspaces());
  if (target.kind === 'pick') throw new Error('New Project found no workspace to cut from');
  return target.sourcePath;
}

function listenForBackgroundTab(land: (sourcePath: string) => Promise<WorkspaceCreated | null>): void {
  observeTabSignals({
    workspace: () => undefined,
    working: () => undefined,
    status: () => undefined,
    closeActive: () => undefined,
    labels: () => undefined,
    command: () => false,
    backgroundTab: land,
    settings: () => undefined,
  });
}

type Kind = 'blank' | 'copied' | 'git' | 'subfolder' | 'moved';

function seeded(kind: Kind, root: string): WorkspaceCreated {
  const bucket = join(root, 'bucket', 'source');
  const userFolder = join(root, 'user', 'site');
  const common = {
    workspacePath: join(root, 'first'),
    workspaceName: 'first',
    branchName: 'me/first',
    baseBranch: 'main',
    sourceRepoName: 'site',
    repoIdentity: `identity-${kind}`,
    copiedEnvFiles: [],
  };
  const sources: Record<Kind, Pick<WorkspaceCreated, 'origin' | 'sourcePath' | 'sourceRepoRoot'>> = {
    blank: { origin: 'blank', sourcePath: bucket, sourceRepoRoot: bucket },
    copied: { origin: 'copied', sourcePath: userFolder, sourceRepoRoot: bucket },
    git: { sourcePath: userFolder, sourceRepoRoot: userFolder },
    subfolder: { sourcePath: join(userFolder, 'apps', 'web'), sourceRepoRoot: userFolder },
    moved: { sourcePath: join(userFolder, 'apps', 'gone'), sourceRepoRoot: userFolder },
  };
  const record: WorkspaceCreated = { ...common, ...sources[kind] };
  // On disk, because a source the user moved away answers its repo root instead (ONL-2480).
  if (kind !== 'moved') mkdirSync(record.sourcePath, { recursive: true });
  mkdirSync(record.sourceRepoRoot, { recursive: true });
  mkdirSync(record.workspacePath, { recursive: true });
  rememberProject(record);
  return record;
}

const CUT_FROM: Record<Kind, (first: WorkspaceCreated) => string> = {
  blank: (first) => first.sourceRepoRoot,
  copied: (first) => first.sourceRepoRoot,
  git: (first) => first.sourcePath,
  subfolder: (first) => first.sourcePath,
  moved: (first) => first.sourceRepoRoot,
};

async function agentSourceOf(first: WorkspaceCreated): Promise<string> {
  let asked: string | undefined;
  const planned = (sourcePath: string): Promise<WorkspacePlan> =>
    Promise.resolve({
      kind: 'ready',
      sourcePath,
      sourceRepoRoot: sourcePath,
      sourceRepoName: 'site',
      repoIdentity: first.repoIdentity,
      baseBranch: 'main',
      baseRef: 'main',
      baseRefSource: 'local-main',
      workspaceName: 'planned-name',
      branchName: 'me/planned-name',
      workspacePath: join(dirname(first.workspacePath), 'planned-name'),
    });
  listenForBackgroundTab((sourcePath) => {
    asked = sourcePath;
    return Promise.resolve({ ...first, workspaceName: 'landed-name', workspacePath: `${first.workspacePath}-2` });
  });
  const outcome = await createProjectTabByAgent(first.workspacePath, planned);
  if (!outcome.ok) throw new Error(`agent tool refused: ${outcome.reason}`);
  expect(outcome.workspaceName).toBe('landed-name');
  if (asked === undefined) throw new Error('the agent tool opened no tab');
  return asked;
}

const RESOLVERS = {
  "the tab's +": (first: WorkspaceCreated) => Promise.resolve(plusSource(first)),
  'New Project': (first: WorkspaceCreated) => Promise.resolve(newProjectSourceOf(first)),
  "the agent's create_project_tab": agentSourceOf,
};

describe('every way of adding a project starts from the source the first was cut from', () => {
  for (const kind of ['blank', 'copied', 'git', 'subfolder', 'moved'] as const) {
    for (const [label, resolve] of Object.entries(RESOLVERS)) {
      it(`in a ${kind} workspace, through ${label}`, async () => {
        const first = seeded(kind, useOwnWorkspaceRoot(`seeded-${kind}`));
        expect(await resolve(first)).toBe(CUT_FROM[kind](first));
      });
    }
  }
});

function create(request: ProjectCreateRequest): Promise<ProjectCreateState> {
  return createProject(request, {
    plan: planWorkspace,
    fabricate: fabricateFromPlan,
    rollback: rollbackFromPlan,
    register: (workspace) => {
      rememberProject(workspace);
      if (workspaceOrigin(workspace) === 'copied') completeCopiedRegistration(workspace);
    },
    capture: (event, properties) => {
      if (event === 'project_created') createdSources.push((properties as Record<string, unknown>)['source']);
    },
    startSession: async () => undefined,
    install: async () => ({ outcome: 'skipped' }),
    awaitIdle: async () => 'idle',
    detect: async () => ({ asks: [] }),
    awaitOpen: async () => 'open',
    awaitStart: async () => ({ kind: 'reported', port: 3000, frame: { kind: 'no-setup' } }),
    sendStartIntent: async () => true,
    authorFrame: async () => ({ kind: 'no-setup' }),
    awaitRunning: async () => 'running',
    emit: () => undefined,
  });
}

async function landed(request: ProjectCreateRequest): Promise<WorkspaceCreated> {
  const state = await create(request);
  if (state.kind !== 'ready' && state.kind !== 'live') throw new Error(`expected a landing, got ${JSON.stringify(state)}`);
  return state.workspace;
}

const BLANK_DEPS: BlankCreateDeps = {
  starter: { spawn: async () => 4310, stop: async () => undefined },
  server: {
    openProject: async () => undefined,
    report: async () => undefined,
    awaitRunning: async () => 'running',
  },
  canvas: {
    open: async () => undefined,
  },
  emitStage: () => undefined,
  adapter: async () => ({ adapter: STATIC_ADAPTER }),
  capture: () => undefined,
  announce: () => undefined,
};

async function firstProject(kind: Kind, name: string, remote = true): Promise<WorkspaceCreated> {
  useOwnWorkspaceRoot(`${kind}-${name}`);
  if (kind === 'blank') {
    const result = await createBlankProject({ entryPoint: 'onboarding' }, BLANK_DEPS);
    if (!result.ok) throw new Error(`blank project: ${JSON.stringify(result)}`);
    return result.workspace;
  }
  const folder =
    kind === 'copied'
      ? makeCopySourceDir({ name: `second-project-${name}` })
      : kind === 'subfolder'
        ? makeGitRepo({ name: `second-project-${name}`, seedFile: 'apps/web/index.js' })
        : remote
          ? makeGitRepo({ name: `second-project-${name}` })
          : makeGitRepo({ name: `second-project-${name}`, remote: false });
  const sourcePath = kind === 'subfolder' ? join(folder.path, 'apps', 'web') : folder.path;
  const first = await landed({ sourcePath, comfort: 'design', entryPoint: 'projects' });
  expect(first.origin).toBe(kind === 'copied' ? 'copied' : undefined);
  return first;
}

const throughPlus = (first: WorkspaceCreated) => landed({ sourcePath: plusSource(first), entryPoint: 'band' });

async function throughNewProject(first: WorkspaceCreated): Promise<WorkspaceCreated> {
  const plan = await planWorkspace(newProjectSourceOf(first));
  if (plan.kind !== 'ready') throw new Error(`New Project refused: ${JSON.stringify(plan)}`);
  return landed({ sourcePath: plan.sourcePath, comfort: 'design', entryPoint: 'projects' });
}

async function throughAgentTool(first: WorkspaceCreated): Promise<WorkspaceCreated> {
  let tabLanded: WorkspaceCreated | undefined;
  listenForBackgroundTab((sourcePath) =>
    create({ sourcePath, entryPoint: 'band' }).then((state) => {
      tabLanded = creationWorkspace(state);
      return tabLanded ?? null;
    }),
  );
  const outcome = await createProjectTabByAgent(first.workspacePath);
  if (!outcome.ok) throw new Error(`agent tool refused: ${outcome.reason}`);
  if (tabLanded === undefined) throw new Error('agent tool reported a tab that never landed');
  expect(outcome.workspaceName).toBe(tabLanded.workspaceName);
  return tabLanded;
}

async function expectLandsBeside(first: WorkspaceCreated, add: (first: WorkspaceCreated) => Promise<WorkspaceCreated>) {
  const [before] = listWorkspaces();
  const second = await add(first);

  expect(second.workspacePath).not.toBe(first.workspacePath);
  expect(second.repoIdentity).toBe(first.repoIdentity);
  expect(second.origin).toBe(first.origin);
  expect(second.sourcePath).toBe(first.sourcePath);
  expect(canonicalPath(second.sourceRepoRoot)).toBe(canonicalPath(first.sourceRepoRoot));
  expect(dirname(second.workspacePath)).toBe(dirname(first.workspacePath));
  expect(gitOutput(second.workspacePath, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).toBe(
    gitOutput(first.workspacePath, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
  );

  const groups = listWorkspaces();
  expect(groups).toHaveLength(1);
  expect(groups[0]?.name).toBe(before?.name);
  expect(groups[0]?.projects.map((p) => p.workspacePath)).toContain(second.workspacePath);
  expect(createdSources.at(-1)).toBe(workspaceOrigin(first));
  return second;
}

describe('a second project lands beside the first, cut by real git', () => {
  it('in a blank workspace', async () => {
    const first = await firstProject('blank', 'blank');
    await expectLandsBeside(first, throughAgentTool);
  });

  it('in a copied workspace, and a third from the second’s own +, under the name the user gave it', async () => {
    const first = await firstProject('copied', 'copied');
    renameWorkspace(first.repoIdentity, 'Lemonade site');
    const second = await expectLandsBeside(first, throughPlus);
    await expectLandsBeside(second, throughPlus);

    expect(listWorkspaces().map((w) => w.name)).toEqual(['Lemonade site']);
    expect(listWorkspaces()[0]?.projects).toHaveLength(3);
  });

  it('in a git repository with a remote', async () => {
    const first = await firstProject('git', 'remote');
    await expectLandsBeside(first, throughNewProject);
  });

  it('in a git repository without a remote', async () => {
    const first = await firstProject('git', 'local', false);
    await expectLandsBeside(first, throughAgentTool);
  });

  it('in a package imported from a subfolder, and a third from the second’s own +', async () => {
    const first = await firstProject('subfolder', 'subfolder');
    expect(first.sourcePath).not.toBe(first.sourceRepoRoot);
    const second = await expectLandsBeside(first, throughNewProject);
    await expectLandsBeside(second, throughPlus);
  });
});

describe('a copied workspace’s second project', () => {
  it('rolls back only its own worktree and branch, never the copy its siblings are cut from', async () => {
    const first = await firstProject('copied', 'rollback');
    const plan = await planWorkspace(plusSource(first));
    if (plan.kind !== 'ready') throw new Error(`refused: ${JSON.stringify(plan)}`);
    const made = await fabricateFromPlan(plan);
    expect(made.ok).toBe(true);
    expect(existsSync(plan.workspacePath)).toBe(true);

    await rollbackFromPlan(plan);

    expect(existsSync(first.workspacePath)).toBe(true);
    expect(existsSync(first.sourceRepoRoot)).toBe(true);
    expect(gitOutput(first.sourceRepoRoot, ['branch', '--list', first.branchName])).not.toBe('');
    expect(existsSync(plan.workspacePath)).toBe(false);
    expect(gitOutput(first.sourceRepoRoot, ['branch', '--list', plan.branchName])).toBe('');
  });
});
