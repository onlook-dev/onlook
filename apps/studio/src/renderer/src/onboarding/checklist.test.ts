import { describe, expect, it } from 'bun:test';
import { showsChecklist, type ChecklistVisibility } from './checklist.js';

function view(overrides: Partial<ChecklistVisibility> = {}): ChecklistVisibility {
  return { enabled: true, atFirstProject: true, blocked: false, needsAttention: false, shown: false, told: false, ...overrides };
}

describe('when the computer checklist is a screen', () => {
  it('stays away while the checks run and when they all pass', () => {
    expect(showsChecklist(view())).toBe(false);
  });

  it('stays away from every step before the first project', () => {
    expect(showsChecklist(view({ atFirstProject: false, blocked: true }))).toBe(false);
  });

  it('comes up for a failed check and for one that could not finish', () => {
    expect(showsChecklist(view({ blocked: true, needsAttention: true }))).toBe(true);
    expect(showsChecklist(view({ needsAttention: true }))).toBe(true);
  });

  it('holds its place while the last failing check recovers', () => {
    expect(showsChecklist(view({ shown: true }))).toBe(true);
  });

  it('goes once the person continues', () => {
    expect(showsChecklist(view({ shown: true, needsAttention: true, told: true }))).toBe(false);
  });

  it('comes back for a failure that lands after the person continued', () => {
    expect(showsChecklist(view({ blocked: true, needsAttention: true, told: true }))).toBe(true);
  });

  // Off, the step order is main's: the agents screen hands straight to the first project (ONL-3111).
  it('is not a screen at all with the flag off, whatever the checks found', () => {
    for (const reason of [{ blocked: true }, { needsAttention: true }, { shown: true }, { blocked: true, needsAttention: true, shown: true }]) {
      expect(showsChecklist(view({ enabled: false, ...reason }))).toBe(false);
    }
  });
});
