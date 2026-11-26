import { create } from 'zustand';
import type { ServerEntryState } from '@studio/events';

export interface StartControlFacts {
  /** The `start-control` flag. */
  isOn: boolean;
  isBlankProject: boolean;
  /** An import's own setup is under way, not a rerun or a restart. */
  isImportSettingUp: boolean;
  /** The project's app has been up since Studio launched, this render included. */
  hasBeenUp: boolean;
  serverEntries: readonly ServerEntryState[];
  hasFrames: boolean;
  isCreating: boolean;
}

/** Hidden while a new draft or an import sets up, it comes in once the app is up and stays (ONL-2960, ONL-2961). */
export function startControlShown(facts: StartControlFacts): boolean {
  if (!facts.isOn || facts.hasBeenUp) return true;
  if (facts.serverEntries.some((entry) => entry.ownership !== 'users-own' && entry.everMeasuredLive)) return true;
  return !facts.isImportSettingUp && (!facts.isBlankProject || (facts.hasFrames && !facts.isCreating));
}

/** Per project path, for this launch: a remount must not hide Start again. */
export const useAppBeenUpStore = create<{ up: Record<string, true> }>()(() => ({ up: {} }));

export function noteAppUp(projectPath: string): void {
  if (useAppBeenUpStore.getState().up[projectPath] === true) return;
  useAppBeenUpStore.setState((state) => ({ up: { ...state.up, [projectPath]: true } }));
}
