export interface ClosedTab {
  workspacePath: string;
  index: number;
}

export const CLOSED_TAB_LIMIT = 10;

/** In memory only: persisting it would be new state on disk. */
export class ClosedTabs {
  private entries: ClosedTab[] = [];

  constructor(private readonly limit = CLOSED_TAB_LIMIT) {}

  push(entry: ClosedTab): void {
    this.entries = [...this.entries.filter((held) => held.workspacePath !== entry.workspacePath), entry].slice(-this.limit);
  }

  has(canReopen: (workspacePath: string) => boolean): boolean {
    return this.entries.some((entry) => canReopen(entry.workspacePath));
  }

  take(canReopen: (workspacePath: string) => boolean): ClosedTab | undefined {
    for (let entry = this.entries.pop(); entry !== undefined; entry = this.entries.pop()) {
      if (canReopen(entry.workspacePath)) return entry;
    }
    return undefined;
  }
}

export type ReopenPlan =
  | { kind: 'none' }
  | { kind: 'activate'; tabId: string }
  | { kind: 'blocked' }
  | { kind: 'mint'; workspacePath: string; index: number };

export interface ReopenFacts {
  canReopen: (workspacePath: string) => boolean;
  openTabFor: (workspacePath: string) => string | undefined;
  isAtLimit: boolean;
  openCount: number;
}

/** Takes the entry it plans for; a blocked one goes back, so the next ⇧⌘T can still reach it. */
export function reopenPlan(closed: ClosedTabs, facts: ReopenFacts): ReopenPlan {
  const entry = closed.take(facts.canReopen);
  if (entry === undefined) return { kind: 'none' };
  const open = facts.openTabFor(entry.workspacePath);
  if (open !== undefined) return { kind: 'activate', tabId: open };
  if (facts.isAtLimit) {
    closed.push(entry);
    return { kind: 'blocked' };
  }
  return { kind: 'mint', workspacePath: entry.workspacePath, index: Math.min(entry.index, facts.openCount) };
}
