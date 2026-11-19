import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import {
  cleanupTempFixtures,
  gitOutput as sh,
  makeGitRepo,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import type { WorkspaceCreated } from '@studio/events';
import { addWorktree, branchExists, renameBranch } from './git.js';
import { observeTabSignals, resetTabSignals } from '../tabs/signals.js';
import {
  normalizeProjectName,
  renameProjectByAgent,
  renameProjectByUser,
  renameTargetFor,
  type RenameDeps,
} from './rename.js';
import { knownProject, rememberProject, renameProject, resetWorkspaceCache } from './store.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

async function project(
  name: string,
  overrides: Partial<WorkspaceCreated> = {},
  git?: 'real',
): Promise<{ repo: string; worktree: string }> {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: `rename-${name}` });
  resetWorkspaceCache();
  const branchName = overrides.branchName ?? 'fixture/teal-skylark';
  let repo: string;
  let worktree: string;
  if (git === 'real') {
    const made = makeGitRepo({ name: `rename-${name}`, seedFile: 'app.ts' });
    repo = made.path;
    worktree = join(made.root, 'worktree');
    const added = await addWorktree({ root: repo, worktreePath: worktree, branch: branchName, startPoint: 'origin/main' });
    expect(added.ok).toBe(true);
  } else {
    repo = `/somewhere/${name}`;
    worktree = makeDirWithFiles({ name: `rename-${name}` });
  }
  rememberProject({
    workspacePath: worktree,
    workspaceName: 'teal-skylark',
    branchName,
    baseBranch: 'main',
    sourceRepoName: 'app',
    sourcePath: repo,
    sourceRepoRoot: repo,
    repoIdentity: `fixture/${name}`,
    copiedEnvFiles: [],
    ...overrides,
  });
  return { repo, worktree };
}

interface Recorder extends RenameDeps {
  captured: { event: string; properties: Record<string, unknown> }[];
  moves: { worktree: string; target: string }[];
}

function recorder(git?: 'real'): Recorder {
  const captured: Recorder['captured'] = [];
  const moves: Recorder['moves'] = [];
  return {
    captured,
    moves,
    renameBranch: async (worktree, target) => {
      moves.push({ worktree, target });
      return git === 'real' ? renameBranch(worktree, target) : { ok: true, branch: target, moved: true };
    },
    capture: (event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    },
  };
}

describe('normalizeProjectName and renameTargetFor', () => {
  it('can name a project whose saved branch name is missing', async () => {
    const { worktree } = await project('missing-branch', { branchName: undefined });
    const deps = recorder();
    const result = await renameProjectByAgent(worktree, 'Landing Page', deps);
    expect(result.ok).toBe(true);
    expect(deps.moves[0]?.target).toMatch(/\/landing-page$/);
    expect(knownProject(worktree)?.displayName).toBe('Landing Page');
  });

  it('trims, collapses whitespace, and cuts a fourth word', () => {
    expect(normalizeProjectName('  Pricing   Page  ')).toBe('Pricing Page');
    expect(normalizeProjectName('Acme Store Pricing Page')).toBe('Acme Store Pricing');
    expect(normalizeProjectName('\n\t ')).toBe('');
  });

  it('keeps the current handle — the ladder and the blank handle alike — and slugs the name', () => {
    expect(renameTargetFor('ldavinci/teal-skylark', 'Pricing Page')).toBe('ldavinci/pricing-page');
    expect(renameTargetFor('onlook/teal-skylark', 'Pricing Page')).toBe('onlook/pricing-page');
    expect(renameTargetFor('acme-org/teal-skylark', 'Café Menu!')).toBe('acme-org/caf-menu');
    expect(renameTargetFor('ldavinci/teal-skylark', '!!!')).toBeUndefined();
    expect(renameTargetFor('main', 'Pricing Page')).toBe('onlook/pricing-page');
  });
});

describe('renameProjectByAgent', () => {
  it('renames a provisional copy once, retaining the user-wins gate', async () => {
    const { worktree } = await project('provisional-copy', { displayName: 'Landing copy', displayNameSource: 'provisional' });
    const deps = recorder();
    expect((await renameProjectByAgent(worktree, 'Pricing Page', deps)).ok).toBe(true);
    expect(knownProject(worktree)?.displayNameSource).toBe('agent');
    expect((await renameProjectByAgent(worktree, 'Second Name', deps)).ok).toBe(false);
    expect(deps.moves).toHaveLength(1);
    renameProject(worktree, 'My Copy', 'user');
    expect((await renameProjectByAgent(worktree, 'Third Name', deps)).ok).toBe(false);
    expect(knownProject(worktree)?.displayName).toBe('My Copy');
  });

  it('renames an unnamed project as agent, moves the branch, records the move, and captures no name', async () => {
    const { repo, worktree } = await project('fresh', {}, 'real');
    const deps = recorder('real');

    const outcome = await renameProjectByAgent(worktree, '  Pricing   Page  Redesign  Two ', deps);

    expect(outcome).toEqual({ ok: true, name: 'Pricing Page Redesign', branchName: 'fixture/pricing-page-redesign' });
    const stored = knownProject(worktree);
    expect(stored?.displayName).toBe('Pricing Page Redesign');
    expect(stored?.displayNameSource).toBe('agent');
    expect(stored?.branchName).toBe('fixture/pricing-page-redesign');
    expect(sh(worktree, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('fixture/pricing-page-redesign');
    expect(await branchExists(repo, 'fixture/teal-skylark')).toBe(false);
    expect(() => sh(worktree, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toThrow();
    expect(deps.captured).toEqual([
      {
        event: 'project_renamed',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          by: 'agent',
        },
      },
    ]);
    expect(JSON.stringify(deps.captured)).not.toContain('Pricing');
    expect(JSON.stringify(deps.captured)).not.toContain('fixture/');
  });

  it('refuses a project the user named, and leaves the record and branch alone', async () => {
    const { worktree } = await project('user-named');
    renameProject(worktree, 'My Store', 'user');
    const deps = recorder();

    const outcome = await renameProjectByAgent(worktree, 'Pricing Page', deps);

    expect(outcome.ok).toBe(false);
    expect(knownProject(worktree)?.displayName).toBe('My Store');
    expect(knownProject(worktree)?.displayNameSource).toBe('user');
    expect(deps.moves).toEqual([]);
    expect(deps.captured).toEqual([]);
  });

  it("a displayName with no source is the user's — a rename from before the field existed refuses", async () => {
    const { worktree } = await project('pre-source', { displayName: 'Mine' });
    const deps = recorder();

    const outcome = await renameProjectByAgent(worktree, 'Pricing Page', deps);

    expect(outcome.ok).toBe(false);
    expect(knownProject(worktree)?.displayName).toBe('Mine');
    expect(knownProject(worktree)?.displayNameSource).toBeUndefined();
    expect(deps.moves).toEqual([]);
    expect(deps.captured).toEqual([]);
  });

  it('refuses a second agent rename — the tool runs at most once', async () => {
    const { worktree } = await project('twice');
    const deps = recorder();
    expect((await renameProjectByAgent(worktree, 'Pricing Page', deps)).ok).toBe(true);

    const second = await renameProjectByAgent(worktree, 'Checkout Flow', deps);

    expect(second.ok).toBe(false);
    expect(knownProject(worktree)?.displayName).toBe('Pricing Page');
    expect(deps.moves).toEqual([{ worktree, target: 'fixture/pricing-page' }]);
    expect(deps.captured).toHaveLength(1);
  });

  it('refuses an empty name and a name with nothing to slug, and an unknown directory', async () => {
    const { worktree } = await project('empty');
    const deps = recorder();

    expect((await renameProjectByAgent(worktree, '   ', deps)).ok).toBe(false);
    expect((await renameProjectByAgent(worktree, '!!!', deps)).ok).toBe(false);
    expect((await renameProjectByAgent(join(worktree, '..', 'elsewhere'), 'Pricing', deps)).ok).toBe(false);
    expect(knownProject(worktree)?.displayNameSource).toBeUndefined();
    expect(deps.captured).toEqual([]);
  });

  it('the record follows the branch the ref store answered, suffix and all', async () => {
    const { worktree } = await project('collision');
    const deps = { ...recorder(), renameBranch: async () => ({ ok: true as const, branch: 'fixture/pricing-page-2', moved: true }) };

    const outcome = await renameProjectByAgent(worktree, 'Pricing Page', deps);

    expect(outcome).toEqual({ ok: true, name: 'Pricing Page', branchName: 'fixture/pricing-page-2' });
    expect(knownProject(worktree)?.branchName).toBe('fixture/pricing-page-2');
  });

  it('a branch move that fails keeps the name and the old branch on the record', async () => {
    const { worktree } = await project('move-fails');
    const deps = { ...recorder(), renameBranch: async () => ({ ok: false as const, detail: 'git said no' }) };

    const outcome = await renameProjectByAgent(worktree, 'Pricing Page', deps);

    expect(outcome).toEqual({ ok: true, name: 'Pricing Page', branchName: 'fixture/teal-skylark' });
    expect(knownProject(worktree)?.displayNameSource).toBe('agent');
    expect(knownProject(worktree)?.branchName).toBe('fixture/teal-skylark');
  });
});

describe('renameProjectByUser', () => {
  it('renames the project and refreshes the tab labels that read it', async () => {
    const { worktree } = await project('user');
    let labelRefreshes = 0;
    observeTabSignals({
      workspace: () => {},
      working: () => {},
      status: () => {},
      closeActive: () => {},
      labels: () => {
        labelRefreshes += 1;
      },
      command: () => false,
      backgroundTab: () => undefined,
      settings: () => undefined,
    });
    try {
      renameProjectByUser(worktree, 'Pricing Page');
    } finally {
      resetTabSignals();
    }

    expect(knownProject(worktree)?.displayName).toBe('Pricing Page');
    expect(knownProject(worktree)?.displayNameSource).toBe('user');
    expect(labelRefreshes).toBe(1);
  });
});
