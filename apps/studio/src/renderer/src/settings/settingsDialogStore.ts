import { create } from 'zustand';
import type { SettingsOpenSource } from '@studio/events';
import { telemetryProjectFields } from '../workspace/store.js';
import { studio } from '../bridge.js';

export type SettingsArea = 'project' | 'global';

export type { SettingsOpenSource };

export interface SettingsDialogState {
  isOpen: boolean;
  /** Survives a close, so reopening lands where the person was. */
  area: SettingsArea;
  /** The door of the open now showing; `settings_opened` carries it (ONL-2499). */
  source: SettingsOpenSource | null;
}

const INITIAL: SettingsDialogState = { isOpen: false, area: 'global', source: null };

export const useSettingsDialogStore = create<SettingsDialogState>()(() => INITIAL);

/** A request over an open modal is not a second open: it keeps the area being read, and reports nothing. */
export function openSettings(source: SettingsOpenSource): void {
  if (useSettingsDialogStore.getState().isOpen) return;
  useSettingsDialogStore.setState({ isOpen: true, source });
  studio().telemetryEvent({ event: 'settings_opened', properties: { ...telemetryProjectFields(), source } });
}

export function closeSettings(): void {
  useSettingsDialogStore.setState({ isOpen: false });
}

export function setSettingsArea(area: SettingsArea): void {
  useSettingsDialogStore.setState({ area });
}

export function resetSettingsDialogForTesting(): void {
  useSettingsDialogStore.setState(INITIAL);
}
