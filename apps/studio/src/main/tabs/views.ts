import type { WebContents } from 'electron';
import { ViewRouting } from './view-routing.js';
import { canonicalPath } from '../lib/canonical-path.js';

export const views = new ViewRouting();

const watched = new Set<number>();

/** Called on every navigation and again at session start; the `destroyed` hook attaches once per sender (ONL-2226). */
export function registerView(sender: WebContents, cwd: string): void {
  views.register(sender.id, cwd, {
    send: (channel, payload) => {
      if (!sender.isDestroyed()) sender.send(channel, payload);
    },
  });
  if (!watched.has(sender.id)) {
    watched.add(sender.id);
    sender.once('destroyed', () => {
      watched.delete(sender.id);
      views.unregister(sender.id);
    });
  }
}

export function unregisterView(sender: WebContents): void {
  views.unregister(sender.id);
}

export function workspaceOf(viewId: number): string | undefined {
  return views.workspaceOf(viewId);
}

export function openWorkspaces(): ReadonlySet<string> {
  return views.openWorkspaces();
}

export function hasOpenProjectView(cwd: string): boolean {
  const target = canonicalPath(cwd);
  return Array.from(openWorkspaces()).some((open) => canonicalPath(open) === target);
}
