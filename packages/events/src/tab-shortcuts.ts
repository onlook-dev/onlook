export type TabCommand = { kind: 'new' } | { kind: 'jump'; number: number } | { kind: 'cycle' } | { kind: 'reopen' };

export interface TabShortcut {
  id: string;
  keys: string;
  accelerator: string;
  command: TabCommand;
}

// Static data avoids shared require() chunks in sandboxed guest preloads (ONL-2211).
export const TAB_SHORTCUTS: readonly TabShortcut[] = [
  { id: 'tabs.new', keys: 'mod+t', accelerator: 'CmdOrCtrl+T', command: { kind: 'new' } },
  { id: 'tabs.jump-1', keys: 'mod+1', accelerator: 'CmdOrCtrl+1', command: { kind: 'jump', number: 1 } },
  { id: 'tabs.jump-2', keys: 'mod+2', accelerator: 'CmdOrCtrl+2', command: { kind: 'jump', number: 2 } },
  { id: 'tabs.jump-3', keys: 'mod+3', accelerator: 'CmdOrCtrl+3', command: { kind: 'jump', number: 3 } },
  { id: 'tabs.jump-4', keys: 'mod+4', accelerator: 'CmdOrCtrl+4', command: { kind: 'jump', number: 4 } },
  { id: 'tabs.jump-5', keys: 'mod+5', accelerator: 'CmdOrCtrl+5', command: { kind: 'jump', number: 5 } },
  { id: 'tabs.jump-6', keys: 'mod+6', accelerator: 'CmdOrCtrl+6', command: { kind: 'jump', number: 6 } },
  { id: 'tabs.jump-7', keys: 'mod+7', accelerator: 'CmdOrCtrl+7', command: { kind: 'jump', number: 7 } },
  { id: 'tabs.jump-8', keys: 'mod+8', accelerator: 'CmdOrCtrl+8', command: { kind: 'jump', number: 8 } },
  { id: 'tabs.jump-9', keys: 'mod+9', accelerator: 'CmdOrCtrl+9', command: { kind: 'jump', number: 9 } },
  { id: 'tabs.reopen', keys: 'mod+shift+t', accelerator: 'CmdOrCtrl+Shift+T', command: { kind: 'reopen' } },
  { id: 'tabs.cycle', keys: 'ctrl+tab', accelerator: 'Ctrl+Tab', command: { kind: 'cycle' } },
];
