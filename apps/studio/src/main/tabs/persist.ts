import { HOME_ACTIVE, type WindowRecord } from '@studio/events';

export interface PersistTab {
  workspacePath?: string;
}

export interface PersistFacts {
  /** Boot writes nothing: the home tab `open()` makes before `restoreSaved()` reads would reach disk as `tabs: []` (ONL-2208). */
  isBooting: boolean;
  /** A launch that skipped restore must not overwrite what it refused to read (ONL-2123). */
  isUsable: boolean;
  order: readonly string[];
  tabs: ReadonlyMap<string, PersistTab>;
  activeId?: string;
  /** Absent for a project the registry no longer knows; it leaves the record rather than entering it unnamed. */
  repoIdentityOf(workspacePath: string): string | undefined;
}

export function windowRecordFor(facts: PersistFacts): WindowRecord | undefined {
  if (facts.isBooting || !facts.isUsable) return undefined;
  const tabs = facts.order.flatMap((id) => {
    const workspacePath = facts.tabs.get(id)?.workspacePath;
    if (workspacePath === undefined) return [];
    const repoIdentity = facts.repoIdentityOf(workspacePath);
    return repoIdentity === undefined ? [] : [{ workspacePath, repoIdentity }];
  });
  const active = facts.activeId === undefined ? undefined : facts.tabs.get(facts.activeId);
  return {
    tabs,
    active:
      active?.workspacePath === undefined ? HOME_ACTIVE : { kind: 'tab', workspacePath: active.workspacePath },
  };
}
