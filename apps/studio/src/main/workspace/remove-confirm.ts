import type { WorkspaceOrigin } from '@studio/events';

type RemoveConfirmVariant = 'imported' | 'held-last' | 'held-sibling';

export interface RemoveConfirmFacts {
  origin: WorkspaceOrigin;
  missing: boolean;
  /** The last project of its repo group, which is the only one allowed to take a held group's bucket. */
  lastInGroup: boolean;
}

export interface RemoveConfirm {
  variant: RemoveConfirmVariant;
  deletesFolder: boolean;
  warnsUncommitted: boolean;
}

type WorkspaceRemoveConfirmVariant = 'imported' | 'held';

export interface WorkspaceRemoveConfirmFacts {
  origins: readonly WorkspaceOrigin[];
  /** How many of the group's projects still have a folder on disk. */
  present: number;
  count: number;
}

export interface WorkspaceRemoveConfirm {
  variant: WorkspaceRemoveConfirmVariant;
  deletesFolder: boolean;
  warnsUncommitted: boolean;
  count: number;
}

// Held on any disagreement: an identity is held or it is not, so a record answering `imported` against a held sibling is a mis-defaulted one, and held is the reading that tells the truth about what goes (ONL-2523).
export function workspaceRemoveConfirmFor(
  facts: WorkspaceRemoveConfirmFacts,
): WorkspaceRemoveConfirm {
  const held = facts.origins.some((origin) => origin === 'blank' || origin === 'copied');
  return {
    variant: held ? 'held' : 'imported',
    deletesFolder: facts.present > 0,
    warnsUncommitted: facts.present > 0,
    count: facts.count,
  };
}

// `held-sibling` promises no surviving branch: a held branch lives in Studio's own repo and goes with the group's last project (ONL-2315).
export function removeConfirmFor(facts: RemoveConfirmFacts): RemoveConfirm {
  const held = facts.origin === 'blank' || facts.origin === 'copied';
  const variant: RemoveConfirmVariant = !held
    ? 'imported'
    : facts.lastInGroup
      ? 'held-last'
      : 'held-sibling';
  return {
    variant,
    deletesFolder: !facts.missing,
    // Categorical: `git worktree remove --force` destroys uncommitted work with git raising no objection, and no cached dirty bit exists for a project never opened here.
    warnsUncommitted: !facts.missing,
  };
}
