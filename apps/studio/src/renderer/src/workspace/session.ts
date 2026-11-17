import {
  creationWorkspace,
  workspaceDisplayName,
  type CanvasCamera,
  type CanvasPageId,
  type ProjectCreateState,
  type StudioBridge,
  type WorkspaceCreated,
} from '@studio/events';
import { studio } from '../bridge.js';
import { log } from '../log.js';
import { primePanels } from '../panels/store.js';
import { useWorkspaceStore, type SessionPhase } from './store.js';

/** What the session moves but the shell cannot import: the entry seats the canvas and code stores here. */
export interface SessionSurfaces {
  clearFrames(): void;
  clearCode(): void;
  seedCamera(camera: CanvasCamera | undefined, pageId?: CanvasPageId): void;
  showProject(project: { path: string; name: string }): void;
  /** Resolves once the incoming document is mirrored, or the answer was superseded. */
  resync(): Promise<void>;
  /** Holds a mounted canvas's own resync until the landing's (ONL-1999). */
  latchResync(): void;
  /** The first frame's address, handed to the agent session as it starts. */
  homeUrl(): string | undefined;
}

interface SessionPorts extends SessionSurfaces {
  prime(): Promise<void>;
  bridge(): Pick<StudioBridge, 'openProject' | 'locationSet' | 'notifyProjectSelected'>;
}

export type Opened =
  | { kind: 'ready'; workspace: WorkspaceCreated }
  /** Main refused or a step threw; the phase is back where a new open can start. */
  | { kind: 'failed' }
  /** A newer open, a close, or the same project already open: nothing was touched after it lost. */
  | { kind: 'superseded' };

let ports: SessionPorts | null = null;
/** The covered open in flight, so a second ask for the same project joins it. */
let opening: { run: number; workspacePath: string; result: Promise<Opened> } | null = null;
/** The landing in flight; a newer landing or a close replaces it, and its late answers stop there. */
let landing: { workspacePath: string } | null = null;
/** A create joins the run in force when its planning began: beginning one would cover the chat narrating the setup (ONL-2593). */
let createRun: number | undefined;
/** The project a replacing create took the place of, put back if that create never lands (ONL-2281). */
let outgoing: WorkspaceCreated | null = null;

export function installProjectSession(
  surfaces: SessionSurfaces,
  overrides: Partial<Pick<SessionPorts, 'prime' | 'bridge'>> = {},
): void {
  ports = { prime: primePanels, bridge: studio, ...surfaces, ...overrides };
}

function seated(): SessionPorts {
  if (ports === null) throw new Error('the project session has no surfaces: call installProjectSession first');
  return ports;
}

const store = useWorkspaceStore;

function isCurrent(run: number): boolean {
  return store.getState().run === run;
}

function isCovered(phase: SessionPhase): boolean {
  return phase.kind === 'opening' && phase.covered;
}

function beginCovered(workspacePath: string): number {
  const run = store.getState().run + 1;
  store.setState({ run, session: { kind: 'opening', covered: true, workspacePath } });
  return run;
}

/** A covered open in force keeps its cover: a create's push must not lower it. */
function enterUncovered(workspacePath?: string): void {
  if (isCovered(store.getState().session)) return;
  store.setState({ session: { kind: 'opening', covered: false, ...(workspacePath === undefined ? {} : { workspacePath }) } });
}

/** Where a run that will not land leaves the tab: on the project still held, or on none. */
function settled(): SessionPhase {
  const held = store.getState().workspace;
  return held === null ? { kind: 'none' } : { kind: 'open', workspacePath: held.workspacePath };
}

function fail(run: number): Opened {
  if (!isCurrent(run)) return { kind: 'superseded' };
  store.setState({ session: settled() });
  return { kind: 'failed' };
}

/** The one order: the previous project's frames and code, the camera, the panel widths. */
async function prepare(run: number, seed?: { camera: CanvasCamera | undefined; pageId: CanvasPageId | undefined }): Promise<boolean> {
  const { clearFrames, clearCode, seedCamera, prime } = seated();
  clearFrames();
  clearCode();
  if (seed !== undefined) seedCamera(seed.camera, seed.pageId);
  await prime();
  return isCurrent(run);
}

function track(run: number, workspacePath: string, work: () => Promise<Opened>): Promise<Opened> {
  const result = work().catch((error: unknown): Opened => {
    log('session').warn('open failed', { error });
    return fail(run);
  });
  opening = { run, workspacePath, result };
  return result;
}

/** Opens a project main already holds. The caller shows the editor on `ready`; the editor's mount lands it. */
export function openProject(workspacePath: string): Promise<Opened> {
  const phase = store.getState().session;
  if (opening !== null && opening.workspacePath === workspacePath && isCurrent(opening.run) && isCovered(phase)) return opening.result;
  if (phase.kind === 'open' && phase.workspacePath === workspacePath) return Promise.resolve({ kind: 'superseded' });
  const run = beginCovered(workspacePath);
  return track(run, workspacePath, async () => {
    const answer = await seated().bridge().openProject({ workspacePath });
    if (!isCurrent(run)) return { kind: 'superseded' };
    if (!answer.ok) return fail(run);
    if (!(await prepare(run, { camera: answer.camera, pageId: answer.currentPageId }))) return { kind: 'superseded' };
    return { kind: 'ready', workspace: answer.workspace };
  });
}

/** A project main has just made and handed over whole: no camera to seed. */
export function openCreated(workspace: WorkspaceCreated): Promise<Opened> {
  const run = beginCovered(workspace.workspacePath);
  return track(run, workspace.workspacePath, async () =>
    (await prepare(run)) ? { kind: 'ready', workspace } : { kind: 'superseded' });
}

/** A create this tab asked for is under way: the previous project leaves the stores now. */
export function beginCreate(): void {
  const { clearFrames, clearCode } = seated();
  createRun = store.getState().run;
  clearFrames();
  clearCode();
  enterUncovered();
}

/** A reload lands mid-create: the record's read joins the run already in force. */
export function joinCreate(): void {
  const { clearFrames, clearCode } = seated();
  createRun ??= store.getState().run;
  clearFrames();
  clearCode();
  enterUncovered();
}

/** Primes the panels for the create in flight; false when a newer run or a close took its place meanwhile. */
export async function createPrimed(): Promise<boolean> {
  const held = createRun ?? store.getState().run;
  await seated().prime();
  return isCurrent(held);
}

/** Every pushed state of this tab's create passes through here; true while its screen may still be shown. */
export function followCreate(state: ProjectCreateState): Promise<boolean> {
  if (state.kind === 'canceled') {
    if (!isCovered(store.getState().session)) store.setState({ session: settled() });
    return Promise.resolve(false);
  }
  if (state.kind === 'planning') beginCreate();
  else createRun ??= store.getState().run;
  // Nothing will land: the tab is back on what it holds, and the failure on screen is the way on.
  const isDeadEnd = (state.kind === 'refused' || state.kind === 'failed') && creationWorkspace(state) === undefined;
  if (isDeadEnd && !isCovered(store.getState().session)) store.setState({ session: settled() });
  return createPrimed();
}

/** A create that takes this editor's place. The code stays until planning: a refused folder puts this project back, open files and all. */
export function replaceProject(): void {
  const { clearFrames, latchResync } = seated();
  latchResync();
  clearFrames();
  outgoing = store.getState().workspace;
  store.setState({ workspace: null });
  enterUncovered();
}

export function outgoingProject(): WorkspaceCreated | null {
  return outgoing;
}

/** A retry re-plans after the stash was spent on the restore; without re-stashing, a second failure has nothing to put back (ONL-2281). */
export function holdOutgoing(): void {
  outgoing ??= store.getState().workspace;
}

export function dropOutgoing(): void {
  outgoing = null;
}

/** The create never landed: the project it replaced is this tab's again. Main never left it, so nothing is announced. */
export function restoreOutgoing(): void {
  const restored = outgoing;
  if (restored === null) return;
  outgoing = null;
  store.setState({ workspace: restored, ...(isCovered(store.getState().session) ? {} : { session: { kind: 'open', workspacePath: restored.workspacePath } }) });
  seated().showProject({ path: restored.workspacePath, name: workspaceDisplayName(restored) });
  void seated().resync();
}

/** The mounted editor takes the project. The resync waits for `location:set`, where main opens the document (ONL-1993);
 * the announce is awaited so the chat is already reset when the cover lowers (ONL-2139). */
export async function landProject(workspace: WorkspaceCreated): Promise<void> {
  const { bridge, showProject, resync, homeUrl } = seated();
  const { workspacePath } = workspace;
  const phase = store.getState().session;
  if (landing?.workspacePath === workspacePath) return;
  if (phase.kind === 'open' && phase.workspacePath === workspacePath) return;
  outgoing = null;
  // Read before the first await: read later, an abandoned landing would settle a newer run.
  const run = store.getState().run;
  const mine = { workspacePath };
  landing = mine;
  const isMine = (): boolean => landing === mine && isCurrent(run);
  enterUncovered(workspacePath);
  store.setState({ workspace });
  showProject({ path: workspacePath, name: workspaceDisplayName(workspace) });
  try {
    await bridge().locationSet({ kind: 'project', repoIdentity: workspace.repoIdentity, workspacePath });
    if (landing !== mine) return;
    await resync();
    if (!isMine()) return;
    const devUrl = homeUrl();
    await bridge().notifyProjectSelected({ path: workspacePath, ...(devUrl ? { devUrl } : {}) });
  } catch (error) {
    log('connect').warn('landing failed', { error });
  } finally {
    if (landing === mine) {
      landing = null;
      if (isCurrent(run)) store.setState({ session: { kind: 'open', workspacePath } });
    }
  }
}

/** A close is an order: whatever is in flight goes stale and the cover comes down now (ONL-2265). */
export function abandonProject(): void {
  landing = null;
  store.setState({ run: store.getState().run + 1, session: { kind: 'closing' } });
}

/** The way back to Projects was taken; the editor is still on screen until `closeProject`. A create in flight keeps its run and may yet land. */
export function leaveProject(): void {
  if (isCovered(store.getState().session)) return;
  store.setState({ session: { kind: 'closing' } });
}

/** The editor has unmounted: only now do the project's name and frames leave, or they would be seen leaving. */
export function closeProject(): void {
  landing = null;
  store.setState({ workspace: null, ...(isCovered(store.getState().session) ? {} : { session: { kind: 'none' } }) });
  seated().clearFrames();
}

export function resetProjectSessionForTests(): void {
  opening = null;
  landing = null;
  createRun = undefined;
  outgoing = null;
  store.setState({ workspace: null, session: { kind: 'none' }, run: 0 });
}
