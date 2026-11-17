import { create } from 'zustand';
import { machineHasFailure, type MachineCheckId, type MachineHelpId } from '@studio/events';
import { flagEnabled } from '../flags/store.js';
import { ignoreRefusal } from '../refusal.js';
import type { StringKey } from '@studio/i18n';
import type { MachineRecovery, MachineState } from './machine-rows.js';
import { studio } from '../bridge.js';

export type { MachineState } from './machine-rows.js';

export const useMachineStore = create<MachineState>(() => ({
  snapshot: { checks: [], platform: 'mac', canChooseFolder: false },
  checking: false,
  action: undefined,
  stalled: undefined,
  detail: undefined,
  notice: undefined,
}));

let generation = 0;
let actions = 0;

export function machineBlocked(state: MachineState): boolean {
  return machineHasFailure(state.snapshot.checks);
}

export function machineCreationBlocked(): boolean {
  return machineBlocked(useMachineStore.getState());
}

export function machineNeedsAttention(state: MachineState): boolean {
  return state.notice === 'machine.unavailable' || state.snapshot.checks.some((check) => check.status !== 'passed');
}

/** The opening run: every row is waiting, so the whole list reads as checking. Off, nothing is asked of main at all (ONL-3111). */
export async function refreshMachineChecks(): Promise<void> {
  if (!flagEnabled('machine-check')) return;
  const run = ++generation;
  useMachineStore.setState({ checking: true, notice: undefined });
  try {
    const snapshot = await studio().machineCheck();
    if (run === generation) useMachineStore.setState({ snapshot });
  } catch {
    if (run === generation) useMachineStore.setState({ notice: 'machine.unavailable' });
  } finally {
    if (run === generation) useMachineStore.setState({ checking: false });
  }
}

type Recheck = 'recovered' | 'failing' | 'refused' | 'superseded';

/** A result that is no longer the current owner's is dropped rather than written over a newer one (ONL-3111). */
async function recheck(action: { id: MachineCheckId; token: number }): Promise<Recheck> {
  const run = ++generation;
  try {
    const snapshot = await studio().machineCheck();
    if (run !== generation || !current(action)) return 'superseded';
    useMachineStore.setState({ snapshot });
    return snapshot.checks.some((check) => check.id === action.id && check.status === 'failed') ? 'failing' : 'recovered';
  } catch {
    return run === generation && current(action) ? 'refused' : 'superseded';
  }
}

function current(action: { token: number }): boolean {
  return useMachineStore.getState().action?.token === action.token;
}

function begin(id: MachineCheckId, kind: MachineRecovery): { id: MachineCheckId; token: number } {
  const action = { id, kind, token: ++actions };
  useMachineStore.setState({ action, notice: undefined });
  return action;
}

/** Only the owner closes its own action, and only an action that could stall says so. */
function settle(action: { token: number }, patch: Partial<MachineState> = {}): void {
  if (!current(action)) return;
  useMachineStore.setState({ action: undefined, ...patch });
}

export async function installMachineTools(): Promise<void> {
  const action = begin('git', 'install');
  const result = await studio().machineInstallTools().catch((error: unknown) => {
    ignoreRefusal('onboarding', 'machine-install-tools')(error);
    return 'failed' as const;
  });
  if (!current(action)) return;
  const verified = result === 'installed' ? await recheck(action) : 'failing';
  if (verified === 'superseded') return;
  settle(action, { stalled: verified === 'recovered' ? undefined : 'git', notice: verified === 'refused' ? 'machine.unavailable' : undefined });
}

export async function chooseMachineFolder(): Promise<void> {
  const action = begin('workspace', 'choose');
  const result = await studio().machineChooseFolder().catch((error: unknown) => {
    ignoreRefusal('onboarding', 'machine-choose-folder')(error);
    return 'unavailable' as const;
  });
  if (!current(action)) return;
  const verified = result === 'chosen' ? await recheck(action) : 'failing';
  if (verified === 'superseded') return;
  settle(action, {
    notice: verified === 'refused' ? 'machine.unavailable' : result === 'unavailable' ? 'machine.folderUnavailable' : undefined,
  });
}

/** Check again, from the detail view: it stays open and says so when the problem is still there, and lands on the list when the person has already left it. */
export async function recheckMachineCheck(id: MachineCheckId, again: StringKey): Promise<void> {
  const action = begin(id, 'fix');
  const verified = await recheck(action);
  if (verified === 'superseded' || !current(action)) return;
  const recovered = verified === 'recovered';
  useMachineStore.setState((state) => ({
    action: undefined,
    stalled: recovered && state.stalled === id ? undefined : state.stalled,
    detail: recovered ? undefined : state.detail,
    notice: recovered ? undefined : verified === 'refused' ? 'machine.unavailable' : state.detail === id ? again : undefined,
  }));
}

export function openMachineDetail(id: MachineCheckId): void {
  useMachineStore.setState({ detail: id, notice: undefined });
}

/** Leaving the detail view abandons nothing: a check still running keeps its owner and lands on the list. */
export function closeMachineDetail(): void {
  useMachineStore.setState({ detail: undefined, notice: undefined });
}

export async function openMachineHelp(help: MachineHelpId): Promise<void> {
  const opened = await studio().machineOpenHelp(help).catch((error: unknown) => {
    ignoreRefusal('onboarding', 'machine-open-help')(error);
    return false;
  });
  if (!opened) useMachineStore.setState({ notice: 'machine.helpUnavailable' });
}

export async function copyMachineCommand(command: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(command);
    return true;
  } catch {
    useMachineStore.setState({ notice: 'machine.copyFailed' });
    return false;
  }
}
