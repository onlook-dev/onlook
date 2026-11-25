import { create } from 'zustand';
import {
  GIT_PILL_SHIPPED_DEFAULTS,
  type GitPillDefaults,
  type GitPillDefaultsPatch,
  type GitPillNoActionReason,
  type GitPillOutcome,
  type GitSnapshotRow,
  type GitStatusChange,
  type PenView,
  type RendererTelemetryEvent,
} from '@studio/events';
import { derivePillState, pillStateOf as derivePillStateOf } from '@studio/git-ui/derive';
import { ignoreRefusal } from '../refusal.js';
import { type GitPillState, type GitPillStateId } from '@studio/git-ui/state';
import type { GitDropdownOption } from '@studio/git-ui';
import { studio } from '../bridge.js';
import { useOnScreenStore } from '../tips/onScreen.js';

export type GitPillAction = GitPillStateId | GitDropdownOption;

export interface WorkingEntry {
  clickedAt: number;
  action: GitPillAction;
  fromState: GitPillStateId;
}

/** A press main's pen is holding. `text` is what it was sent as, which is how the pill knows the pen is still its own press (ONL-2379). */
export interface HeldEntry {
  heldAt: number;
  action: GitPillAction;
  fromState: GitPillStateId;
  text: string;
}

interface GitStatusState {
  rows: Record<string, GitSnapshotRow>;
  defaults: GitPillDefaults;
  working: Record<string, WorkingEntry>;
  held: Record<string, HeldEntry>;
}

interface GitStatusStore extends GitStatusState {
  apply: (change: GitStatusChange) => void;
  applyAll: (rows: Record<string, GitSnapshotRow>) => void;
  click: (worktreePath: string, action: GitPillAction, text: string, pen?: PenView) => Promise<void>;
  setDefault: (patch: GitPillDefaultsPatch) => Promise<void>;
  applyDefaults: (defaults: GitPillDefaults) => void;
}

function without<T>(entries: Record<string, T>, worktreePath: string): Record<string, T> {
  if (!(worktreePath in entries)) return entries;
  const { [worktreePath]: _dropped, ...rest } = entries;
  return rest;
}

/**
 * The pill claims a queue only while the pen holds its own press alone: a join retires the claim,
 * because the words are then the designer's too, and a latched verdict means it waits on them (ONL-2379).
 */
export function queuedActionFor(held: HeldEntry | undefined, pen: PenView | undefined): GitPillAction | undefined {
  if (held === undefined || pen === undefined) return undefined;
  if (pen.verdict !== undefined || pen.text !== held.text) return undefined;
  // A press carries no attachment, so one in the pen is the designer's and a take-back would discard it.
  if (pen.attachments !== undefined) return undefined;
  return held.action;
}

/** A pick that sets no default leaves the held words and the state's own words different (ONL-2379). */
export function takeBackFor(held: HeldEntry | undefined, pen: PenView | undefined): HeldEntry | undefined {
  return queuedActionFor(held, pen) === undefined ? undefined : held;
}

function sendTelemetry(event: RendererTelemetryEvent): void {
  try {
    studio().telemetryEvent(event);
  } catch {
    // No telemetry door here (chrome bridge, tests) — the transition still lands.
  }
}

let openWorktree: string | undefined;
let shownStateId: string | undefined;
let defaultsGeneration = 0;

function emitShownIfChanged(): void {
  if (openWorktree === undefined || !useOnScreenStore.getState().isOnScreen) return;
  const { rows, defaults } = useGitStatusStore.getState();
  const row = rows[openWorktree];
  if (row === undefined) return;
  const id = derivePillState(row, defaults).id;
  if (id === shownStateId) return;
  shownStateId = id;
  sendTelemetry({ event: 'git_pill_shown', properties: { worktreePath: openWorktree, state: id } });
}

/** The open worktree lives in the canvas store; Root feeds it in so this module never imports it. */
export function noteOpenWorktree(worktreePath: string | undefined): void {
  if (worktreePath === openWorktree) return;
  openWorktree = worktreePath;
  shownStateId = undefined;
  emitShownIfChanged();
}

let unwatchOpenWorktree: (() => void) | undefined;
let unwatchOnScreen: (() => void) | undefined;

export function watchOpenWorktree(
  subscribe: (listener: (path: string | undefined) => void) => () => void,
  current: string | undefined,
): void {
  noteOpenWorktree(current);
  unwatchOpenWorktree ??= subscribe(noteOpenWorktree);
  unwatchOnScreen ??= useOnScreenStore.subscribe(emitShownIfChanged);
}

function emitClicked(worktreePath: string, state: GitPillStateId, action: GitPillAction): void {
  sendTelemetry({ event: 'git_pill_clicked', properties: { worktreePath, state, action } });
}

function emitOutcome(worktreePath: string, entry: WorkingEntry, toState: GitPillStateId, outcome: GitPillOutcome): void {
  sendTelemetry({
    event: 'git_pill_outcome',
    properties: { worktreePath, from_state: entry.fromState, to_state: toState, outcome, duration_ms: Date.now() - entry.clickedAt },
  });
}

function emitQueued(worktreePath: string, entry: HeldEntry): void {
  sendTelemetry({ event: 'git_pill_queued', properties: { worktreePath, state: entry.fromState, action: entry.action } });
}

function emitQueueEnd(worktreePath: string, entry: HeldEntry, outcome: GitPillOutcome): void {
  emitOutcome(worktreePath, { ...entry, clickedAt: entry.heldAt }, entry.fromState, outcome);
}

function isNewer(row: GitSnapshotRow, previous: GitSnapshotRow | undefined): boolean {
  return previous === undefined || Date.parse(row.measuredAt) > Date.parse(previous.measuredAt);
}

function settles(row: GitSnapshotRow, entry: { clickedAt: number } | undefined): boolean {
  return entry !== undefined && row.trigger === 'turn-end' && Date.parse(row.measuredAt) > entry.clickedAt;
}

/** The derivation lives in `@studio/git-ui` because the chrome view's process derives the same pill (ONL-2206). */
export function pillStateOf(row: GitSnapshotRow | undefined, defaults: GitPillDefaults, working: WorkingEntry | undefined): GitPillState {
  return derivePillStateOf(row, defaults, working !== undefined, working?.action);
}

const useGitStatusStore = create<GitStatusStore>()((set, get) => ({
  rows: {},
  defaults: GIT_PILL_SHIPPED_DEFAULTS,
  working: {},
  held: {},

  apply: ({ worktreePath, row }) => {
    const { working, held, defaults } = get();
    const entry = working[worktreePath];
    const settled = settles(row, entry);
    const waiting = held[worktreePath];
    // The turn the press waited on has ended, so the pen has had its say about it either way.
    const ranOut = waiting !== undefined && settles(row, { clickedAt: waiting.heldAt });
    set((state) => ({
      rows: { ...state.rows, [worktreePath]: row },
      working: settled ? without(state.working, worktreePath) : state.working,
      held: ranOut ? without(state.held, worktreePath) : state.held,
    }));
    if (settled && entry !== undefined) {
      const toState = derivePillState(row, defaults).id;
      emitOutcome(worktreePath, entry, toState, toState === entry.fromState ? 'unchanged' : 'advanced');
    }
    if (worktreePath === openWorktree) emitShownIfChanged();
  },

  applyAll: (rows) => {
    set((state) => {
      const merged = { ...state.rows };
      for (const [path, row] of Object.entries(rows)) {
        if (isNewer(row, merged[path])) merged[path] = row;
      }
      return { rows: merged };
    });
    emitShownIfChanged();
  },

  click: async (worktreePath, action, text, pen) => {
    const waiting = get().held[worktreePath];
    if (queuedActionFor(waiting, pen) !== undefined && pen !== undefined && waiting !== undefined) {
      const answer = await studio()
        .agentCommand({ type: 'pen.discard', penId: pen.penId })
        .catch(ignoreRefusal('git-status', 'pen discard'));
      // Main refuses an id a join retired: the pen is someone else's now, so send nothing into it.
      if (answer?.accepted !== true) return;
      set((state) => ({ held: without(state.held, worktreePath) }));
      emitQueueEnd(worktreePath, waiting, 'cancelled');
      // The same words again are the take-back itself; different ones go on to queue in their place.
      if (waiting.text === text) return;
    }

    const fromState = derivePillState(get().rows[worktreePath], get().defaults).id;
    const entry: WorkingEntry = { clickedAt: Date.now(), action, fromState };
    set((state) => ({ working: { ...state.working, [worktreePath]: entry } }));
    emitClicked(worktreePath, fromState, action);
    const clear = (): void => {
      if (get().working[worktreePath] !== entry) return;
      set((state) => ({ working: without(state.working, worktreePath) }));
      emitOutcome(worktreePath, entry, fromState, 'refused');
    };
    try {
      const { accepted, held } = await studio().agentCommand({ type: 'prompt', text });
      if (!accepted) {
        clear();
        return;
      }
      if (held !== true) return;
      if (get().working[worktreePath] !== entry) return;
      const nowHeld: HeldEntry = { heldAt: entry.clickedAt, action, fromState, text };
      set((state) => ({ working: without(state.working, worktreePath), held: { ...state.held, [worktreePath]: nowHeld } }));
      emitQueued(worktreePath, nowHeld);
    } catch {
      clear();
    }
  },

  setDefault: async (patch) => {
    const token = ++defaultsGeneration;
    const before = get().defaults;
    set({ defaults: { ...before, ...patch } });
    emitShownIfChanged();
    let settled: GitPillDefaults;
    try {
      settled = await studio().setGitPillDefault(patch);
    } catch {
      settled = before;
    }
    if (token !== defaultsGeneration) return;
    set({ defaults: settled });
    emitShownIfChanged();
  },

  applyDefaults: (defaults) => {
    set({ defaults });
    emitShownIfChanged();
  },
}));

export { useGitStatusStore };

let priming: Promise<void> | undefined;

export function primeGitStatus(): Promise<void> {
  priming ??= (async () => {
    const { apply, applyAll, applyDefaults } = useGitStatusStore.getState();

    studio().onGitStatusChanged(apply);

    // A default chosen while the read is out moves the generation on, and the read's answer is then the older of the two.
    const asked = defaultsGeneration;
    const [rows, defaults] = await Promise.all([
      studio().listGitStatus().catch(ignoreRefusal('git-status', 'list read')),
      studio().gitPillDefaults().catch(ignoreRefusal('git-status', 'defaults read')),
    ]);
    if (rows !== undefined) applyAll(rows);
    if (defaults !== undefined && asked === defaultsGeneration) applyDefaults(defaults);
  })();
  return priming;
}

export function noteBrowserOpen(worktreePath: string): void {
  const { rows, defaults } = useGitStatusStore.getState();
  emitClicked(worktreePath, derivePillState(rows[worktreePath], defaults).id, 'open-in-browser');
}

export function noteNoActionPress(worktreePath: string, reason: GitPillNoActionReason): void {
  const { rows, defaults } = useGitStatusStore.getState();
  sendTelemetry({ event: 'git_pill_no_action', properties: {
    worktreePath,
    state: derivePillState(rows[worktreePath], defaults).id,
    reason,
  } });
}

export function resetGitStatusPrimeForTests(): void {
  priming = undefined;
  openWorktree = undefined;
  shownStateId = undefined;
  defaultsGeneration = 0;
  unwatchOpenWorktree?.();
  unwatchOpenWorktree = undefined;
  unwatchOnScreen?.();
  unwatchOnScreen = undefined;
  useGitStatusStore.setState({ rows: {}, defaults: GIT_PILL_SHIPPED_DEFAULTS, working: {}, held: {} });
}
