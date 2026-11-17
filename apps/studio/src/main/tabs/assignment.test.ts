import { describe, expect, it } from 'bun:test';
import { assignmentFor, needsTelling } from './assignment.js';

const PATH = '/w/teal-skylark';
const REPO = 'github.com/acme/app';

describe('what a parked view is told it is (ONL-2318)', () => {
  it('names the project a warmed tab holds', () => {
    expect(assignmentFor({ tabId: 't1', workspacePath: PATH, hasCreation: false, repoIdentity: REPO })).toEqual({
      tabId: 't1',
      purpose: 'project',
      workspacePath: PATH,
      repoIdentity: REPO,
    });
  });

  it('names it even though its cut left a record behind — a landed tab is past its cut', () => {
    expect(assignmentFor({ tabId: 't1', workspacePath: PATH, hasCreation: true, repoIdentity: REPO })).toEqual({
      tabId: 't1',
      purpose: 'project',
      workspacePath: PATH,
      repoIdentity: REPO,
    });
  });

  it('sends home a tab holding nothing and showing nothing', () => {
    expect(assignmentFor({ tabId: 't1', hasCreation: false })).toEqual({ tabId: 't1', purpose: 'projects' });
  });

  it('answers NOTHING for a tab with no worktree that owns a creation record', () => {
    expect(assignmentFor({ tabId: 't1', hasCreation: true })).toBeNull();
  });

  it('answers nothing for a project the registry does not know, rather than a half-assignment', () => {
    expect(assignmentFor({ tabId: 't1', workspacePath: PATH, hasCreation: false })).toBeNull();
  });
});

describe('whether an activation owes the tab a word (ONL-2318)', () => {
  it('tells a warmed cold tab, which took the spare or a fresh view', () => {
    expect(needsTelling({ wasCold: true, tookSpare: false, wasWarmedCold: false, isCreating: false })).toBe(true);
  });

  it('tells a promoted spare with no cut — goHome, or + with no workspace in context', () => {
    expect(needsTelling({ wasCold: false, tookSpare: true, wasWarmedCold: false, isCreating: false })).toBe(true);
  });

  it('stays quiet for a promoted spare whose cut will tell it', () => {
    expect(needsTelling({ wasCold: false, tookSpare: true, wasWarmedCold: false, isCreating: true })).toBe(false);
  });

  it('stays quiet for a cold tab mid-cut, so the create stream keeps its surface', () => {
    expect(needsTelling({ wasCold: true, tookSpare: false, wasWarmedCold: false, isCreating: true })).toBe(false);
  });

  it('stays quiet for an ordinary switch between two live tabs', () => {
    expect(needsTelling({ wasCold: false, tookSpare: false, wasWarmedCold: false, isCreating: false })).toBe(false);
  });

  it('tells a tab warmed in the background, whose renderer is parked and unassigned (ONL-3153)', () => {
    expect(needsTelling({ wasCold: false, tookSpare: false, wasWarmedCold: true, isCreating: false })).toBe(true);
  });
});
