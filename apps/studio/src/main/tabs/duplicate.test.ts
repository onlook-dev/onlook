import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { rmSync } from 'node:fs';
import { MAX_PROJECT_TABS, type DuplicateProjectRequest, type WorkspaceCreated } from '@studio/events';
import {
  cleanupTempFixtures,
  makeDirWithFiles,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { projectCreations } from '../workspace/create-project.js';
import { canonicalPath } from '../lib/canonical-path.js';
import { isRemovingProject, removeProjectByUser } from '../workspace/remove-project.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import type { TabHost } from './host.js';
import { ClosedTabs } from './reopen.js';
import { views } from './views.js';
import { seatedTabs } from './test-support.js';

const OWN_VIEW = 101;
const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
const setup = spyOn(projectCreations, 'start').mockImplementation(() => {
  throw new Error('duplicate authorization must not start setup directly');
});

beforeEach(() => {
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: 'tab-duplicate' });
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'tab-duplicate' });
  resetWorkspaceCache();
  setup.mockClear();
});

afterEach(() => {
  views.unregister(303);
  resetWorkspaceCache();
});

afterAll(() => {
  setup.mockRestore();
  restoreWorkspaceRoot();
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

function source(overrides: Partial<WorkspaceCreated> = {}): WorkspaceCreated {
  const workspacePath = makeDirWithFiles({ name: 'tab-duplicate-source', files: { 'app.ts': 'export {};\n' } });
  const record: WorkspaceCreated = {
    workspacePath,
    workspaceName: 'source-project',
    branchName: 'fixture/source-project',
    baseBranch: 'main',
    sourceRepoName: 'app',
    sourcePath: workspacePath,
    sourceRepoRoot: workspacePath,
    repoIdentity: 'fixture/tab-duplicate',
    copiedEnvFiles: [],
    ...overrides,
  };
  rememberProject(record);
  return record;
}

interface TestTab {
  id: string;
  isWorking: boolean;
  workspacePath?: string;
  view?: { webContents: { id: number } };
}

type TestHost = ReturnType<typeof seatedTabs>;

function testHost(projectCount = 0) {
  const tabs = new Map<string, TestTab>([
    ['projects', { id: 'projects', isWorking: false, view: { webContents: { id: OWN_VIEW } } }],
  ]);
  for (let index = 0; index < projectCount; index += 1) {
    const id = `project-${String(index)}`;
    tabs.set(id, { id, isWorking: false, workspacePath: `/fixture/open-${String(index)}` });
  }
  const open = mock<TabHost['open']>(() => 'copy-tab');
  const host: TestHost = seatedTabs({
    tabs,
    order: [...tabs.keys()],
    closed: new ClosedTabs(),
    open,
  });
  return { host, open, tabs };
}

function denied(host: TestHost, open: ReturnType<typeof testHost>['open'], viewId: number, request: unknown): void {
  expect(() => host.duplicateInTab(viewId, request as DuplicateProjectRequest)).not.toThrow();
  expect(open).not.toHaveBeenCalled();
  expect(setup).not.toHaveBeenCalled();
}

describe('TabHost.duplicateInTab authorization', () => {
  it('denies an unknown sender', () => {
    const record = source();
    const { host, open } = testHost();
    denied(host, open, 999, { workspacePath: record.workspacePath });
  });

  it('denies a guest even when its host is an owned view', () => {
    const record = source();
    const { host, open } = testHost();
    const guest = { id: 202, hostWebContents: { id: OWN_VIEW } };
    expect(host.tabForViewId(guest.hostWebContents.id)).toBeDefined();
    denied(host, open, guest.id, { workspacePath: record.workspacePath });
  });

  it('denies a routed renderer not registered as a view in this host', () => {
    const record = source();
    const { host, open } = testHost();
    views.register(303, record.workspacePath, { send: () => {} });
    expect(views.workspaceOf(303)).toBe(canonicalPath(record.workspacePath));
    denied(host, open, 303, { workspacePath: record.workspacePath });
  });

  it('denies a view registered in another TabHost', () => {
    const record = source();
    const { host, open } = testHost();
    const foreign = testHost();
    foreign.tabs.set('projects', { id: 'projects', isWorking: false, view: { webContents: { id: 404 } } });
    expect(foreign.host.tabForViewId(404)).toBeDefined();
    denied(host, open, 404, { workspacePath: record.workspacePath });
    expect(foreign.open).not.toHaveBeenCalled();
  });

  it('denies a view after its tab loses that renderer', () => {
    const record = source();
    const { host, open, tabs } = testHost();
    tabs.set('projects', { id: 'projects', isWorking: false });
    denied(host, open, OWN_VIEW, { workspacePath: record.workspacePath });
  });

  it('denies at the project capacity, even from the Projects screen', () => {
    const record = source();
    const { host, open } = testHost(MAX_PROJECT_TABS);
    expect(host.state().tabs.filter((tab: { purpose: string }) => tab.purpose === 'project')).toHaveLength(MAX_PROJECT_TABS);
    denied(host, open, OWN_VIEW, { workspacePath: record.workspacePath });
  });

  it('denies an existing folder absent from the project registry', () => {
    const workspacePath = makeDirWithFiles({ name: 'tab-duplicate-unregistered', files: {} });
    const { host, open } = testHost();
    denied(host, open, OWN_VIEW, { workspacePath });
  });

  it('denies a registered source whose directory is missing', () => {
    const record = source();
    rmSync(record.workspacePath, { recursive: true });
    const { host, open } = testHost();
    denied(host, open, OWN_VIEW, { workspacePath: record.workspacePath });
  });

  it('denies an internal artifacts project with an existing directory', () => {
    const record = source({ internal: 'artifacts' });
    const { host, open } = testHost();
    denied(host, open, OWN_VIEW, { workspacePath: record.workspacePath });
  });

  it('denies a source while a real removal is awaiting confirmation', async () => {
    const record = source();
    const { host, open } = testHost();
    const confirmation = Promise.withResolvers<boolean>();
    const removal = removeProjectByUser(record.workspacePath, {
      confirm: () => confirmation.promise,
      closeTabs: async () => { throw new Error('cancelled removal must not close tabs'); },
      remove: async () => { throw new Error('cancelled removal must not tear down'); },
      reportFailure: async () => {},
      changed: () => {},
      hide: () => () => {},
      capture: () => {},
    });
    try {
      expect(isRemovingProject(record.workspacePath)).toBe(true);
      denied(host, open, OWN_VIEW, { workspacePath: record.workspacePath });
    } finally {
      confirmation.resolve(false);
      await removal;
    }
    expect(isRemovingProject(record.workspacePath)).toBe(false);
  });

  const malformedRequests: unknown[] = [
    null, undefined, false, 42, 'source', [], {},
    { workspacePath: null }, { workspacePath: undefined }, { workspacePath: false },
    { workspacePath: 42 }, { workspacePath: [] }, { workspacePath: {} }, { workspacePath: '' },
  ];
  for (const request of malformedRequests) {
    it(`denies malformed request ${JSON.stringify(request)} without throwing`, () => {
      const { host, open } = testHost();
      denied(host, open, OWN_VIEW, request);
    });
  }

  it('denies an array payload even if it carries a valid workspacePath', () => {
    const record = source();
    const { host, open } = testHost();
    denied(host, open, OWN_VIEW, Object.assign([], { workspacePath: record.workspacePath }));
  });

  for (const comfort of [undefined, 'design'] as const) {
    it(`opens an owned view's valid source with a copy request (comfort ${String(comfort)})`, () => {
      const record = source({ displayName: 'Checkout notes', ...(comfort === undefined ? {} : { comfort }) });
      const { host, open } = testHost(MAX_PROJECT_TABS - 1);
      host.duplicateInTab(OWN_VIEW, { workspacePath: record.workspacePath });
      expect(open).toHaveBeenCalledTimes(1);
      expect(open.mock.calls[0]).toEqual([
        record.workspacePath,
        'projects_view',
        {
          sourcePath: record.workspacePath,
          duplicateSourceName: 'Checkout notes',
          ...(comfort === undefined ? {} : { comfort }),
          entryPoint: 'projects',
        },
      ]);
      expect(setup).not.toHaveBeenCalled();
    });
  }

  it('accepts an owned project renderer and falls back to the workspace name', () => {
    const record = source();
    const { host, open, tabs } = testHost();
    tabs.set('projects', {
      id: 'projects', isWorking: false, workspacePath: record.workspacePath,
      view: { webContents: { id: OWN_VIEW } },
    });
    expect(host.state().tabs[0]?.purpose).toBe('project');
    host.duplicateInTab(OWN_VIEW, { workspacePath: record.workspacePath });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]).toEqual([
      record.workspacePath,
      'projects_view',
      { sourcePath: record.workspacePath, duplicateSourceName: record.workspaceName, entryPoint: 'projects' },
    ]);
    expect(setup).not.toHaveBeenCalled();
  });
});
