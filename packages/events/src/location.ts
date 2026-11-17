export type StudioLocation =
  | { kind: 'projects' }
  | {
      kind: 'project';
      repoIdentity: string;
      /** Absent on records written before the field existed; `resolveProject` falls back to the newest live worktree. */
      workspacePath?: string;
    };

/** Launch always opens the projects view; the window's own tabs restore beside it (ONL-2090, ONL-2208). */
export type LaunchLocation = { kind: 'projects' };

export interface TabRecord {
  workspacePath: string;
  repoIdentity: string;
}

/** Home is not a member: the active state may name no tab at all. */
export type WindowActive = { kind: 'home' } | { kind: 'tab'; workspacePath: string };

export interface WindowRecord {
  tabs: TabRecord[];
  active: WindowActive;
}

/** Per window, not a flat tab list: the detach-to-window foundation (ONL-2208). */
export interface StudioLocationRecord {
  current: StudioLocation;
  windows: WindowRecord[];
}

export const HOME_ACTIVE: WindowActive = { kind: 'home' };
