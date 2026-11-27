import { create } from 'zustand';
import {
  GIT_PILL_SHIPPED_DEFAULTS,
  type GitPillDefaults,
  type GitPillDefaultsPatch,
  type GitPillNoActionReason,
  type GitPillOutcome,
  type GitPrFailure,
  type StudioEvent,
  type GitSnapshotRow,
  type GitStatusChange,
  type PenView,
  type RendererTelemetryEvent,
  type TabAssignment,
} from '@studio/events';
import { derivePillState, pillStateOf as derivePillStateOf } from '@studio/git-ui/derive';
import { ignoreRefusal } from '../refusal.js';
import { type GitPillState, type GitPillStateId } from '@studio/git-ui/state';
import type { GitDropdownOption } from '@studio/git-ui';
import { studio } from '../bridge.js';
import { classifyPrFailure, prFailureFor, prFailureMark, retiresPrFailure, type PrFailureMark } from './failure.js';

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
  failures: Record<string, GitPrFailure>;
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
let preparingWorktree: string | undefined;
let shownStateId: string | undefined;
let defaultsGeneration = 0;
const prFailures = new WeakMap<WorkingEntry, GitPrFailure>();
const failureMarks = new Map<string, PrFailureMark>();
const prTools = new WeakMap<WorkingEntry, Map<string, string>>();
const reconcilingPrs = new Map<string, { entry: WorkingEntry; timer: ReturnType<typeof setTimeout> }>();
const queuedPrs = new Map<string, { entry: WorkingEntry; text: string }>();
const prPrompts = new WeakMap<WorkingEntry, string>();
const dispatchedPrs = new WeakSet<WorkingEntry>();

function finishReconciliation(worktreePath: string, report: boolean): void {
  const pending = reconcilingPrs.get(worktreePath);
  if (pending === undefined) return;
  clearTimeout(pending.timer);
  reconcilingPrs.delete(worktreePath);
  if (!report) return;
  const { rows, defaults } = useGitStatusStore.getState();
  const row = rows[worktreePath];
  const failure = row?.measurement.pr === undefined ? 'unknown' : undefined;
  failureMarks.delete(worktreePath);
  useGitStatusStore.setState((state) => ({ failures: failure === undefined ? without(state.failures, worktreePath) : { ...state.failures, [worktreePath]: failure } }));
  emitOutcome(worktreePath, pending.entry, row === undefined ? pending.entry.fromState : derivePillState(row, defaults).id, failure === undefined ? 'advanced' : 'unchanged', failure);
}

function emitShownIfChanged(): void {
  if (openWorktree === undefined || openWorktree === preparingWorktree) return;
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

export function noteGitStatusAssignment(assignment: TabAssignment): void {
  preparingWorktree = assignment.purpose === 'project' && assignment.restoring === true
    ? assignment.workspacePath
    : undefined;
  emitShownIfChanged();
}

let unwatchOpenWorktree: (() => void) | undefined;

export function watchOpenWorktree(
  subscribe: (listener: (path: string | undefined) => void) => () => void,
  current: string | undefined,
): void {
  noteOpenWorktree(current);
  unwatchOpenWorktree ??= subscribe(noteOpenWorktree);
}

function emitClicked(worktreePath: string, state: GitPillStateId, action: GitPillAction): void {
  sendTelemetry({ event: 'git_pill_clicked', properties: { worktreePath, state, action } });
}

function emitOutcome(worktreePath: string, entry: WorkingEntry, toState: GitPillStateId, outcome: GitPillOutcome, failure?: GitPrFailure): void {
  sendTelemetry({
    event: 'git_pill_outcome',
    properties: { worktreePath, from_state: entry.fromState, to_state: toState, outcome, duration_ms: Date.now() - entry.clickedAt, ...(failure === undefined ? {} : { failure_class: failure }) },
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
  failures: {},

  apply: ({ worktreePath, row }) => {
    const { working, held, defaults } = get();
    const entry = working[worktreePath] ?? reconcilingPrs.get(worktreePath)?.entry;
    const finished = settles(row, entry) || (entry !== undefined && reconcilingPrs.has(worktreePath) && Date.parse(row.measuredAt) > entry.clickedAt);
    const awaitingFacts = finished && entry?.action === 'create-pr' && (row.stale || row.measurement.partial) && prFailures.get(entry) === undefined;
    if (awaitingFacts && !reconcilingPrs.has(worktreePath)) {
      reconcilingPrs.set(worktreePath, { entry, timer: setTimeout(() => finishReconciliation(worktreePath, true), 15_000) });
    } else if (finished && !awaitingFacts) finishReconciliation(worktreePath, false);
    const settled = finished && !awaitingFacts;
    const failed = settled && entry?.action === 'create-pr' && !row.measurement.pr;
    const failure = failed ? prFailureFor(row, prFailures.get(entry)) : undefined;
    const waiting = held[worktreePath];
    // The turn the press waited on has ended, so the pen has had its say about it either way.
    const ranOut = waiting !== undefined && settles(row, { clickedAt: waiting.heldAt });
    const retired = failure === undefined && retiresPrFailure(row, get().failures[worktreePath], failureMarks.get(worktreePath));
    if (failure !== undefined) failureMarks.set(worktreePath, prFailureMark(row));
    else if (retired) failureMarks.delete(worktreePath);
    set((state) => ({
      rows: { ...state.rows, [worktreePath]: row },
      working: finished ? without(state.working, worktreePath) : state.working,
      held: ranOut ? without(state.held, worktreePath) : state.held,
      failures: failure !== undefined ? { ...state.failures, [worktreePath]: failure } : retired ? without(state.failures, worktreePath) : state.failures,
    }));
    if (settled && entry !== undefined) {
      const toState = derivePillState(row, defaults).id;
      emitOutcome(worktreePath, entry, toState, failed || toState === entry.fromState ? 'unchanged' : 'advanced', failure);
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
      queuedPrs.delete(worktreePath);
      set((state) => ({ held: without(state.held, worktreePath) }));
      emitQueueEnd(worktreePath, waiting, 'cancelled');
      // The same words again are the take-back itself; different ones go on to queue in their place.
      if (waiting.text === text) return;
    }

    const fromState = derivePillState(get().rows[worktreePath], get().defaults).id;
    queuedPrs.delete(worktreePath);
    failureMarks.delete(worktreePath);
    finishReconciliation(worktreePath, true);
    const entry: WorkingEntry = { clickedAt: Date.now(), action, fromState };
    if (action === 'create-pr') prPrompts.set(entry, text);
    set((state) => ({ working: { ...state.working, [worktreePath]: entry }, failures: without(state.failures, worktreePath) }));
    emitClicked(worktreePath, fromState, action);
    const clear = (): void => {
      if (get().working[worktreePath] !== entry) return;
      const failure = action === 'create-pr' ? 'unknown' : undefined;
      set((state) => ({ working: without(state.working, worktreePath), failures: failure === undefined ? state.failures : { ...state.failures, [worktreePath]: failure } }));
      emitOutcome(worktreePath, entry, fromState, 'refused', failure);
    };
    try {
      const { accepted, held } = await studio().agentCommand({ type: 'prompt', text });
      if (!accepted) {
        clear();
        return;
      }
      if (held !== true) return;
      if (get().working[worktreePath] !== entry) return;
      if (dispatchedPrs.has(entry)) return;
      const nowHeld: HeldEntry = { heldAt: entry.clickedAt, action, fromState, text };
      if (action === 'create-pr') queuedPrs.set(worktreePath, { entry, text });
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
    studio().onAgentEvent(notePrToolResult);

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
  preparingWorktree = undefined;
  shownStateId = undefined;
  defaultsGeneration = 0;
  queuedPrs.clear();
  failureMarks.clear();
  for (const path of reconcilingPrs.keys()) finishReconciliation(path, false);
  unwatchOpenWorktree?.();
  unwatchOpenWorktree = undefined;
  useGitStatusStore.setState({ rows: {}, defaults: GIT_PILL_SHIPPED_DEFAULTS, working: {}, held: {}, failures: {} });
}

function notePrToolResult(event: StudioEvent): void {
  if (event.cwd === undefined) return;
  if (event.type === 'message.user') {
    const working = useGitStatusStore.getState().working[event.cwd];
    if (working !== undefined && event.ts >= working.clickedAt && prPrompts.get(working) === event.text) dispatchedPrs.add(working);
    const queued = queuedPrs.get(event.cwd);
    queuedPrs.delete(event.cwd);
    if (queued !== undefined && event.text === queued.text && event.ts >= queued.entry.clickedAt) {
      const entry = { ...queued.entry, clickedAt: event.ts };
      useGitStatusStore.setState((state) => ({ working: { ...state.working, [event.cwd!]: entry }, held: without(state.held, event.cwd!) }));
    }
    return;
  }
  const entry = useGitStatusStore.getState().working[event.cwd];
  if (entry?.action !== 'create-pr' || event.ts < entry.clickedAt) return;
  const tools = prTools.get(entry) ?? new Map<string, string>();
  if (event.type === 'tool.start' || event.type === 'tool.update') {
    if (event.type === 'tool.start' && event.kind !== 'execute' && !/create_pull_request/i.test(event.name)) return;
    if (event.type === 'tool.update' && !tools.has(event.toolCallId)) return;
    if (event.type === 'tool.update' && /create_pull_request/i.test(tools.get(event.toolCallId) ?? '')) return;
    const input = event.input !== null && typeof event.input === 'object' ? event.input as Record<string, unknown> : undefined;
    const command = typeof input?.['command'] === 'string' ? input['command'] : typeof input?.['cmd'] === 'string' ? input['cmd'] : event.title ?? tools.get(event.toolCallId) ?? '';
    tools.set(event.toolCallId, event.type === 'tool.start' && /create_pull_request/i.test(event.name) ? `${event.name} ${command}` : command);
    prTools.set(entry, tools);
    return;
  }
  if (event.type !== 'tool.end') return;
  const command = tools.get(event.toolCallId);
  tools.delete(event.toolCallId);
  if (command === undefined) return;
  const pushing = /\bgit\b[^;&|\n]*\bpush\b/.test(command);
  const creatingPr = /\bgh\s+pr\s+create\b|create_pull_request/i.test(command);
  const publishing = pushing || creatingPr;
  const prerequisite = /\bgh\s+(?:auth\b|repo\s+view\b)/.test(command);
  if (!publishing && !prerequisite) return;
  if (event.status === 'failed' || event.isError === true) {
    const failure = classifyPrFailure(`${event.errorMessage ?? ''}\n${event.result ?? ''}`);
    if (failure !== undefined || publishing || !prFailures.has(entry)) prFailures.set(entry, failure ?? 'unknown');
  } else if (event.status === 'completed') {
    const previous = prFailures.get(entry);
    if (creatingPr || (previous === 'sign-in' && /\bgh\s+auth\b/.test(command)) || (previous === 'push-refused' && pushing)) prFailures.delete(entry);
  }
}
