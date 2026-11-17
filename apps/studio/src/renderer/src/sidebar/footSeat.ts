import { create } from 'zustand';
import type { ImportSetupProgress, ProjectCreateState, TipResolveReason } from '@studio/events';
import { useAgentStore } from '../agent/store.js';
import { useStatusLines } from '../agentStatus/useStatusLines.js';
import { isRailHidden, useCanvasStore } from '../canvas/store.js';
import { useImportSetupProgress } from '../create/setupProgress.js';
import { useFlag } from '../flags/store.js';
import { log as rendererLog } from '../log.js';
import type { LeftPanelView } from '../rail/leftPanel.js';
import { useLeftPanelView } from '../rail/useLeftPanelView.js';
import { useSettingsStore } from '../settings/store.js';
import { earlyTipContext, INSPIRE_SPENT_KEY, isEarlyTipAudience, isTipSpent, onTipsReset, useEarlyTipContext, type EarlyTipContext } from '../tips/early.js';
import { momentAllows, momentGate, useTipMomentStore, type MomentGate, type TipMomentClaim } from '../tips/moment.js';
import { useOnScreenStore } from '../tips/onScreen.js';
import { isBlankWorkspace, useWorkspaceStore } from '../workspace/store.js';
import { useNextTasksOfferStore, useTipBeatStore } from './footStore.js';
import { scrollTipFrameLanded, useScrollTipFrame } from './scrollTipStore.js';
import { promptTipEnded, promptTipWasShown, usePromptTipStore } from './promptTipStore.js';
import { liveFramePorts } from '../canvas/model.js';

export type ShownSetupProgress =
  | Extract<ImportSetupProgress, { state: 'running' }>
  | (Extract<ImportSetupProgress, { state: 'failed' }> & { at: 2 | 3 });

/** What holds the bottom of the foot: setup's step bar, else the status list (ONL-2961, ONL-2973). */
export type FootSeat = { kind: 'setup'; progress: ShownSetupProgress } | { kind: 'agent-status' } | null;

export type FootTip = 'inspire' | 'scroll' | 'prompt' | 'invite';

/** The tip draws above the seat (ONL-2995). */
export interface Foot {
  seat: FootSeat;
  tip: FootTip | null;
}

/** `due` lets a tip first appear; `staying` keeps one already up. */
export interface TipStanding {
  due: boolean;
  staying: boolean;
}

/** `leaving` is the tip folding away after a press; it still holds its place until the fold ends. */
export type InspireTipPhase = 'open' | 'leaving' | 'spent';

const TIP_ORDER: readonly FootTip[] = ['inspire', 'scroll', 'prompt', 'invite'];

export function tipClaim(tip: FootTip): TipMomentClaim {
  return tip === 'invite' ? 'feature' : 'onboarding';
}

type HoldBackInput = Pick<FootInput, 'needsYou' | 'isOfferingNextTasks' | 'isFootOn' | 'isBeatOver'>;

/** No tip first appears during the project's opening beat, or while the agent waits on the person or offers next-task cards; one already up stays (ONL-2960). */
function tipsHeldBack(input: HoldBackInput): boolean {
  if (input.isFootOn && !input.isBeatOver) return true;
  return input.needsYou || input.isOfferingNextTasks;
}

/** The prompt tip comes in beside the next-task cards, so only the beat and the person's ask hold it back. */
function promptHeldBack(input: HoldBackInput): boolean {
  if (input.isFootOn && !input.isBeatOver) return true;
  return input.needsYou;
}

/** What the foot's growing seat draws: the tip grown out of the Tips pill, or the pill itself when no tip is up (ONL-2960). */
export type FootGrowth = { kind: 'tip'; tip: FootTip } | { kind: 'pill' } | null;

export function footGrowth(foot: Foot, place: { isFootOn: boolean; isPillShown: boolean }): FootGrowth {
  if (!place.isFootOn) return null;
  if (foot.tip !== null) return { kind: 'tip', tip: foot.tip };
  return place.isPillShown ? { kind: 'pill' } : null;
}

/** With the foot on, it holds the Tips pill wherever it is on screen; the corner draws it elsewhere. */
export function footHoldsPill(state: { isFootOn: boolean; isLeftPanelHidden: boolean; leftPanelView: LeftPanelView }): boolean {
  return state.isFootOn && !state.isLeftPanelHidden && state.leftPanelView === 'designs';
}

export interface TipResolution {
  tip: FootTip;
  reason: TipResolveReason;
}

export interface ResolutionInput {
  heldTip: FootTip | null;
  /** What the foot draws now; the held tip lags it by a render. */
  tipUp: FootTip | null;
  /** The tip up has been on screen for `TIP_MIN_SHOWN_MS`. */
  isHeldSettled: boolean;
  needsYou: boolean;
  /** The ask is a parked question rather than an approval. */
  needsAnswer: boolean;
  isBlankProject: boolean;
  tip: InspireTipPhase;
  hasCanvasObjects: boolean;
  isPromptStaying: boolean;
  /** Used, dismissed or run out. */
  isPromptEnded: boolean;
}

const askReason = (input: ResolutionInput): TipResolveReason => (input.needsAnswer ? 'question' : 'approval');

/** What ends a tip's moment without the person acting on it; an ask or another path waits until the tip up has been read (ONL-2960). */
export function tipResolution(input: ResolutionInput): TipResolution | null {
  const held = input.heldTip;
  if (held === 'prompt' && !input.isPromptStaying && !input.isPromptEnded) return { tip: held, reason: input.needsYou ? askReason(input) : 'other_path' };
  if (held === null || !input.isHeldSettled) return null;
  if (held === 'inspire') return input.isBlankProject && input.tip === 'open' && input.hasCanvasObjects ? { tip: held, reason: 'other_path' } : null;
  if (input.needsYou) return { tip: held, reason: askReason(input) };
  return null;
}

/** The canvas got an object before the inspiration tip ever came up: spent unseen, so nothing is sent for it. */
export function inspireTipPreempted(input: Pick<ResolutionInput, 'tipUp' | 'isBlankProject' | 'tip' | 'hasCanvasObjects'>): boolean {
  return input.tipUp !== 'inspire' && input.isBlankProject && input.tip === 'open' && input.hasCanvasObjects;
}

function shownSetupProgress(setup: ImportSetupProgress | null): ShownSetupProgress | null {
  if (setup === null) return null;
  if (setup.state === 'running') return setup;
  if (setup.state === 'failed' && (setup.at === 2 || setup.at === 3)) return { ...setup, at: setup.at };
  return null;
}

/** One tip at a time: the one up keeps its place while it is staying, and only then does the first due tip in `order` take it. */
export function pickTip<K extends string>(held: K | null, order: readonly K[], standing: Record<K, TipStanding>): K | null {
  if (held !== null && standing[held].staying) return held;
  return order.find((kind) => standing[kind].due) ?? null;
}

export interface FootInput {
  /** The `rail-foot` flag: the seat, the beat and the tips growing out of the pill. Off, a tip whose own flag is on still draws, alone. */
  isFootOn: boolean;
  setup: ImportSetupProgress | null;
  isTipOn: boolean;
  isBlankProject: boolean;
  tip: InspireTipPhase;
  isAgentWorking: boolean;
  heldTip: FootTip | null;
  isInviteTipOn: boolean;
  /** Main's notification preference reads `pending` with notifications off. */
  isInvitePending: boolean;
  /** A parked question or approval waits on the person. */
  needsYou: boolean;
  /** Next-task cards the person can tap are on screen. */
  isOfferingNextTasks: boolean;
  /** The project has sat open for the beat this launch. */
  isBeatOver: boolean;
  hasStatusLines: boolean;
  isScrollTipOn: boolean;
  /** The Frame "Add inspiration" placed has landed, and the scroll tip is not spent. */
  isScrollFrameLanded: boolean;
  isPromptTipOn: boolean;
  /** New to Studio by the tips baseline, or tips forced on every project. */
  isEarlyTipAudience: boolean;
  /** Shown here before, in this launch or an earlier one. */
  wasPromptShown: boolean;
  /** Used or run out this launch. */
  isPromptEnded: boolean;
  /** The next-task cards have sat unpicked for the prompt tip's delay. */
  isPromptDue: boolean;
  /** A Frame on the Canvas shows the app live. */
  isAppLive: boolean;
  moment: MomentGate;
}

function inspireStanding(input: FootInput): TipStanding {
  const open = input.isTipOn && input.isBlankProject && input.tip === 'open';
  return { due: open && !tipsHeldBack(input) && momentAllows(input.moment, 'onboarding'), staying: open || (input.isTipOn && input.tip === 'leaving') };
}

/** The agent working only keeps the invite from first appearing; once up it stays through the turn. */
function inviteStanding(input: FootInput, seat: FootSeat): TipStanding {
  const staying = input.isInviteTipOn && input.isInvitePending && seat?.kind !== 'setup';
  return { due: staying && !input.isAgentWorking && !tipsHeldBack(input) && momentAllows(input.moment, 'feature'), staying };
}

/** Due once the inspiration Frame from the tip has landed; it stays until used (ONL-2960). */
function scrollStanding(input: FootInput, seat: FootSeat): TipStanding {
  const staying = input.isScrollTipOn && input.isScrollFrameLanded && seat?.kind !== 'setup';
  return { due: staying && !tipsHeldBack(input) && momentAllows(input.moment, 'onboarding'), staying };
}

/** An imported project's app is up and its next-task cards wait on a pick, for someone new to Studio; it leaves with the cards (ONL-2960). */
function promptStanding(input: FootInput, seat: FootSeat): TipStanding {
  const staying = input.isPromptTipOn && input.isEarlyTipAudience && !input.isBlankProject && !input.isPromptEnded && seat?.kind !== 'setup' && input.isAppLive && input.isOfferingNextTasks;
  return { due: staying && !input.wasPromptShown && input.isPromptDue && !input.isAgentWorking && !promptHeldBack(input) && momentAllows(input.moment, 'onboarding'), staying };
}

/** What starts the prompt tip's delay: everything it waits on but the delay itself and the moment. */
export function promptWaitsOnPick(input: FootInput): boolean {
  return input.heldTip === null && promptStanding(input, seatOf(input)).staying && !input.wasPromptShown && !input.isAgentWorking && !input.needsYou;
}

function seatOf(input: FootInput): FootSeat {
  if (!input.isFootOn) return null;
  const progress = shownSetupProgress(input.setup);
  return progress !== null ? { kind: 'setup', progress } : { kind: 'agent-status' };
}

/** The one place that decides what the foot of the Left Rail holds. */
export function footSeat(input: FootInput): Foot {
  const seat = seatOf(input);
  const standing = { inspire: inspireStanding(input), scroll: scrollStanding(input, seat), prompt: promptStanding(input, seat), invite: inviteStanding(input, seat) };
  if (input.isFootOn && input.heldTip !== null && !standing[input.heldTip].staying) return { seat, tip: null };
  return { seat, tip: pickTip(input.heldTip, TIP_ORDER, standing) };
}

/** The foot mounts only inside a visible Designs panel, so a seated tip elsewhere is on no screen. */
export function footTipShown(kind: FootTip, input: { tip: FootTip | null; isLeftPanelHidden: boolean; leftPanelView: LeftPanelView }): boolean {
  return input.tip === kind && !input.isLeftPanelHidden && input.leftPanelView === 'designs';
}

const IMPORT_UNDER_WAY: ReadonlySet<ProjectCreateState['kind']> = new Set(['planning', 'copying', 'installing', 'starting']);

/** Only the import's own setup takes the control: a run after a failure, a reopen or a restart keeps it, as that run's only Stop (ONL-2961). */
export function setupHidesRunControl(progress: ImportSetupProgress | null, create: ProjectCreateState | null): boolean {
  return progress?.state === 'running' && create !== null && IMPORT_UNDER_WAY.has(create.kind);
}

const footLog = rendererLog('sidebar');

interface InspireTipStore {
  phases: Record<string, InspireTipPhase>;
}

export const useInspireTipStore = create<InspireTipStore>()(() => ({ phases: {} }));

let spentCache: string[] | null = null;

function storedSpent(): string[] {
  if (spentCache !== null) return spentCache;
  spentCache = readSpent();
  return spentCache;
}

function readSpent(): string[] {
  try {
    const raw = window.localStorage.getItem(INSPIRE_SPENT_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch (error) {
    footLog.warn('inspire tip read failed', { message: error instanceof Error ? error.message : 'unknown' });
    return [];
  }
}

function inspireTipPhase(state: InspireTipStore, projectPath: string, early: EarlyTipContext = earlyTipContext('inspire')): InspireTipPhase {
  return state.phases[projectPath] ?? (isTipSpent(storedSpent(), projectPath, early) ? 'spent' : 'open');
}

onTipsReset(() => {
  spentCache = null;
  useInspireTipStore.setState({ phases: {} });
});

function setPhase(projectPath: string, phase: InspireTipPhase): void {
  useInspireTipStore.setState((state) => ({ phases: { ...state.phases, [projectPath]: phase } }));
  if (phase === 'open') return;
  const spent = storedSpent();
  if (spent.includes(projectPath)) return;
  spentCache = [...spent, projectPath];
  try {
    window.localStorage.setItem(INSPIRE_SPENT_KEY, JSON.stringify([...spent, projectPath]));
  } catch (error) {
    footLog.warn('inspire tip write failed', { message: error instanceof Error ? error.message : 'unknown' });
  }
}

export const beginTipLeaving = (projectPath: string): void => setPhase(projectPath, 'leaving');
export const spendTip = (projectPath: string): void => setPhase(projectPath, 'spent');

/** How long a tip stays up before anything but the person's own act may end it (ONL-2960). */
export const TIP_MIN_SHOWN_MS = 5_000;

/** How long a tip stays up after the person does what it teaches, so it does not vanish under their hand (ONL-2960). */
export const TIP_DONE_LINGER_MS = 3_000;

interface HeldTip {
  tip: FootTip;
  isSettled: boolean;
}

/** Which tip is up per Project path, for this launch: it keeps its place until it stops staying (ONL-2995). */
export const useHeldTipStore = create<{ held: Record<string, HeldTip | null> }>()(() => ({ held: {} }));

const settling = new Map<string, ReturnType<typeof setTimeout>>();

/** True when the tip that was up has gone, so the foot rests a beat before the next one grows (ONL-2960). */
export function holdTip(projectPath: string, tip: FootTip | null, minShownMs: number = TIP_MIN_SHOWN_MS): boolean {
  const held = useHeldTipStore.getState().held[projectPath] ?? null;
  if ((held?.tip ?? null) === tip) return false;
  clearTimeout(settling.get(projectPath));
  settling.delete(projectPath);
  useHeldTipStore.setState((state) => ({ held: { ...state.held, [projectPath]: tip === null ? null : { tip, isSettled: false } } }));
  if (tip !== null) {
    settling.set(projectPath, setTimeout(() => {
      settling.delete(projectPath);
      useHeldTipStore.setState((state) => (state.held[projectPath]?.tip === tip ? { held: { ...state.held, [projectPath]: { tip, isSettled: true } } } : state));
    }, minShownMs));
  }
  return held !== null && tip === null;
}

export function forgetHeldTips(): void {
  for (const timer of settling.values()) clearTimeout(timer);
  settling.clear();
  useHeldTipStore.setState({ held: {} });
}

onTipsReset(forgetHeldTips);

/** Main still reads the invitation `pending`; this launch's resolution keeps it off the foot until main's answer changes. */
const useInviteResolvedStore = create<{ isResolved: boolean }>()(() => ({ isResolved: false }));

export function resolveInviteForLaunch(): void {
  useInviteResolvedStore.setState({ isResolved: true });
}

export interface FootSeatView {
  foot: Foot;
  path: string | null;
  phase: InspireTipPhase;
  isBlankProject: boolean;
  isAgentWorking: boolean;
  hasStatusLines: boolean;
  isFootOn: boolean;
  isPromptWaiting: boolean;
  resolution: TipResolution | null;
  isInspirePreempted: boolean;
}

export function useFootSeat(): FootSeatView {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const path = workspace?.workspacePath ?? null;
  const isBlankProject = isBlankWorkspace(workspace);
  const early = useEarlyTipContext('inspire');
  const phase = useInspireTipStore((state) => (path === null ? 'spent' : inspireTipPhase(state, path, early)));
  const isAgentWorking = useAgentStore((state) => state.isStreaming);
  const setup = useImportSetupProgress();
  const isTipOn = useFlag('blank-first-moment');
  const isFootOn = useFlag('rail-foot');
  const heldTip = useHeldTipStore((state) => (path === null ? null : (state.held[path]?.tip ?? null)));
  const isHeldSettled = useHeldTipStore((state) => path !== null && state.held[path]?.isSettled === true);
  const isInviteTipOn = useFlag('invite-tip');
  const isInviteResolved = useInviteResolvedStore((state) => state.isResolved);
  const isInvitePending = useSettingsStore((state) => !state.notifications.enabled && state.notifications.invitation === 'pending') && !isInviteResolved;
  const needsYou = useAgentStore((state) => state.needsAttention);
  const needsAnswer = useAgentStore((state) => state.needsAnswer);
  const hasCanvasObjects = useCanvasStore((state) => state.nodes.length > 0);
  const hasNextTasksOpen = useNextTasksOfferStore((state) => state.isOpen);
  const isChatHidden = useCanvasStore((state) => isRailHidden(state, 'right'));
  const isOfferingNextTasks = hasNextTasksOpen && !isChatHidden;
  const isBeatOver = useTipBeatStore((state) => path !== null && state.over[path] === true);
  const hasStatusLines = useStatusLines().length > 0;
  const isScrollTipOn = useFlag('blank-first-moment');
  const scrollFrame = useScrollTipFrame(path);
  const isScrollFrameLanded = useCanvasStore((state) => scrollTipFrameLanded(scrollFrame, state));
  const isPromptTipOn = useFlag('prompt-tip');
  const wasPromptShown = usePromptTipStore((state) => path !== null && promptTipWasShown(state, path));
  const isPromptEnded = usePromptTipStore((state) => path !== null && promptTipEnded(state, path));
  const isPromptDue = usePromptTipStore((state) => path !== null && state.due === path);
  const isAppLive = useCanvasStore((state) => liveFramePorts(state.nodes).length > 0);
  const tipMoment = useTipMomentStore((state) => (path === null ? undefined : state.moments[path]));
  const moment = momentGate(tipMoment, early.everyProject);
  const input: FootInput = {
    isFootOn, setup, isTipOn, isBlankProject, tip: phase, isAgentWorking, heldTip, isInviteTipOn, isInvitePending, needsYou,
    isOfferingNextTasks, isBeatOver, hasStatusLines, isScrollTipOn, isScrollFrameLanded,
    isPromptTipOn, isEarlyTipAudience: isEarlyTipAudience(early), wasPromptShown, isPromptEnded, isPromptDue, isAppLive, moment,
  };
  const foot = footSeat(input);
  const resolutionInput: ResolutionInput = {
    heldTip, tipUp: foot.tip, isHeldSettled, needsYou, needsAnswer, isBlankProject, tip: phase, hasCanvasObjects,
    isPromptStaying: promptStanding(input, seatOf(input)).staying, isPromptEnded,
  };
  return {
    foot, path, phase, isBlankProject, isAgentWorking, hasStatusLines, isFootOn, isPromptWaiting: promptWaitsOnPick(input),
    resolution: tipResolution(resolutionInput), isInspirePreempted: inspireTipPreempted(resolutionInput),
  };
}

export function useFootHoldsPill(): boolean {
  const isFootOn = useFlag('rail-foot');
  const isLeftPanelHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  return footHoldsPill({ isFootOn, isLeftPanelHidden, leftPanelView: useLeftPanelView() });
}

function useFootTipShown(kind: FootTip): boolean {
  const { foot } = useFootSeat();
  const isLeftPanelHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  return footTipShown(kind, { tip: foot.tip, isLeftPanelHidden, leftPanelView: useLeftPanelView() });
}

export const useInspireTipShown = (): boolean => useFootTipShown('inspire');

export function useFootTipSeen(kind: FootTip): boolean {
  const isShown = useFootTipShown(kind);
  return useOnScreenStore((state) => state.isOnScreen) && isShown;
}
