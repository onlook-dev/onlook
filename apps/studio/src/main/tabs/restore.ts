import type { TabRecord, WindowRecord } from '@studio/events';

export interface RestorePlan {
  /** Minted cold, in this order: nothing starts until a first activation (ONL-2208). */
  tabs: TabRecord[];
  /** Absent means home stays forward — the active state may name no member. */
  activate?: string;
}

export interface RestoreProbe {
  /** A missing worktree drops from the set; the stored value is NOT rewritten, because a missing path can be transient. */
  exists: (workspacePath: string) => boolean;
  isOpen: (workspacePath: string) => boolean;
}

export function planRestore(record: WindowRecord | undefined, probe: RestoreProbe): RestorePlan {
  if (record === undefined) return { tabs: [] };
  const seen = new Set<string>();
  const tabs = record.tabs.filter((entry) => {
    if (seen.has(entry.workspacePath)) return false;
    if (probe.isOpen(entry.workspacePath) || !probe.exists(entry.workspacePath)) return false;
    seen.add(entry.workspacePath);
    return true;
  });
  if (record.active.kind === 'home') return { tabs };
  const active = record.active.workspacePath;
  const isRestored = tabs.some((entry) => entry.workspacePath === active);
  return isRestored || probe.isOpen(active) ? { tabs, activate: active } : { tabs };
}
