import { afterAll, describe, expect, it } from 'bun:test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { chooseProjectsFolder, chosenProjectsFolder, resetProjectsFolderForTesting } from './root.js';
import { projectsFolderMayChange, resetWorkspaceCache, workspaceRoot } from './store.js';

const savedState = process.env['STUDIO_STATE_ROOT'];
afterAll(() => {
  if (savedState === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedState;
  restoreWorkspaceRoot();
  resetProjectsFolderForTesting();
  resetWorkspaceCache();
  cleanupTempFixtures();
});

describe('Projects folder recovery', () => {
  it('can recover when the configured Projects folder has become a file', () => {
    const root = makeWorkspaceRoot({ name: 'folder-is-a-file' });
    const file = join(root, 'not-a-folder');
    writeFileSync(file, 'not a directory');
    process.env['STUDIO_WORKSPACE_ROOT'] = file;
    resetWorkspaceCache();
    expect(projectsFolderMayChange()).toBe(true);
  });
  it('persists an absolute folder and makes creation use it after restart', () => {
    process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'chosen-projects-folder' });
    delete process.env['STUDIO_WORKSPACE_ROOT'];
    resetProjectsFolderForTesting();
    const folder = makeWorkspaceRoot({ name: 'Onlook Projects with spaces' });
    chooseProjectsFolder(folder);
    expect(workspaceRoot()).toBe(folder);
    expect(JSON.parse(readFileSync(join(process.env['STUDIO_STATE_ROOT'], 'projects-folder.json'), 'utf8')).data).toEqual({ folder });
    resetProjectsFolderForTesting();
    expect(chosenProjectsFolder()).toBe(folder);
    expect(workspaceRoot()).toBe(folder);
    expect(() => chooseProjectsFolder('relative-path')).toThrow();
  });

  it('cannot hide registered or in-flight projects by choosing another folder', () => {
    const root = makeWorkspaceRoot({ name: 'folder-guard' });
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    resetWorkspaceCache();
    expect(projectsFolderMayChange()).toBe(true);
    mkdirSync(join(root, 'in-flight-project'));
    expect(projectsFolderMayChange()).toBe(false);
  });

  it('does not treat an unreadable registry as permission to switch folders', () => {
    const root = makeWorkspaceRoot({ name: 'folder-unreadable-registry' });
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    writeFileSync(join(root, 'workspaces.json'), 'not json');
    resetWorkspaceCache();
    expect(projectsFolderMayChange()).toBe(false);
  });
});
