import { beforeEach, describe, expect, it } from 'bun:test';
import type { OpenProjectResult, ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { deferred, type Deferred } from '../testing/bridge.js';
import {
  abandonProject,
  beginCreate,
  closeProject,
  createPrimed,
  followCreate,
  holdOutgoing,
  installProjectSession,
  landProject,
  leaveProject,
  openCreated,
  openProject,
  outgoingProject,
  replaceProject,
  resetProjectSessionForTests,
  restoreOutgoing,
} from './session.js';
import { sessionCovered, useWorkspaceStore } from './store.js';

const workspaceAt = (name: string): WorkspaceCreated => ({
  workspacePath: `/ws/${name}`,
  workspaceName: `${name}-1`,
  branchName: `studio/${name}-1`,
  baseBranch: 'main',
  sourceRepoName: name,
  sourcePath: `/src/${name}`,
  sourceRepoRoot: `/src/${name}`,
  repoIdentity: `id-${name}`,
  copiedEnvFiles: [],
});

const A = workspaceAt('a');
const B = workspaceAt('b');
const CAMERA = { x: 1, y: 2, zoom: 0.5 };

/** Every step the session takes, in the order it took it, with each bridge answer held open. */
function rig() {
  const steps: string[] = [];
  const opens: { path: string; answer: Deferred<OpenProjectResult> }[] = [];
  const primes: Deferred<void>[] = [];
  const locations: { path: string; answer: Deferred<void> }[] = [];
  const resyncs: Deferred<void>[] = [];
  const announces: { path: string; devUrl?: string; answer: Deferred<void> }[] = [];
  installProjectSession(
    {
      clearFrames: () => { steps.push('clear frames'); },
      clearCode: () => { steps.push('clear code'); },
      seedCamera: (camera) => { steps.push(`seed ${camera === undefined ? 'nothing' : String(camera.zoom)}`); },
      showProject: (project) => { steps.push(`show ${project.path}`); },
      resync: () => {
        steps.push('resync');
        const answer = deferred<void>();
        resyncs.push(answer);
        return answer.promise;
      },
      latchResync: () => { steps.push('latch'); },
      homeUrl: () => 'http://localhost:5180/',
    },
    {
      prime: () => {
        steps.push('prime');
        const answer = deferred<void>();
        primes.push(answer);
        return answer.promise;
      },
      bridge: () => ({
        openProject: ({ workspacePath }) => {
          steps.push(`ask main ${workspacePath}`);
          const answer = deferred<OpenProjectResult>();
          opens.push({ path: workspacePath, answer });
          return answer.promise;
        },
        locationSet: (location) => {
          const path = location.kind === 'project' ? (location.workspacePath ?? location.repoIdentity) : location.kind;
          steps.push(`location ${path}`);
          const answer = deferred<void>();
          locations.push({ path, answer });
          return answer.promise;
        },
        notifyProjectSelected: ({ path, devUrl }) => {
          steps.push(`announce ${path}`);
          const answer = deferred<void>();
          announces.push({ path, ...(devUrl === undefined ? {} : { devUrl }), answer });
          return answer.promise;
        },
      }),
    },
  );
  return { steps, opens, primes, locations, resyncs, announces };
}

const phase = () => useWorkspaceStore.getState().session;
const covered = (): boolean => sessionCovered(useWorkspaceStore.getState());
const held = (workspace: WorkspaceCreated): OpenProjectResult => ({ ok: true, workspace, camera: CAMERA, currentPageId: 'pg' });
const turn = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

let main: ReturnType<typeof rig>;

beforeEach(() => {
  resetProjectSessionForTests();
  main = rig();
});

/** Opens and lands `workspace` with every answer given at once. */
async function settleOpen(workspace: WorkspaceCreated): Promise<void> {
  const opened = openProject(workspace.workspacePath);
  main.opens.at(-1)!.answer.settle(held(workspace));
  await turn();
  main.primes.at(-1)!.settle();
  expect(await opened).toEqual({ kind: 'ready', workspace });
  const landed = landProject(workspace);
  main.locations.at(-1)!.answer.settle();
  await turn();
  main.resyncs.at(-1)!.settle();
  await turn();
  main.announces.at(-1)!.answer.settle();
  await landed;
}

describe('opening a project', () => {
  it('runs its steps in one order, from the ask to the announce', async () => {
    await settleOpen(A);
    expect(main.steps).toEqual([
      'ask main /ws/a',
      'clear frames',
      'clear code',
      'seed 0.5',
      'prime',
      'show /ws/a',
      'location /ws/a',
      'resync',
      'announce /ws/a',
    ]);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/a' });
    expect(useWorkspaceStore.getState().workspace).toBe(A);
    expect(main.announces[0]?.devUrl).toBe('http://localhost:5180/');
  });

  it('covers the editor from the ask until the landing settles, whatever the landing does', async () => {
    const opened = openProject(A.workspacePath);
    expect(covered()).toBe(true);
    expect(phase()).toEqual({ kind: 'opening', covered: true, workspacePath: '/ws/a' });
    main.opens[0]!.answer.settle(held(A));
    await turn();
    main.primes[0]!.settle();
    await opened;
    expect(covered()).toBe(true);
    const landed = landProject(A);
    main.locations[0]!.answer.refuse(new Error('main is gone'));
    await landed;
    expect(covered()).toBe(false);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/a' });
  });

  it('a second open supersedes the first: the first project’s late answers touch nothing', async () => {
    const first = openProject(A.workspacePath);
    const second = openProject(B.workspacePath);
    main.opens[1]!.answer.settle(held(B));
    await turn();
    main.steps.length = 0;
    // The first answer arrives last, which used to make it the one that landed.
    main.opens[0]!.answer.settle({ ok: true, workspace: A, camera: { x: 9, y: 9, zoom: 9 } });
    expect(await first).toEqual({ kind: 'superseded' });
    expect(main.steps).toEqual([]);
    main.primes[0]!.settle();
    expect(await second).toEqual({ kind: 'ready', workspace: B });
    expect(phase()).toEqual({ kind: 'opening', covered: true, workspacePath: '/ws/b' });
  });

  it('a first open superseded while its panels prime is dropped, not landed', async () => {
    const first = openProject(A.workspacePath);
    main.opens[0]!.answer.settle(held(A));
    await turn();
    const second = openProject(B.workspacePath);
    main.primes[0]!.settle();
    expect(await first).toEqual({ kind: 'superseded' });
    main.opens[1]!.answer.settle(held(B));
    await turn();
    main.primes[1]!.settle();
    expect(await second).toEqual({ kind: 'ready', workspace: B });
  });

  it('asked twice for the project already opening, asks main once and clears once', async () => {
    const first = openProject(A.workspacePath);
    const second = openProject(A.workspacePath);
    expect(main.opens).toHaveLength(1);
    main.opens[0]!.answer.settle(held(A));
    await turn();
    main.primes[0]!.settle();
    expect(await first).toEqual({ kind: 'ready', workspace: A });
    expect(await second).toEqual({ kind: 'ready', workspace: A });
    expect(main.steps.filter((step) => step === 'clear frames')).toHaveLength(1);
  });

  it('asked for the project already open, leaves its frames and its cover alone', async () => {
    await settleOpen(A);
    main.steps.length = 0;
    expect(await openProject(A.workspacePath)).toEqual({ kind: 'superseded' });
    expect(main.steps).toEqual([]);
    expect(covered()).toBe(false);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/a' });
  });

  it('the same project opens again after it was closed', async () => {
    await settleOpen(A);
    leaveProject();
    closeProject();
    expect(phase()).toEqual({ kind: 'none' });
    await settleOpen(A);
    expect(main.opens).toHaveLength(2);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/a' });
  });

  it('a project main cannot open leaves no cover and nothing cleared', async () => {
    const opened = openProject(A.workspacePath);
    main.opens[0]!.answer.settle({ ok: false, reason: 'workspace-missing' });
    expect(await opened).toEqual({ kind: 'failed' });
    expect(phase()).toEqual({ kind: 'none' });
    expect(main.steps).toEqual(['ask main /ws/a']);
  });

  it('a prime that fails leaves a phase the next open starts from', async () => {
    const opened = openProject(A.workspacePath);
    main.opens[0]!.answer.settle(held(A));
    await turn();
    main.primes[0]!.refuse(new Error('panels unavailable'));
    expect(await opened).toEqual({ kind: 'failed' });
    expect(phase()).toEqual({ kind: 'none' });
    expect(covered()).toBe(false);
    await settleOpen(A);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/a' });
  });

  it('an ask main rejects is a failed open, and the one after it is not joined to it', async () => {
    const opened = openProject(A.workspacePath);
    main.opens[0]!.answer.refuse(new Error('no handler'));
    expect(await opened).toEqual({ kind: 'failed' });
    void openProject(A.workspacePath);
    expect(main.opens).toHaveLength(2);
  });

  it('a project handed over whole is cleared for and primed, with no camera to seed', async () => {
    const opened = openCreated(A);
    expect(covered()).toBe(true);
    main.primes[0]!.settle();
    expect(await opened).toEqual({ kind: 'ready', workspace: A });
    expect(main.steps).toEqual(['clear frames', 'clear code', 'prime']);
  });
});

describe('closing', () => {
  it('a close while the project is opening drops the open and lowers the cover at once (ONL-2265)', async () => {
    const opened = openProject(A.workspacePath);
    abandonProject();
    expect(covered()).toBe(false);
    expect(phase()).toEqual({ kind: 'closing' });
    main.opens[0]!.answer.settle(held(A));
    expect(await opened).toEqual({ kind: 'superseded' });
    expect(main.steps).toEqual(['ask main /ws/a']);
    closeProject();
    expect(phase()).toEqual({ kind: 'none' });
    expect(useWorkspaceStore.getState().workspace).toBeNull();
  });

  it('a close while the project is landing stops it before the agent session is announced', async () => {
    const opened = openProject(A.workspacePath);
    main.opens[0]!.answer.settle(held(A));
    await turn();
    main.primes[0]!.settle();
    await opened;
    const landed = landProject(A);
    abandonProject();
    closeProject();
    main.locations[0]!.answer.settle();
    await landed;
    expect(main.announces).toEqual([]);
    expect(phase()).toEqual({ kind: 'none' });
    expect(useWorkspaceStore.getState().workspace).toBeNull();
  });

  it('the project leaves the stores only once the editor is gone', async () => {
    await settleOpen(A);
    main.steps.length = 0;
    leaveProject();
    expect(phase()).toEqual({ kind: 'closing' });
    expect(useWorkspaceStore.getState().workspace).toBe(A);
    expect(main.steps).toEqual([]);
    closeProject();
    expect(useWorkspaceStore.getState().workspace).toBeNull();
    expect(main.steps).toEqual(['clear frames']);
  });

  it('an open begun after a close works, and the closed run cannot settle it', async () => {
    const abandoned = openProject(A.workspacePath);
    abandonProject();
    closeProject();
    const next = openProject(B.workspacePath);
    expect(covered()).toBe(true);
    main.opens[0]!.answer.settle(held(A));
    expect(await abandoned).toEqual({ kind: 'superseded' });
    expect(covered()).toBe(true);
    main.opens[1]!.answer.settle(held(B));
    await turn();
    main.primes[0]!.settle();
    expect(await next).toEqual({ kind: 'ready', workspace: B });
  });
});

describe('landing', () => {
  it('two landings in one run: the first never announces over the second', async () => {
    const first = landProject(A);
    const second = landProject(B);
    main.locations[1]!.answer.settle();
    await turn();
    main.resyncs[0]!.settle();
    await turn();
    main.announces[0]!.answer.settle();
    await second;
    main.locations[0]!.answer.settle();
    await first;
    expect(main.announces.map((announce) => announce.path)).toEqual(['/ws/b']);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/b' });
    expect(useWorkspaceStore.getState().workspace).toBe(B);
  });

  it('the same project handed to a landing in flight, or already landed, lands once', async () => {
    const first = landProject(A);
    void landProject(A);
    expect(main.locations).toHaveLength(1);
    main.locations[0]!.answer.settle();
    await turn();
    main.resyncs[0]!.settle();
    await turn();
    main.announces[0]!.answer.settle();
    await first;
    await landProject(A);
    expect(main.locations).toHaveLength(1);
  });
});

describe('a create (ONL-2265, ONL-2593)', () => {
  const planning: ProjectCreateState = { kind: 'planning', sourceRepoName: 'silt' };
  const ready: ProjectCreateState = { kind: 'ready', workspace: A };

  it('clears for the new project as planning begins, without covering the chat that narrates it', async () => {
    const followed = followCreate(planning);
    expect(main.steps).toEqual(['clear frames', 'clear code', 'prime']);
    expect(covered()).toBe(false);
    expect(phase()).toEqual({ kind: 'opening', covered: false });
    main.primes[0]!.settle();
    expect(await followed).toBe(true);
  });

  it('a ready that arrives after a close abandoned the run is refused', async () => {
    const planned = followCreate(planning);
    main.primes[0]!.settle();
    await planned;
    abandonProject();
    const landed = followCreate(ready);
    main.primes[1]!.settle();
    expect(await landed).toBe(false);
  });

  it('a new planning takes the run in force, whatever was held before', async () => {
    const planned = followCreate(planning);
    main.primes[0]!.settle();
    await planned;
    abandonProject();
    const again = followCreate(planning);
    main.primes[1]!.settle();
    expect(await again).toBe(true);
  });

  it('a first push with nothing held, a create already past planning at mount, joins the run in force', async () => {
    const landed = followCreate(ready);
    expect(main.steps).toEqual(['prime']);
    main.primes[0]!.settle();
    expect(await landed).toBe(true);
  });

  it('the tab that asked clears before main says planning, and is primed against the same run', async () => {
    beginCreate();
    const primed = createPrimed();
    abandonProject();
    main.primes[0]!.settle();
    expect(await primed).toBe(false);
  });

  it('does not lower the cover of an open in force', () => {
    void openProject(A.workspacePath);
    void followCreate(ready);
    expect(covered()).toBe(true);
  });

  it('a canceled or refused create leaves the tab on what it holds', async () => {
    void followCreate(planning);
    expect(await followCreate({ kind: 'canceled' })).toBe(false);
    expect(phase()).toEqual({ kind: 'none' });
    void followCreate(planning);
    void followCreate({ kind: 'refused', sourceRepoName: 'silt', reason: 'nothing-to-copy' });
    expect(phase()).toEqual({ kind: 'none' });
  });
});

describe('a create that replaces the open project (ONL-1999, ONL-2281)', () => {
  it('latches the canvas, clears its frames and keeps the code until the create is planning', async () => {
    await settleOpen(A);
    main.steps.length = 0;
    replaceProject();
    expect(main.steps).toEqual(['latch', 'clear frames']);
    expect(useWorkspaceStore.getState().workspace).toBeNull();
    expect(outgoingProject()).toBe(A);
    expect(phase()).toEqual({ kind: 'opening', covered: false });
  });

  it('puts the replaced project back when the create never lands, without announcing it again', async () => {
    await settleOpen(A);
    replaceProject();
    main.steps.length = 0;
    restoreOutgoing();
    expect(main.steps).toEqual(['show /ws/a', 'resync']);
    expect(useWorkspaceStore.getState().workspace).toBe(A);
    expect(phase()).toEqual({ kind: 'open', workspacePath: '/ws/a' });
    expect(outgoingProject()).toBeNull();
  });

  it('a retry stashes the restored project again, so a second failure has something to put back', async () => {
    await settleOpen(A);
    replaceProject();
    restoreOutgoing();
    holdOutgoing();
    expect(outgoingProject()).toBe(A);
  });

  it('a landing spends the stash', async () => {
    await settleOpen(A);
    replaceProject();
    void landProject(B);
    expect(outgoingProject()).toBeNull();
  });
});
