import { describe, expect, it } from 'bun:test';
import { tabCloseDecision } from './closing.js';

const nobody = (): boolean => false;

describe('tabCloseDecision (ONL-2265)', () => {
  it('the create path: a tab with no project yet retires the one its view is registered to', () => {
    const tab = { workspacePath: undefined, registeredWorkspace: '/w/creating' };
    expect(tabCloseDecision(tab, true, nobody)).toEqual({
      retire: '/w/creating',
      stopSession: true,
      exitToProjects: true,
    });
    expect(tabCloseDecision(tab, false, nobody)).toEqual({
      retire: '/w/creating',
      stopSession: true,
      exitToProjects: false,
    });
  });

  it('a landed tab retires its own project, and the last tab exits instead of closing', () => {
    const tab = { workspacePath: '/w/a', registeredWorkspace: '/w/a' };
    expect(tabCloseDecision(tab, true, nobody)).toEqual({ retire: '/w/a', stopSession: true, exitToProjects: true });
    expect(tabCloseDecision(tab, false, nobody).exitToProjects).toBe(false);
  });

  it('a project another tab still shows keeps its session', () => {
    const tab = { workspacePath: '/w/a', registeredWorkspace: undefined };
    expect(tabCloseDecision(tab, false, (workspace) => workspace === '/w/a')).toEqual({
      retire: '/w/a',
      stopSession: false,
      exitToProjects: false,
    });
  });

  it('a tab showing nothing retires nothing', () => {
    const tab = { workspacePath: undefined, registeredWorkspace: undefined };
    expect(tabCloseDecision(tab, false, nobody)).toEqual({ retire: undefined, stopSession: false, exitToProjects: false });
    expect(tabCloseDecision(tab, true, nobody)).toEqual({ retire: undefined, stopSession: false, exitToProjects: true });
  });
});
