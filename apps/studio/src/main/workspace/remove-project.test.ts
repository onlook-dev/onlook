import { afterAll, describe, expect, it } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { blankBucketPaths } from './blank.js';
import type { WorkspaceCreated } from '@studio/events';
import {
  cleanupTempFixtures,
  makeDirWithFiles,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import {
  cardName,
  isRemovingProject,
  removeProjectByUser,
  removeWorkspaceByUser,
  type RemoveFlowDeps,
  type RemoveWorkspaceFlowDeps,
  type WorkspaceRemoveAsk,
} from './remove-project.js';
import type { RemoveConfirm } from './remove-confirm.js';
import { hideRemovingProjects, visibleWorkspaces } from './workspaces-changed.js';
import {
  forgetProject,
  listWorkspaces,
  projectsOfRepo,
  rememberProject,
  renameWorkspace,
  resetWorkspaceCache,
  touchProject,
  knownProject,
  workspacePathFor,
} from './store.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function project(name: string, overrides: Partial<WorkspaceCreated> = {}): string {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: `remove-flow-${name}` });
  resetWorkspaceCache();
  const heldOrigin = overrides.origin === 'blank' || overrides.origin === 'copied' ? overrides.origin : overrides.heldOrigin;
  const repoIdentity = heldOrigin === undefined ? `fixture/${name}` : `${heldOrigin}/${name}`;
  const bucket = heldOrigin === undefined ? undefined : blankBucketPaths(repoIdentity, 'teal-skylark');
  const worktree = bucket?.worktree ?? makeDirWithFiles({ name: `remove-flow-${name}`, files: { 'app.ts': 'export {};\n' } });
  if (bucket !== undefined) {
    mkdirSync(bucket.source, { recursive: true });
    mkdirSync(worktree, { recursive: true });
    writeFileSync(`${worktree}/app.ts`, 'export {};\n');
  }
  rememberProject({
    workspacePath: worktree,
    workspaceName: 'teal-skylark',
    branchName: 'fixture/teal-skylark',
    baseBranch: 'main',
    sourceRepoName: 'app',
    sourcePath: `/somewhere/${name}`,
    sourceRepoRoot: bucket?.source ?? `/somewhere/${name}`,
    repoIdentity,
    copiedEnvFiles: [],
    ...overrides,
  });
  return worktree;
}

interface Recorder extends RemoveFlowDeps {
  asked: RemoveConfirm[];
  closed: string[];
  removed: string[];
  failures: string[];
  broadcasts: number;
  captured: { event: string; properties: Record<string, unknown> }[];
}

function recorder(
  answers: { confirm?: boolean; tabs?: boolean; removal?: Awaited<ReturnType<RemoveFlowDeps['remove']>> } = {},
): Recorder {
  const asked: RemoveConfirm[] = [];
  const closed: string[] = [];
  const removed: string[] = [];
  const failures: string[] = [];
  const captured: Recorder['captured'] = [];
  const self: Recorder = {
    asked,
    closed,
    removed,
    failures,
    broadcasts: 0,
    hide: hideRemovingProjects,
    captured,
    confirm: async (_record, choice) => {
      asked.push(choice);
      return answers.confirm ?? true;
    },
    reportFailure: async (detail) => {
      failures.push(detail);
    },
    closeTabs: async (path) => {
      closed.push(path);
      return answers.tabs ?? true;
    },
    remove: async (path) => {
      removed.push(path);
      return answers.removal ?? { ok: true, lastInGroup: true };
    },
    changed: () => {
      self.broadcasts += 1;
    },
    capture: (event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    },
  };
  return self;
}

describe('the name the confirm is given (ONL-2315)', () => {
  it('is the one the card shows, not a bare project name the user never saw', () => {
    const worktree = project('named-like-the-card');
    const shown = listWorkspaces().flatMap((group) => group.projects)[0]?.name;

    // An imported project that has never been renamed: the card prefixes its repo, so a
    // bare `workspaceName` would name something that is not on screen.
    expect(shown).toContain('teal-skylark');
    expect(shown).not.toBe('teal-skylark');
    expect(cardName(worktree)).toBe(shown);
  });

  it('answers nothing for a path the registry does not list, so the caller can fall back', () => {
    project('unlisted');
    expect(cardName('/nowhere/at/all')).toBeUndefined();
  });
});

describe('removeProjectByUser (ONL-2315)', () => {
  it('hides a confirmed project before teardown and restores it after failure (ONL-2873)', async () => {
    const worktree = project('optimistic-failure');
    const deps = recorder();
    deps.remove = async () => {
      expect(visibleWorkspaces().flatMap((group) => group.projects)).toEqual([]);
      expect(listWorkspaces().flatMap((group) => group.projects)).toHaveLength(1);
      return { ok: false, reason: 'folder-remains', detail: 'Busy' };
    };
    await removeProjectByUser(worktree, { ...deps, hide: hideRemovingProjects });
    expect(visibleWorkspaces().flatMap((group) => group.projects)).toHaveLength(1);
  });

  it('does not hide a project before confirmation or when its tab stays open (ONL-2873)', async () => {
    const worktree = project('optimistic-cancel');
    const deps = recorder({ tabs: false });
    deps.confirm = async () => {
      expect(visibleWorkspaces().flatMap((group) => group.projects)).toHaveLength(1);
      return true;
    };
    let hidden = false;
    await removeProjectByUser(worktree, { ...deps, hide: () => { hidden = true; return () => {}; } });
    expect(hidden).toBe(false);
  });

  it('refuses a directory no project claims, and asks nothing', async () => {
    const worktree = project('unknown');
    const deps = recorder();

    const outcome = await removeProjectByUser(`${worktree}-elsewhere`, deps);

    expect(outcome).toEqual({ ok: false, reason: 'unknown-project' });
    expect(deps.asked).toEqual([]);
    expect(deps.removed).toEqual([]);
  });

  it('tears nothing down when the user cancels the confirm', async () => {
    const worktree = project('cancelled');
    const deps = recorder({ confirm: false });

    const outcome = await removeProjectByUser(worktree, deps);

    expect(outcome).toEqual({ ok: false, reason: 'cancelled' });
    expect(deps.asked).toHaveLength(1);
    expect(deps.closed).toEqual([]);
    expect(deps.removed).toEqual([]);
    expect(deps.broadcasts).toBe(0);
    expect(deps.captured).toEqual([]);
  });

  it('tears nothing down when the user keeps the open tab', async () => {
    const worktree = project('held');
    const deps = recorder({ tabs: false });

    const outcome = await removeProjectByUser(worktree, deps);

    expect(outcome).toEqual({ ok: false, reason: 'tab-held' });
    expect(deps.closed).toEqual([worktree]);
    expect(deps.removed).toEqual([]);
    expect(deps.captured).toEqual([]);
  });

  it('a confirmed remove reaches the teardown with the path the registry holds', async () => {
    const worktree = project('confirmed');
    const deps = recorder();

    const outcome = await removeProjectByUser(`${worktree}/.`, deps);

    expect(outcome).toEqual({ ok: true });
    expect(deps.removed).toEqual([worktree]);
    expect(deps.broadcasts).toBe(1);
  });

  it('closes the tab before anything is deleted', async () => {
    const order: string[] = [];
    const worktree = project('ordered');
    const deps = recorder();
    deps.closeTabs = async () => {
      order.push('close');
      return true;
    };
    deps.remove = async () => {
      order.push('remove');
      return { ok: true, lastInGroup: true };
    };

    await removeProjectByUser(worktree, deps);

    expect(order).toEqual(['close', 'remove']);
  });

  it('asks about the branch in the user’s repository for an imported project', async () => {
    const worktree = project('imported');
    const deps = recorder();

    await removeProjectByUser(worktree, deps);

    expect(deps.asked[0]?.variant).toBe('imported');
    expect(deps.asked[0]?.deletesFolder).toBe(true);
  });

  it('asks about the history for the last project Studio created itself', async () => {
    const worktree = project('held-last', { origin: 'blank' });
    const deps = recorder();

    await removeProjectByUser(worktree, deps);

    expect(deps.asked[0]?.variant).toBe('held-last');
  });

  it('asks about held history for the last duplicate without changing its creation origin', async () => {
    const worktree = project('held-duplicate', { origin: 'duplicate', heldOrigin: 'copied' });
    const deps = recorder();
    await removeProjectByUser(worktree, deps);
    expect(deps.asked[0]?.variant).toBe('held-last');
    expect(knownProject(worktree)?.origin).toBe('duplicate');
    expect(deps.captured[0]?.properties['origin']).toBe('duplicate');
  });

  it('never warns that imported history will be removed because a record claims held ownership', async () => {
    const worktree = project('external-held-claim', {
      origin: 'duplicate', heldOrigin: 'blank', sourceRepoRoot: '/external/repository',
    });
    const deps = recorder();
    await removeProjectByUser(worktree, deps);
    expect(deps.asked[0]?.variant).toBe('imported');
  });

  it('asks about the shared repository while a sibling of the same group remains', async () => {
    const worktree = project('held-sibling', { origin: 'blank' });
    const founding = knownProject(worktree);
    if (founding === undefined) throw new Error('expected held founding Project');
    rememberProject({
      ...founding,
      workspacePath: workspacePathFor(founding.repoIdentity, 'rose-skylark'),
      workspaceName: 'rose-skylark',
      branchName: 'fixture/rose-skylark',
      baseBranch: 'main',
      sourceRepoName: 'app',
      sourcePath: '/somewhere/held-sibling',
      sourceRepoRoot: founding.sourceRepoRoot,
      repoIdentity: founding.repoIdentity,
      origin: 'blank',
      copiedEnvFiles: [],
    });
    const deps = recorder();

    await removeProjectByUser(worktree, deps);

    expect(deps.asked[0]?.variant).toBe('held-sibling');
  });

  it('keeps the card and names the failure when the folder will not go', async () => {
    const worktree = project('stuck');
    const deps = recorder({ removal: { ok: false, reason: 'folder-remains', detail: 'EBUSY' } });

    const outcome = await removeProjectByUser(worktree, deps);

    expect(outcome).toEqual({ ok: false, reason: 'folder-remains' });
    expect(deps.failures).toEqual(['EBUSY']);
    expect(deps.captured).toEqual([]);
  });

  it("records the teardown's own answer for last_in_group, not the one the confirm used", async () => {
    // The confirm reads the registry before the asks; by the time the folder goes a sibling may exist.
    const worktree = project('stale-group');
    const deps = recorder({ removal: { ok: true, lastInGroup: false } });

    await removeProjectByUser(worktree, deps);

    expect(deps.asked[0]?.variant).toBe('imported');
    expect(deps.captured[0]?.properties['last_in_group']).toBe(false);
  });

  it('records the removal with the hashed repo, and no path, branch or name', async () => {
    const worktree = project('telemetry', { displayName: 'Pricing Page', origin: 'blank' });
    const deps = recorder();

    await removeProjectByUser(worktree, deps);

    expect(deps.captured).toEqual([
      {
        event: 'project_removed',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          origin: 'blank',
          missing: false,
          last_in_group: true,
        },
      },
    ]);
    const shipped = JSON.stringify(deps.captured);
    expect(shipped).not.toContain('Pricing');
    expect(shipped).not.toContain('fixture/');
    expect(shipped).not.toContain(worktree);
    expect(shipped).not.toContain('teal-skylark');
  });

  it('a second remove of the same project while the first is running asks nothing and tears nothing down', async () => {
    const worktree = project('in-flight');
    const first = recorder();
    let release = (): void => {};
    first.closeTabs = async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return true;
    };

    const running = removeProjectByUser(worktree, first);
    const second = recorder();
    const outcome = await removeProjectByUser(worktree, second);

    expect(outcome).toEqual({ ok: false, reason: 'in-flight' });
    expect(second.asked).toEqual([]);
    expect(second.removed).toEqual([]);
    expect(isRemovingProject(worktree)).toBe(true);
    release();
    await running;
    expect(isRemovingProject(worktree)).toBe(false);
  });
});

type Teardown = Awaited<ReturnType<RemoveFlowDeps['remove']>>;

function sibling(name: string, label: string, overrides: Partial<WorkspaceCreated> = {}): string {
  const heldOrigin = overrides.origin === 'blank' || overrides.origin === 'copied' ? overrides.origin : overrides.heldOrigin;
  const repoIdentity = heldOrigin === undefined ? `fixture/${name}` : `${heldOrigin}/${name}`;
  const bucket = heldOrigin === undefined ? undefined : blankBucketPaths(repoIdentity, `${label}-skylark`);
  const worktree = bucket?.worktree ?? makeDirWithFiles({
    name: `remove-flow-${name}-${label}`,
    files: { 'app.ts': 'export {};\n' },
  });
  if (bucket !== undefined) mkdirSync(worktree, { recursive: true });
  rememberProject({
    workspacePath: worktree,
    workspaceName: `${label}-skylark`,
    branchName: `fixture/${label}-skylark`,
    baseBranch: 'main',
    sourceRepoName: 'app',
    sourcePath: `/somewhere/${name}`,
    sourceRepoRoot: bucket?.source ?? `/somewhere/${name}`,
    repoIdentity,
    copiedEnvFiles: [],
    ...overrides,
  });
  return worktree;
}

interface Group {
  identity: string;
  founding: string;
  second: string;
  paths: string[];
}

function threeProjects(name: string, overrides: Partial<WorkspaceCreated> = {}): Group {
  const founding = project(name, overrides);
  const second = sibling(name, 'two', overrides);
  const paths = [founding, second, sibling(name, 'three', overrides)];
  return { identity: knownProject(founding)?.repoIdentity ?? `fixture/${name}`, founding, second, paths };
}

interface WorkspaceRecorder extends RemoveWorkspaceFlowDeps {
  asked: WorkspaceRemoveAsk[];
  closed: string[];
  removed: string[];
  failures: string[];
  broadcasts: number;
  captured: { event: string; properties: Record<string, unknown> }[];
}

function workspaceRecorder(
  answers: {
    confirm?: boolean;
    tabs?: (workspacePath: string) => boolean;
    removal?: (workspacePath: string) => Teardown;
  } = {},
): WorkspaceRecorder {
  const asked: WorkspaceRemoveAsk[] = [];
  const closed: string[] = [];
  const removed: string[] = [];
  const failures: string[] = [];
  const captured: WorkspaceRecorder['captured'] = [];
  const self: WorkspaceRecorder = {
    asked,
    closed,
    removed,
    failures,
    broadcasts: 0,
    hide: hideRemovingProjects,
    captured,
    confirm: async (ask) => {
      asked.push(ask);
      return answers.confirm ?? true;
    },
    reportFailure: async (detail) => {
      failures.push(detail);
    },
    closeTabs: async (path) => {
      closed.push(path);
      return answers.tabs?.(path) ?? true;
    },
    remove: async (path) => {
      removed.push(path);
      const outcome = answers.removal?.(path) ?? { ok: true, lastInGroup: false };
      // The shipped teardown forgets the record, so the flow's own snapshot is what the loop has left.
      if (outcome.ok) forgetProject(path);
      return outcome;
    },
    changed: () => {
      self.broadcasts += 1;
    },
    capture: (event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    },
  };
  return self;
}

function tick(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 5));
}

describe('removeWorkspaceByUser (ONL-2523)', () => {
  it('hides every project together before teardown and restores only remaining projects after partial failure (ONL-2873)', async () => {
    const group = threeProjects('optimistic-group');
    let reached = 0;
    const deps = workspaceRecorder({ removal: () => {
      expect(visibleWorkspaces()).toEqual([]);
      reached += 1;
      return reached === 2 ? { ok: false, reason: 'folder-remains', detail: 'Busy' } : { ok: true, lastInGroup: false };
    } });
    deps.reportFailure = async () => {
      expect(visibleWorkspaces().flatMap((workspace) => workspace.projects)).toHaveLength(2);
    };
    await removeWorkspaceByUser(group.identity, deps);
    expect(visibleWorkspaces().flatMap((workspace) => workspace.projects)).toHaveLength(2);
  });

  it('restores visibility when teardown throws and leaves another pending removal hidden (ONL-2873)', async () => {
    const group = threeProjects('optimistic-throw');
    const restoreOther = hideRemovingProjects([group.founding]);
    const deps = recorder();
    deps.remove = async () => { throw new Error('unavailable'); };
    try {
      await expect(removeProjectByUser(group.second, deps)).rejects.toThrow('unavailable');
      expect(visibleWorkspaces().flatMap((workspace) => workspace.projects).map((entry) => entry.workspacePath)).toEqual(expect.arrayContaining(group.paths.filter((path) => path !== group.founding)));
      expect(visibleWorkspaces().flatMap((workspace) => workspace.projects)).toHaveLength(2);
    } finally {
      restoreOther();
    }
  });

  it('warns about held history when only duplicates remain in a Workspace', async () => {
    const group = threeProjects('held-duplicate-only', { origin: 'duplicate', heldOrigin: 'blank' });
    const deps = workspaceRecorder();
    await removeWorkspaceByUser(group.identity, deps);
    expect(deps.asked[0]?.detail).toContain('its history has no other copy');
    expect(projectsOfRepo(group.identity)).toEqual([]);
    expect(deps.captured[0]?.properties['origin']).toBe('duplicate');
  });

  it('refuses an identity the registry does not list, and asks nothing', async () => {
    threeProjects('unknown-folder');
    const deps = workspaceRecorder();

    const outcome = await removeWorkspaceByUser('fixture/nobody-at-all', deps);

    expect(outcome).toEqual({ ok: false, reason: 'unknown-project' });
    expect(deps.asked).toEqual([]);
    expect(deps.closed).toEqual([]);
    expect(deps.removed).toEqual([]);
  });

  it('asks once, tears every project down, broadcasts each and records one event', async () => {
    const group = threeProjects('whole-folder');
    const deps = workspaceRecorder();

    const outcome = await removeWorkspaceByUser(group.identity, deps);

    expect(outcome).toEqual({ ok: true });
    expect(deps.asked).toHaveLength(1);
    expect([...deps.removed].sort()).toEqual([...group.paths].sort());
    expect(deps.broadcasts).toBe(3);
    expect(deps.captured.map((entry) => entry.event)).toEqual(['workspace_removed']);
    expect(projectsOfRepo(group.identity)).toEqual([]);
  });

  it('closes every tab of every project before anything is deleted', async () => {
    const order: string[] = [];
    const group = threeProjects('closed-first');
    const deps = workspaceRecorder();
    deps.closeTabs = async () => {
      order.push('close');
      return true;
    };
    deps.remove = async (path) => {
      order.push('remove');
      forgetProject(path);
      return { ok: true, lastInGroup: false };
    };

    await removeWorkspaceByUser(group.identity, deps);

    expect(order).toEqual(['close', 'close', 'close', 'remove', 'remove', 'remove']);
  });

  it('touches nothing when the user cancels the one confirm', async () => {
    const group = threeProjects('folder-cancelled');
    const deps = workspaceRecorder({ confirm: false });

    const outcome = await removeWorkspaceByUser(group.identity, deps);

    expect(outcome).toEqual({ ok: false, reason: 'cancelled' });
    expect(deps.asked).toHaveLength(1);
    expect(deps.closed).toEqual([]);
    expect(deps.removed).toEqual([]);
    expect(deps.broadcasts).toBe(0);
    expect(deps.captured).toEqual([]);
    expect(projectsOfRepo(group.identity)).toHaveLength(3);
  });

  it('deletes nothing when one project asks to keep its tab', async () => {
    const group = threeProjects('folder-held');
    const deps = workspaceRecorder({ tabs: (path) => path !== group.second });

    const outcome = await removeWorkspaceByUser(group.identity, deps);

    expect(outcome).toEqual({ ok: false, reason: 'tab-held' });
    expect(deps.closed).toContain(group.second);
    expect(deps.removed).toEqual([]);
    expect(deps.broadcasts).toBe(0);
    expect(projectsOfRepo(group.identity)).toHaveLength(3);
  });

  it('stops at a folder that will not go, naming it, and leaves the rest listed', async () => {
    const group = threeProjects('folder-stuck');
    let reached = 0;
    const deps = workspaceRecorder({
      removal: () => {
        reached += 1;
        return reached === 2
          ? { ok: false, reason: 'folder-remains', detail: 'EBUSY' }
          : { ok: true, lastInGroup: false };
      },
    });

    const outcome = await removeWorkspaceByUser(group.identity, deps);

    expect(outcome).toEqual({ ok: false, reason: 'folder-remains' });
    expect(deps.failures).toEqual(['EBUSY']);
    expect(deps.removed).toHaveLength(2);
    expect(deps.broadcasts).toBe(2);
    const left = projectsOfRepo(group.identity).map((record) => record.workspacePath);
    expect(left).toHaveLength(2);
    expect(left).not.toContain(deps.removed[0]);
    expect(left).toContain(deps.removed[1]);
    expect(deps.captured).toEqual([]);
  });

  it('refuses a second removal of the same folder while the first is running', async () => {
    const group = threeProjects('folder-in-flight');
    let open = (): void => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    let arrive = (): void => {};
    const atTabs = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const first = workspaceRecorder();
    first.closeTabs = async (path) => {
      first.closed.push(path);
      arrive();
      await gate;
      return true;
    };

    const running = removeWorkspaceByUser(group.identity, first);
    await atTabs;
    const second = workspaceRecorder();
    const outcome = await removeWorkspaceByUser(group.identity, second);

    expect(outcome).toEqual({ ok: false, reason: 'in-flight' });
    expect(second.asked).toEqual([]);
    expect(second.removed).toEqual([]);
    open();
    expect(await running).toEqual({ ok: true });
    expect(first.removed).toHaveLength(3);
    expect(group.paths.some((path) => isRemovingProject(path))).toBe(false);
  });

  it('refuses while one of its projects is already being removed from its card', async () => {
    const group = threeProjects('card-first');
    let open = (): void => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    let arrive = (): void => {};
    const atTabs = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const card = recorder();
    card.closeTabs = async (path) => {
      card.closed.push(path);
      arrive();
      await gate;
      return true;
    };

    const running = removeProjectByUser(group.second, card);
    await atTabs;
    const folder = workspaceRecorder();
    const outcome = await removeWorkspaceByUser(group.identity, folder);

    expect(outcome).toEqual({ ok: false, reason: 'in-flight' });
    expect(folder.asked).toEqual([]);
    expect(folder.removed).toEqual([]);
    open();
    expect(await running).toEqual({ ok: true });
  });

  it('holds its projects from the moment it asks, so a card cannot remove one under the open confirm', async () => {
    const group = threeProjects('claimed-at-ask');
    let answer = (): void => {};
    const asked = new Promise<void>((resolve) => {
      answer = resolve;
    });
    let arrive = (): void => {};
    const atConfirm = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const folder = workspaceRecorder();
    folder.confirm = async (ask) => {
      folder.asked.push(ask);
      arrive();
      await asked;
      return true;
    };

    const running = removeWorkspaceByUser(group.identity, folder);
    await atConfirm;
    const card = recorder();
    const outcome = await removeProjectByUser(group.second, card);

    expect(outcome).toEqual({ ok: false, reason: 'in-flight' });
    expect(card.asked).toEqual([]);
    answer();
    expect(await running).toEqual({ ok: true });
    expect(folder.removed).toHaveLength(3);
  });

  it('tears the founding project down last, even when it is the most recently opened', async () => {
    const founding = project('founding-last');
    await tick();
    const younger = sibling('founding-last', 'two');
    await tick();
    touchProject(founding);
    const byRecency = projectsOfRepo('fixture/founding-last').sort((a, b) =>
      b.lastOpenedAt.localeCompare(a.lastOpenedAt),
    );
    expect(byRecency[0]?.workspacePath).toBe(founding);
    const deps = workspaceRecorder();

    await removeWorkspaceByUser('fixture/founding-last', deps);

    expect(deps.removed).toEqual([younger, founding]);
  });

  it('names the row the user renamed, and says how many projects go', async () => {
    const group = threeProjects('folder-renamed');
    renameWorkspace(group.identity, 'Marketing site');
    const deps = workspaceRecorder();

    await removeWorkspaceByUser(group.identity, deps);

    expect(deps.asked[0]?.message).toContain('Marketing site');
    expect(deps.asked[0]?.message).not.toContain(group.identity);
    expect(deps.asked[0]?.detail).toContain('3');
    expect(deps.asked[0]?.detail).not.toContain(group.identity);
  });

  it('records the removal with the hashed repo, and no path, name or identity', async () => {
    const group = threeProjects('folder-telemetry', { origin: 'blank', displayName: 'Pricing Page' });
    renameWorkspace(group.identity, 'Marketing site');
    const deps = workspaceRecorder();

    await removeWorkspaceByUser(group.identity, deps);

    expect(deps.captured).toEqual([
      {
        event: 'workspace_removed',
        properties: {
          project_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          workspace_instance_id: expect.stringMatching(/^[0-9a-f]{16}$/),
          origin: 'blank',
          project_count: 3,
          missing_count: 0,
        },
      },
    ]);
    const shipped = JSON.stringify(deps.captured);
    expect(shipped).not.toContain('Marketing');
    expect(shipped).not.toContain('Pricing');
    expect(shipped).not.toContain('fixture/');
    expect(shipped).not.toContain(group.founding);
    expect(shipped).not.toContain('skylark');
  });
});
