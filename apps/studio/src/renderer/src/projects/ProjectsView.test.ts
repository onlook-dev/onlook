import { describe, expect, test } from 'bun:test';
import { projectsViewStateFor } from './ProjectsView.js';

const PROJECTS = [{ id: 'p', name: 'red-skylark', meta: '2d' }];

const CANDIDATES = [
  {
    handle: '/workspaces/zest-maps/red-skylark',
    name: 'red-skylark',
    meta: 'zest-maps · Last edited 3d ago',
    onImport: () => {},
  },
  {
    handle: '/workspaces/zest-maps/blue-harron',
    name: 'blue-harron',
    meta: 'zest-maps',
    onImport: () => {},
  },
];

describe('projectsViewStateFor', () => {
  test('a workspace selection offers New Project over its projects', () => {
    expect(projectsViewStateFor({ projects: PROJECTS, isRecentSelected: false })).toEqual({
      body: 'projects',
      canCreateProject: true,
      canImportProject: true,
    });
  });

  test('a content pane fills the body in place of the empty state, and New Project goes', () => {
    expect(projectsViewStateFor({ projects: [], content: 'pane', isRecentSelected: false })).toEqual({
      body: 'content',
      canCreateProject: false,
      canImportProject: false,
    });
  });

  test('no projects and nothing to recover is the empty state', () => {
    expect(
      projectsViewStateFor({ projects: [], discoveredWorktrees: [], isRecentSelected: true }),
    ).toEqual({ body: 'empty', canCreateProject: false, canImportProject: false });
  });

  test('no projects but worktrees on disk is the recovery body', () => {
    expect(
      projectsViewStateFor({ projects: [], discoveredWorktrees: CANDIDATES, isRecentSelected: true }),
    ).toEqual({ body: 'recovery', canCreateProject: false, canImportProject: false });
  });

  test('projects and candidates together is the grid, which carries the section below it', () => {
    expect(
      projectsViewStateFor({
        projects: PROJECTS,
        discoveredWorktrees: CANDIDATES,
        isRecentSelected: false,
      }),
    ).toEqual({ body: 'projects', canCreateProject: true, canImportProject: true });
  });

  test('Recent keeps creation and manual import out of the header', () => {
    expect(
      projectsViewStateFor({
        projects: PROJECTS,
        discoveredWorktrees: CANDIDATES,
        isRecentSelected: true,
      })).toEqual({ body: 'projects', canCreateProject: false, canImportProject: false });
  });
});
