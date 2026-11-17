import { afterEach, describe, expect, it } from 'bun:test';
import * as electron from 'electron';
import { dialogParent, presentPrimaryWindow, restoreAllMinimized } from './host.js';

const mock = electron as unknown as {
  BaseWindow: { getAllWindows: () => unknown[]; getFocusedWindow: () => unknown };
};
const original = { ...mock.BaseWindow };

function fakeWindow(minimized: boolean, destroyed = false) {
  const calls: string[] = [];
  return {
    calls,
    isDestroyed: () => destroyed,
    isMinimized: () => minimized,
    restore: () => void calls.push('restore'),
    focus: () => void calls.push('focus'),
  };
}

afterEach(() => {
  Object.assign(mock.BaseWindow, original);
});

describe('presentPrimaryWindow', () => {
  it('restores and focuses the first BaseWindow when it is minimized', () => {
    const window = fakeWindow(true);
    mock.BaseWindow.getAllWindows = () => [window];
    presentPrimaryWindow();
    expect(window.calls).toEqual(['restore', 'focus']);
  });

  it('only focuses a window that is not minimized', () => {
    const window = fakeWindow(false);
    mock.BaseWindow.getAllWindows = () => [window];
    presentPrimaryWindow();
    expect(window.calls).toEqual(['focus']);
  });

  it('does nothing with no window', () => {
    mock.BaseWindow.getAllWindows = () => [];
    expect(() => presentPrimaryWindow()).not.toThrow();
  });
});

describe('restoreAllMinimized', () => {
  it('restores every live minimized window and never focuses', () => {
    const minimized = fakeWindow(true);
    const open = fakeWindow(false);
    const gone = fakeWindow(true, true);
    mock.BaseWindow.getAllWindows = () => [minimized, open, gone];
    restoreAllMinimized();
    expect(minimized.calls).toEqual(['restore']);
    expect(open.calls).toEqual([]);
    expect(gone.calls).toEqual([]);
  });
});

describe('dialogParent', () => {
  it('prefers the focused BaseWindow, then the first', () => {
    const focused = fakeWindow(false);
    const first = fakeWindow(false);
    mock.BaseWindow.getAllWindows = () => [first];
    mock.BaseWindow.getFocusedWindow = () => focused;
    expect(dialogParent() as unknown).toBe(focused);
    mock.BaseWindow.getFocusedWindow = () => null;
    expect(dialogParent() as unknown).toBe(first);
    mock.BaseWindow.getAllWindows = () => [];
    expect(dialogParent()).toBeUndefined();
  });
});
