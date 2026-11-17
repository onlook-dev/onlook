import { afterEach, describe, expect, it } from 'bun:test';
import {
  anyUnsavedCode,
  forgetCodeDirty,
  hasUnsavedCode,
  noteCodeDirty,
  resetCodeDirtyForTests,
} from './dirty.js';

afterEach(resetCodeDirtyForTests);

describe('which views are holding unsaved code (ONL-2563)', () => {
  it('knows nothing until a view says so', () => {
    expect(hasUnsavedCode(7)).toBe(false);
    expect(anyUnsavedCode()).toBe(false);
  });

  it('holds the claim a view pushed, and drops it when the view saves', () => {
    noteCodeDirty(7, true);
    expect(hasUnsavedCode(7)).toBe(true);
    expect(anyUnsavedCode()).toBe(true);
    noteCodeDirty(7, false);
    expect(hasUnsavedCode(7)).toBe(false);
    expect(anyUnsavedCode()).toBe(false);
  });

  it('keeps one view’s claim clear of another’s', () => {
    noteCodeDirty(7, true);
    expect(hasUnsavedCode(8)).toBe(false);
    expect(anyUnsavedCode()).toBe(true);
  });

  /* A stale id would keep refusing to cool whichever view reuses it, which is
     an hour of memory held for nobody. */
  it('drops a destroyed view’s claim, so the id can be reused', () => {
    noteCodeDirty(7, true);
    forgetCodeDirty(7);
    expect(hasUnsavedCode(7)).toBe(false);
    expect(anyUnsavedCode()).toBe(false);
  });

  it('answers no for a tab with no view at all', () => {
    expect(hasUnsavedCode(undefined)).toBe(false);
  });

  it('is idempotent, because the renderer pushes on every transition', () => {
    noteCodeDirty(7, true);
    noteCodeDirty(7, true);
    noteCodeDirty(7, false);
    expect(anyUnsavedCode()).toBe(false);
  });
});
