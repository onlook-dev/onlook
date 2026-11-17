import { log } from '../log/index.js';
import { projectKey, type ProjectKey } from '../project/key.js';

const logger = log('agent-host');

export interface ViewSink {
  send(channel: string, payload: unknown): void;
}

interface ViewEntry {
  cwd: ProjectKey;
  sink: ViewSink;
}

export class ViewRouting {
  private readonly views = new Map<number, ViewEntry>();
  private readonly canonicalCache = new Map<string, ProjectKey>();

  private canonicalize(cwd: string): ProjectKey {
    const cached = this.canonicalCache.get(cwd);
    if (cached !== undefined) return cached;
    const resolved = projectKey(cwd);
    this.canonicalCache.set(cwd, resolved);
    return resolved;
  }

  register(viewId: number, cwd: string, sink: ViewSink): void {
    this.views.set(viewId, { cwd: this.canonicalize(cwd), sink });
  }

  unregister(viewId: number): void {
    this.views.delete(viewId);
  }

  routeTo(cwd: string | undefined, channel: string, payload: unknown): void {
    if (cwd === undefined) {
      // An unaddressed event reaches every tab; the error line is what makes that a caller bug rather than a default (ONL-2203).
      logger.error('ONL-2203: a channel carried no workspace identity — broadcasting to every view; a caller bug that leaks one workspace into every tab', { channel });
      for (const { sink } of this.views.values()) sink.send(channel, payload);
      return;
    }
    const target = this.canonicalize(cwd);
    for (const entry of this.views.values()) {
      if (entry.cwd === target) entry.sink.send(channel, payload);
    }
  }

  workspaceOf(viewId: number): string | undefined {
    return this.views.get(viewId)?.cwd;
  }

  /** The same answer as a key, canonicalised when the view registered. */
  projectOf(viewId: number): ProjectKey | undefined {
    return this.views.get(viewId)?.cwd;
  }

  openWorkspaces(): ReadonlySet<string> {
    return new Set(Array.from(this.views.values(), (entry) => entry.cwd));
  }
}
