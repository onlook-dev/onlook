import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { SIDEBAR_LAYOUT_LIMITS } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot } from '@studio/fixtures';
import { readSidebarLayout, resetSidebarLayoutCache, writeSidebarLayout } from './state.js';

const savedWorkspaceRoot = process.env['STUDIO_WORKSPACE_ROOT'];

const relaunch = resetSidebarLayoutCache;

const projectA = '/tmp/studio-sidebar-a';
const projectB = '/tmp/studio-sidebar-b';

beforeEach(() => {
  resetSidebarLayoutCache();
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: 'sidebar-layout' });
});

afterAll(() => {
  resetSidebarLayoutCache();
  if (savedWorkspaceRoot === undefined) delete process.env['STUDIO_WORKSPACE_ROOT'];
  else process.env['STUDIO_WORKSPACE_ROOT'] = savedWorkspaceRoot;
  cleanupTempFixtures();
});

describe('the project panel split', () => {
  it('brings back each project’s own split after a relaunch, and none for a project never dragged', () => {
    writeSidebarLayout(projectA, { pagesHeight: 180 });
    writeSidebarLayout(projectB, { pagesHeight: 320 });

    relaunch();

    expect(readSidebarLayout(projectA)).toEqual({ pagesHeight: 180 });
    expect(readSidebarLayout(projectB)).toEqual({ pagesHeight: 320 });
    expect(readSidebarLayout('/tmp/studio-sidebar-never')).toEqual({});
  });

  it('drops a height no panel could have produced rather than clamping it', () => {
    for (const pagesHeight of [
      SIDEBAR_LAYOUT_LIMITS.pagesHeight.min - 1,
      SIDEBAR_LAYOUT_LIMITS.pagesHeight.max + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -40,
    ]) {
      writeSidebarLayout(projectA, { pagesHeight });
      expect(readSidebarLayout(projectA)).toEqual({});
    }

    writeSidebarLayout(projectA, { pagesHeight: SIDEBAR_LAYOUT_LIMITS.pagesHeight.max });
    expect(readSidebarLayout(projectA)).toEqual({
      pagesHeight: SIDEBAR_LAYOUT_LIMITS.pagesHeight.max,
    });
  });

  it('forgets a split the user let go of', () => {
    writeSidebarLayout(projectA, { pagesHeight: 180 });
    writeSidebarLayout(projectA, {});

    relaunch();

    expect(readSidebarLayout(projectA)).toEqual({});
  });
});
