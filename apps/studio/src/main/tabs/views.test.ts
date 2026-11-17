import { describe, expect, it } from 'bun:test';
import { registerView, unregisterView, views, workspaceOf } from './views.js';

interface FakeSender {
  id: number;
  destroyed: boolean;
  once(event: 'destroyed', listener: () => void): void;
  isDestroyed(): boolean;
  send(channel: string, payload?: unknown): void;
  fireDestroyed(): void;
}

function fakeSender(id: number): FakeSender {
  const listeners: (() => void)[] = [];
  return {
    id,
    destroyed: false,
    once: (_event, listener) => {
      listeners.push(listener);
    },
    isDestroyed() {
      return this.destroyed;
    },
    send: () => {},
    fireDestroyed() {
      this.destroyed = true;
      for (const listener of listeners) listener();
    },
  };
}

describe('registerView', () => {
  it('moves a view to the project of its latest registration, and forgets it once destroyed', () => {
    const sender = fakeSender(102);
    registerView(sender as unknown as Parameters<typeof registerView>[0], '/workspaces/a');
    registerView(sender as unknown as Parameters<typeof registerView>[0], '/workspaces/b');

    expect(workspaceOf(102)).toBe('/workspaces/b');

    sender.fireDestroyed();

    expect(workspaceOf(102)).toBeUndefined();
  });

  it('unregisterView clears a view without waiting for destroy', () => {
    const sender = fakeSender(103);
    registerView(sender as unknown as Parameters<typeof registerView>[0], '/workspaces/only-103');

    unregisterView(sender as unknown as Parameters<typeof registerView>[0]);

    expect(workspaceOf(103)).toBeUndefined();
    expect(views.openWorkspaces().has('/workspaces/only-103')).toBe(false);
  });
});
