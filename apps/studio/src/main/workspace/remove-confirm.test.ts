import { describe, expect, it } from 'bun:test';
import { removeConfirmFor, workspaceRemoveConfirmFor } from './remove-confirm.js';

describe('removeConfirmFor (ONL-2315)', () => {
  it('a duplicate without resolved held ownership only removes its Project folder (ONL-2515)', () => {
    expect(removeConfirmFor({ origin: 'duplicate', missing: false, lastInGroup: true }).variant).toBe('imported');
    expect(workspaceRemoveConfirmFor({ origins: ['duplicate', 'duplicate'], present: 2, count: 2 }).variant).toBe('imported');
    expect(workspaceRemoveConfirmFor({ origins: ['duplicate', 'copied'], present: 2, count: 2 }).variant).toBe('held');
  });

  it('tells a project from the user’s own repository that its branch is elsewhere', () => {
    expect(removeConfirmFor({ origin: 'imported', missing: false, lastInGroup: true })).toEqual({
      variant: 'imported',
      deletesFolder: true,
      warnsUncommitted: true,
    });
  });

  it('tells the last project Studio created that its history goes with it', () => {
    for (const origin of ['blank', 'copied'] as const) {
      expect(removeConfirmFor({ origin, missing: false, lastInGroup: true }).variant).toBe(
        'held-last',
      );
    }
  });

  it('tells a project Studio created that still has siblings only that the shared repository stays', () => {
    for (const origin of ['blank', 'copied'] as const) {
      expect(removeConfirmFor({ origin, missing: false, lastInGroup: false }).variant).toBe(
        'held-sibling',
      );
    }
  });

  it('being the last of its group changes nothing for an imported project', () => {
    expect(removeConfirmFor({ origin: 'imported', missing: false, lastInGroup: false }).variant).toBe(
      'imported',
    );
  });

  it('drops the folder clause for a project whose folder is already gone', () => {
    const confirm = removeConfirmFor({ origin: 'imported', missing: true, lastInGroup: true });

    expect(confirm.deletesFolder).toBe(false);
    expect(confirm.variant).toBe('imported');
  });

  it('warns about uncommitted work from the folder alone, never from a measurement', () => {
    expect(
      removeConfirmFor({ origin: 'blank', missing: false, lastInGroup: true }).warnsUncommitted,
    ).toBe(true);
    expect(
      removeConfirmFor({ origin: 'imported', missing: false, lastInGroup: false }).warnsUncommitted,
    ).toBe(true);
    // Nothing is destroyed where there is no folder, so the line would be a warning about nothing.
    expect(
      removeConfirmFor({ origin: 'blank', missing: true, lastInGroup: true }).warnsUncommitted,
    ).toBe(false);
  });
});

describe('workspaceRemoveConfirmFor (ONL-2523)', () => {
  it('tells a folder of imported projects that the user’s own branches stay', () => {
    expect(
      workspaceRemoveConfirmFor({
        origins: ['imported', 'imported', 'imported'],
        present: 3,
        count: 3,
      }),
    ).toEqual({ variant: 'imported', deletesFolder: true, warnsUncommitted: true, count: 3 });
  });

  it('tells a folder Studio created that its history goes with it', () => {
    expect(
      workspaceRemoveConfirmFor({ origins: ['blank', 'blank'], present: 2, count: 2 }).variant,
    ).toBe('held');
  });

  it('reads a group that disagrees about its origin as held, which is the destructive truth', () => {
    expect(
      workspaceRemoveConfirmFor({ origins: ['imported', 'copied'], present: 2, count: 2 }).variant,
    ).toBe('held');
  });

  it('carries the count through so the sentence and the loop agree', () => {
    expect(
      workspaceRemoveConfirmFor({ origins: ['imported'], present: 1, count: 1 }).count,
    ).toBe(1);
  });

  it('drops the folder clause only when no project has a folder left', () => {
    expect(
      workspaceRemoveConfirmFor({ origins: ['blank', 'blank'], present: 0, count: 2 }),
    ).toEqual({ variant: 'held', deletesFolder: false, warnsUncommitted: false, count: 2 });
  });

  it('keeps the folder clause while one project of three still has a folder', () => {
    const confirm = workspaceRemoveConfirmFor({
      origins: ['imported', 'imported', 'imported'],
      present: 1,
      count: 3,
    });

    expect(confirm.deletesFolder).toBe(true);
    expect(confirm.warnsUncommitted).toBe(true);
  });
});
