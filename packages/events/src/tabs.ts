import type { GitPillDefaults, GitSnapshotRow } from './git-status.js';

/** 36, not the design's 38; matches `chrome/tabs/geometry.ts`. */
export const WINDOW_BAR_HEIGHT = 36;

export type TabStatus = 'working' | 'done' | 'waiting';

export interface TabSummary {
  id: string;
  name: string;
  isWorking?: boolean;
  /** `done` is cleared by the host on activation; `waiting` is a condition and outlives being looked at (ONL-2364). */
  status?: TabStatus;
  workspacePath?: string;
  purpose: 'projects' | 'project';
  health?: 'gone' | 'failed';
}

/** Each tab holds a live renderer and dev server; past this a machine starts to struggle. */
export const MAX_PROJECT_TABS = 9;

export interface TabsState {
  tabs: TabSummary[];
  activeId?: string;
  canCreate: boolean;
  isHome: boolean;
  canReopen?: true;
  isCreatingDraft?: boolean;
}

export type TabAssignment =
  | { tabId: string; purpose: 'projects' }
  | { tabId: string; purpose: 'project'; workspacePath: string; repoIdentity: string; restoring?: true };

export interface ChromeSlots {
  showFolder?: boolean;
  /** The band takes the screen's own ground and drops its divider, so onboarding reads as one surface (ONL-2625). */
  blendsIntoScreen?: true;
  tabsHidden?: true;
  /** `rightStatus`, the dot on the chat-panel toggle, is absent while that panel is open (ONL-2455). */
  rails?: { left: boolean; right: boolean; rightStatus?: TabStatus };
  /** Facts, not the derived pill state: `@studio/git-ui` depends on this package, so the chrome runs `pillStateOf` itself. */
  git?: {
    row?: GitSnapshotRow;
    defaults: GitPillDefaults;
    isWorking: boolean;
    /** The action or dropdown pick that started the work; absent reads as the state's own. */
    workingAction?: string;
    canSubmit: boolean;
    /** The action main's pen is holding until the turn ends; absent means nothing waits (ONL-2379). */
    queuedAction?: string;
  };
}

export interface ChromeSlotsPush {
  tabId: string;
  slots: ChromeSlots;
}

export type ChromeSlotAction =
  /** `closing` is main's last-tab close, an order rather than a press; the chrome never sets it (ONL-2265). */
  | { tabId: string; slot: 'folder'; closing?: true }
  | { tabId: string; slot: 'rail'; side: 'left' | 'right' }
  | { tabId: string; slot: 'git'; kind: 'action' }
  | { tabId: string; slot: 'git'; kind: 'pick'; option: string };

/** `full`: a light-dismiss popover closes only on a click inside the chrome page, so a shorter extent leaks the click to the tab below. */
export type ChromeExtent =
  | { kind: 'band' }
  | { kind: 'strip'; height: number }
  | { kind: 'full' };

export interface ChromeExtentApplied {
  height: number;
}

/** `editedAt` is the stored thumbnail's write time, ISO: a capture runs only after an edit. */
export interface TabPreview {
  previewUrl?: string;
  editedAt?: string;
  git?: { row: GitSnapshotRow; defaults: GitPillDefaults };
}

/** Which end of the band the operating system draws its window buttons over; `none` leaves them in a native title bar above it. */
export type WindowControlsEdge = 'leading' | 'trailing' | 'none';
