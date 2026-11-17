import { EventEmitter } from 'node:events';
import { describe, expect, it, mock } from 'bun:test';

const shown: Array<[string, string]> = [];
mock.module('../telemetry/turn-seen.js', () => ({
  noteProjectShown: (path: string, by: string) => shown.push([path, by]),
  setTurnSeenLocator: () => {},
  noteTurnEnded: () => {},
  beginTurnSeenQuit: () => {},
}));
const { seatedTabs } = await import('./test-support.js');

function hostWithHomeTab(focused: boolean) {
  shown.length = 0;
  const home = { id: 'home', view: { webContents: { id: 5, isDestroyed: () => false } } };
  const window = Object.assign(new EventEmitter(), { isDestroyed: () => false, isFocused: () => focused });
  return seatedTabs({
    window, tabs: new Map([[home.id, home]]), order: [home.id], activeId: home.id,
    broadcastTabs: mock(), persistWindows: mock(),
  });
}

describe('a project opened in place from the Projects Screen counts as shown (ONL-2978)', () => {
  it('reports the project as shown by project_opened when its tab is the active one in a focused window', () => {
    hostWithHomeTab(true).noteWorkspace(5, '/projects/a');
    expect(shown).toEqual([['/projects/a', 'project_opened']]);
  });

  it('reports nothing while the window is not focused', () => {
    hostWithHomeTab(false).noteWorkspace(5, '/projects/a');
    expect(shown).toEqual([]);
  });
});
