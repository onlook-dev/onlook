import { canonicalPath } from '../lib/canonical-path.js';
import type { AgentBackend } from './backend.js';

export class SessionMap {
  private readonly byCwd = new Map<string, AgentBackend>();

  get(cwd: string): AgentBackend | undefined {
    return this.byCwd.get(canonicalPath(cwd));
  }

  set(session: AgentBackend): void {
    this.byCwd.set(canonicalPath(session.cwd), session);
  }

  delete(cwd: string): AgentBackend | undefined {
    const key = canonicalPath(cwd);
    const session = this.byCwd.get(key);
    this.byCwd.delete(key);
    return session;
  }

  values(): AgentBackend[] {
    return [...this.byCwd.values()];
  }

  get size(): number {
    return this.byCwd.size;
  }
}
