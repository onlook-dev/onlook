import { describe, expect, it } from 'bun:test';
import { gradeOf, type GradeFacts } from './grade.js';

const EXACT: GradeFacts = { via: 'owner-stack', candidates: 1, moved: false };

describe('grading source evidence independently of edit reach', () => {
  it('calls one source-mapped location exact', () => {
    expect(gradeOf(EXACT)).toBe('exact');
  });
  it('does not call a changed buffer exact', () => {
    expect(gradeOf({ ...EXACT, moved: true })).toBe('likely');
  });
  it('distinguishes a component call site from an element source', () => {
    expect(gradeOf({ ...EXACT, via: 'component-stack' })).toBe('likely');
  });
  it('never verifies a component-name match', () => {
    expect(gradeOf({ ...EXACT, via: 'name-search' })).toBe('likely');
  });
  it('keeps DOM search and multiple candidates unverified', () => {
    expect(gradeOf({ ...EXACT, via: 'element-search' })).toBe('best-guess');
    expect(gradeOf({ ...EXACT, candidates: 4 })).toBe('best-guess');
  });
});
