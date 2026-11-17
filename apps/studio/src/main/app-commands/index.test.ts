import { afterEach, describe, expect, it } from 'bun:test';
import type { TabCommand } from '@studio/events';

import { observeTabSignals, resetTabSignals, type TabCommandSource } from '../tabs/signals.js';
import { availableAppCommands, commandTarget, runAppCommand, type AppCommandDeps, type CommandView } from './index.js';

interface HostEffects extends AppCommandDeps {
  quits: number;
  checks: number;
  resets: number;
}

function hostEffects(over: Partial<AppCommandDeps> = {}): HostEffects {
  const seen = { quits: 0, checks: 0, resets: 0 };
  return {
    ...seen,
    get quits() {
      return seen.quits;
    },
    get checks() {
      return seen.checks;
    },
    get resets() {
      return seen.resets;
    },
    quit: () => {
      seen.quits += 1;
    },
    checkForUpdates: () => {
      seen.checks += 1;
    },
    resetStudio: () => {
      seen.resets += 1;
      return Promise.resolve();
    },
    isResetOffered: () => true,
    isCheckable: () => true,
    showAbout: () => undefined,
    toggleFullScreen: () => undefined,
    openTaskManager: () => undefined,
    isTaskManagerOffered: () => true,
    ...over,
  };
}

interface Sent {
  channel: string;
  payload?: unknown;
}

function targetView(): CommandView & { sent: Sent[] } {
  const sent: Sent[] = [];
  return {
    id: 7,
    sent,
    send: (channel: string, payload?: unknown) => {
      sent.push(payload === undefined ? { channel } : { channel, payload });
    },
  };
}

function watchTabSignals(): {
  commands: { command: TabCommand; source: TabCommandSource }[];
  closes: number;
  settings: number;
} {
  const seen = { commands: [] as { command: TabCommand; source: TabCommandSource }[], closes: 0, settings: 0 };
  observeTabSignals({
    workspace: () => undefined,
    working: () => undefined,
    status: () => undefined,
    closeActive: () => {
      seen.closes += 1;
    },
    labels: () => undefined,
    command: (command, source) => {
      seen.commands.push({ command, source });
      return true;
    },
    backgroundTab: () => undefined,
    settings: () => {
      seen.settings += 1;
    },
  });
  return seen;
}

afterEach(() => {
  resetTabSignals();
});

describe('running an app command', () => {
  it('hands Settings to the tab seam, which opens the modal over the Tab that asked', () => {
    const seen = watchTabSignals();
    const view = targetView();
    runAppCommand('settings', view);
    expect(seen.settings).toBe(1);
    expect(view.sent).toEqual([]);
  });

  it('takes the view a tab command acts on from the asking view', () => {
    const seen = watchTabSignals();
    runAppCommand('new-tab', targetView());
    expect(seen.commands).toEqual([{ command: { kind: 'new' }, source: { viewId: 7 } }]);
  });

  it('reopens a closed tab through the same seat as the application menu', () => {
    const seen = watchTabSignals();
    runAppCommand('reopen-tab', targetView());
    expect(seen.commands).toEqual([{ command: { kind: 'reopen' }, source: { viewId: 7 } }]);
  });

  it('closes the forward tab rather than the asking view', () => {
    const seen = watchTabSignals();
    runAppCommand('close-tab', targetView());
    expect(seen.closes).toBe(1);
  });

  it('hands undo to the asking view, which is the only side that can tell text undo from canvas undo', () => {
    const view = targetView();
    runAppCommand('undo', view);
    expect(view.sent).toEqual([{ channel: 'edit:undo' }]);
  });

  it('hands redo to the same side as undo', () => {
    const view = targetView();
    runAppCommand('redo', view);
    expect(view.sent).toEqual([{ channel: 'edit:redo' }]);
  });

  it('reaches the host effect its own name promises, and no other', () => {
    for (const [command, expected] of [
      ['quit', { quits: 1, checks: 0, resets: 0 }],
      ['check-for-updates', { quits: 0, checks: 1, resets: 0 }],
      ['reset-studio', { quits: 0, checks: 0, resets: 1 }],
    ] as const) {
      const deps = hostEffects();
      runAppCommand(command, targetView(), deps);
      expect({ quits: deps.quits, checks: deps.checks, resets: deps.resets }).toEqual(expected);
    }
  });

  it('refuses Reset on a build that never offers it, whatever asked for it', () => {
    const deps = hostEffects({ isResetOffered: () => false });
    runAppCommand('reset-studio', targetView(), deps);
    expect(deps.resets).toBe(0);
  });

  it('leaves a download alone: a check the updater would not take is not started', () => {
    const deps = hostEffects({ isCheckable: () => false });
    runAppCommand('check-for-updates', targetView(), deps);
    expect(deps.checks).toBe(0);
  });

  it('zooms the canvas in the asking view rather than the focused webContents', () => {
    for (const [command, action] of [
      ['actual-size', 'reset'],
      ['zoom-in', 'in'],
      ['zoom-out', 'out'],
      ['zoom-to-fit', 'fit'],
      ['zoom-to-selection', 'selection'],
    ] as const) {
      const view = targetView();
      runAppCommand(command, view);
      expect(view.sent).toEqual([{ channel: 'canvas:zoom', payload: { action } }]);
    }
  });

  it('shows About and toggles Full Screen through their own host effects', () => {
    let abouts = 0;
    let fullScreens = 0;
    const deps = hostEffects({ showAbout: () => { abouts += 1; }, toggleFullScreen: () => { fullScreens += 1; } });
    runAppCommand('about', targetView(), deps);
    runAppCommand('full-screen', targetView(), deps);
    expect([abouts, fullScreens]).toEqual([1, 1]);
  });

  it('opens the Task Manager only on a launch that offers it', () => {
    let opens = 0;
    runAppCommand('task-manager', targetView(), hostEffects({ openTaskManager: () => { opens += 1; }, isTaskManagerOffered: () => false }));
    expect(opens).toBe(0);
    runAppCommand('task-manager', targetView(), hostEffects({ openTaskManager: () => { opens += 1; } }));
    expect(opens).toBe(1);
  });
});

describe('which commands a build offers', () => {
  it('offers About and Full Screen only where the app menu draws them', () => {
    expect(availableAppCommands('win32', () => true)).toContain('about');
    expect(availableAppCommands('win32', () => true)).toContain('full-screen');
    expect(availableAppCommands('darwin', () => true)).not.toContain('about');
    expect(availableAppCommands('darwin', () => true)).not.toContain('full-screen');
  });

  it('offers Reset only on a build that has it', () => {
    expect(availableAppCommands('win32', () => false)).not.toContain('reset-studio');
    expect(availableAppCommands('win32', () => true)).toContain('reset-studio');
  });

  it('offers the Task Manager only where its flag is on', () => {
    expect(availableAppCommands('win32', () => true, () => false)).not.toContain('task-manager');
    expect(availableAppCommands('win32', () => true, () => true)).toContain('task-manager');
  });
});

describe('the view a command acts on', () => {
  it('is the active tab when the chrome asks, never the chrome itself', () => {
    const chrome = { id: 1 } as never;
    const active = { id: 2 } as never;
    expect(commandTarget(chrome, true, () => active)).toBe(active);
  });

  it('is the asking tab when a tab asks', () => {
    const tab = { id: 3 } as never;
    expect(commandTarget(tab, false, () => ({ id: 2 }) as never)).toBe(tab);
  });
});
