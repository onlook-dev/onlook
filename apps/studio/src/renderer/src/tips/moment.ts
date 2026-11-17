import { useEffect } from 'react';
import { create } from 'zustand';
import { useAppInfoStore } from '../app/store.js';
import { forgetTipBeat } from '../sidebar/footStore.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { onTipsReset } from './early.js';

const TIP_MOMENT_GAP_MS = 2 * 60 * 60 * 1000;

export type TipMomentClaim = 'onboarding' | 'feature';

/** One sitting at a project: the first tip on screen claims it for its kind (ONL-2960). */
export interface TipMoment {
  openedAt: number;
  seenAt: number;
  claim: TipMomentClaim | null;
  isOver: boolean;
}

function freshMoment(now: number): TipMoment {
  return { openedAt: now, seenAt: now, claim: null, isOver: false };
}

function arriveAt(moment: TipMoment | undefined, now: number, gapMs: number): TipMoment {
  if (moment === undefined || now - moment.seenAt >= gapMs) return freshMoment(now);
  return { ...moment, seenAt: now };
}

function claimMoment(moment: TipMoment | undefined, claim: TipMomentClaim, now: number): TipMoment {
  const current = moment ?? freshMoment(now);
  return current.claim === null ? { ...current, claim } : current;
}

function endMoment(moment: TipMoment | undefined, now: number): TipMoment {
  return { ...(moment ?? freshMoment(now)), isOver: true };
}

export interface MomentGate {
  claim: TipMomentClaim | null;
  isOver: boolean;
  /** The dev override: every moment is a new person's onboarding moment. */
  isOnboardingOnly: boolean;
}

export const OPEN_MOMENT: MomentGate = { claim: null, isOver: false, isOnboardingOnly: false };

export function momentGate(moment: TipMoment | undefined, isOnboardingOnly: boolean): MomentGate {
  return { claim: moment?.claim ?? null, isOver: moment?.isOver ?? false, isOnboardingOnly };
}

/** Whether a tip of this kind may first appear; one already up keeps its place regardless. */
export function momentAllows(gate: MomentGate, kind: TipMomentClaim): boolean {
  if (gate.isOver) return false;
  if (kind === 'feature') return gate.claim === null && !gate.isOnboardingOnly;
  return gate.claim !== 'feature';
}

/** Per Project path, for this launch, so a project's first open in a launch opens a moment. */
export const useTipMomentStore = create<{ moments: Record<string, TipMoment> }>()(() => ({ moments: {} }));

function put(path: string, moment: TipMoment): void {
  useTipMomentStore.setState((state) => ({ moments: { ...state.moments, [path]: moment } }));
}

export function arriveAtProject(path: string, now: number, gapMs: number): void {
  const before = useTipMomentStore.getState().moments[path];
  const after = arriveAt(before, now, gapMs);
  put(path, after);
  if (before !== undefined && after.openedAt !== before.openedAt) forgetTipBeat(path);
}

export function leaveProject(path: string, now: number): void {
  const moment = useTipMomentStore.getState().moments[path];
  if (moment !== undefined) put(path, { ...moment, seenAt: now });
}

export function claimTipMoment(path: string, claim: TipMomentClaim, now: number = Date.now()): void {
  const before = useTipMomentStore.getState().moments[path];
  const after = claimMoment(before, claim, now);
  if (after !== before) put(path, after);
}

export function endTipMoment(path: string, now: number = Date.now()): void {
  put(path, endMoment(useTipMomentStore.getState().moments[path], now));
}

export function resetTipMoments(): void {
  useTipMomentStore.setState({ moments: {} });
}

onTipsReset(resetTipMoments);

/** Opens and keeps the tab's tip moment; mounted with the editor, since the Left Rail foot unmounts with its panel. */
export function useTipMoments(): void {
  const path = useWorkspaceStore((state) => state.workspace?.workspacePath ?? null);
  const gapMs = useAppInfoStore((state) => state.tipMomentGapMs) ?? TIP_MOMENT_GAP_MS;
  useEffect(() => {
    if (path === null) return;
    arriveAtProject(path, Date.now(), gapMs);
    const away = (): void => leaveProject(path, Date.now());
    const back = (): void => {
      if (document.visibilityState === 'visible') arriveAtProject(path, Date.now(), gapMs);
    };
    const onVisibility = (): void => (document.visibilityState === 'hidden' ? away() : back());
    window.addEventListener('blur', away);
    window.addEventListener('pagehide', away);
    window.addEventListener('focus', back);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', away);
      window.removeEventListener('pagehide', away);
      window.removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', onVisibility);
      away();
    };
  }, [path, gapMs]);
}
