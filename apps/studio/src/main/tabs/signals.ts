/** Electron-free on purpose: an import of `host.ts` here pulls `BaseWindow` into every caller's unit suite (ONL-2206). */
import type { TabStatus, WorkspaceCreated } from '@studio/events';

import type { TabCommand } from '@studio/events';

export type TabCommandSource = { viewId: number } | { windowId: number };
type CommandSignal = (command: TabCommand, source: TabCommandSource) => boolean;
type WorkspaceSignal = (viewId: number, workspacePath: string | undefined) => void;
type WorkingSignal = (cwd: string, isWorking: boolean) => void;
type StatusSignal = (cwd: string, status: TabStatus | undefined) => void;
type CloseActiveSignal = () => void;
type LabelsSignal = () => void;
type BackgroundTabSignal = (sourcePath: string) => Promise<WorkspaceCreated | null> | 'at-limit' | undefined;
type SettingsSignal = () => void;

let onWorkspace: WorkspaceSignal | undefined;
let onWorking: WorkingSignal | undefined;
let onStatus: StatusSignal | undefined;
let onCloseActive: CloseActiveSignal | undefined;
let onLabels: LabelsSignal | undefined;
let onCommand: CommandSignal | undefined;
let onBackgroundTab: BackgroundTabSignal | undefined;
let onSettings: SettingsSignal | undefined;

export function observeTabSignals(observer: {
  workspace: WorkspaceSignal;
  working: WorkingSignal;
  status: StatusSignal;
  closeActive: CloseActiveSignal;
  labels: LabelsSignal;
  command: CommandSignal;
  backgroundTab: BackgroundTabSignal;
  settings: SettingsSignal;
}): void {
  onWorkspace = observer.workspace;
  onWorking = observer.working;
  onStatus = observer.status;
  onCloseActive = observer.closeActive;
  onLabels = observer.labels;
  onCommand = observer.command;
  onBackgroundTab = observer.backgroundTab;
  onSettings = observer.settings;
}

/** Settings is a modal over the Tab that asked, so no Tab is revealed (ONL-2499). */
export function requestSettingsView(): void {
  onSettings?.();
}

export function requestTabCommand(command: TabCommand, source: TabCommandSource): boolean {
  return onCommand?.(command, source) ?? false;
}

export function noteTabLabelsChanged(): void {
  onLabels?.();
}

export function noteTabWorkspace(viewId: number, workspacePath: string | undefined): void {
  onWorkspace?.(viewId, workspacePath);
}

export function noteTabWorking(cwd: string, isWorking: boolean): void {
  onWorking?.(cwd, isWorking);
}

export function noteTabStatus(cwd: string, status: TabStatus | undefined): void {
  onStatus?.(cwd, status);
}

export function requestCloseActiveTab(): void {
  onCloseActive?.();
}

export function requestBackgroundTab(sourcePath: string): Promise<WorkspaceCreated | null> | 'at-limit' | undefined {
  return onBackgroundTab?.(sourcePath);
}

export function resetTabSignals(): void {
  onWorkspace = undefined;
  onWorking = undefined;
  onStatus = undefined;
  onCloseActive = undefined;
  onLabels = undefined;
  onCommand = undefined;
  onBackgroundTab = undefined;
  onSettings = undefined;
}
