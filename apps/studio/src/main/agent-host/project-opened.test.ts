import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { CanvasDoc, CanvasNode, WorkspaceCreated } from '@studio/events';
import { canvasDir, canvasDocPath, canvasLogPath } from '../canvas/dir.js';
import { DAY_MS } from '../canvas/census.js';
import { CANVAS_SCHEMA_VERSION } from '../canvas/document.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from '../canvas/registry.js';
import type { AppLike } from '../telemetry/index.js';

const { resetIdentityCache } = await import('../identity/store.js');
const { initTelemetry, peekQueueForTesting, workspaceTelemetryId, resetTelemetryForTesting, setAppForTesting } =
  await import('../telemetry/index.js');
const { rememberProject, resetWorkspaceCache } = await import('../workspace/store.js');
const { forgetProjectOpened, recordProjectOpened, resetProjectOpenedForTesting } = await import('./project-opened.js');

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-project-opened-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return {
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  };
}

const REPO_IDENTITY = 'github.com/acme/site';

function fakeWorkspace(
  workspacePath: string,
  origin?: WorkspaceCreated['origin'],
): WorkspaceCreated {
  return {
    ...(origin === undefined ? {} : { origin }),
    workspacePath,
    workspaceName: 'brave-otter',
    branchName: 'tester/brave-otter',
    baseBranch: 'main',
    sourceRepoName: 'site',
    sourcePath: '/Users/tester/site',
    sourceRepoRoot: '/Users/tester/site',
    repoIdentity: REPO_IDENTITY,
    copiedEnvFiles: [],
  };
}

const ENV_KEYS = [
  'STUDIO_STATE_ROOT',
  'STUDIO_WORKSPACE_ROOT',
  'STUDIO_POSTHOG_KEY',
  'STUDIO_POSTHOG_HOST',
  'STUDIO_TELEMETRY',
  'MAIN_VITE_POSTHOG_KEY',
] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

const realFetch = globalThis.fetch;

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  resetProjectOpenedForTesting();
  resetWorkspaceCache();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  process.env['STUDIO_WORKSPACE_ROOT'] = makeRoot('registry');
  setAppForTesting(fakeApp(makeRoot('userdata')));
  globalThis.fetch = (() =>
    Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
});

afterEach(() => {
  resetTelemetryForTesting();
  resetWorkspaceCache();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('project_opened', () => {
  it('captures once per connect when project:selected fires twice, with a hashed project id', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = makeRoot('workspace');
    rememberProject(fakeWorkspace(workspacePath));

    recordProjectOpened(workspacePath);
    recordProjectOpened(workspacePath);

    const opened = peekQueueForTesting().filter((event) => event.event === 'project_opened');
    expect(opened).toHaveLength(1);
    expect(opened[0]?.properties['dev_server_source']).toBe('entered');
    expect(opened[0]?.properties['project_id']).toBe(workspaceTelemetryId(REPO_IDENTITY));
    const serialized = JSON.stringify(opened[0]?.properties);
    expect(serialized).not.toContain(workspacePath);
    expect(serialized).not.toContain('/Users/tester/site');
    expect(serialized).not.toContain(REPO_IDENTITY);
  });

  it('two tabs interleaving count each project once (ONL-2249)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const a = makeRoot('workspace-a');
    const b = makeRoot('workspace-b');
    rememberProject(fakeWorkspace(a));
    rememberProject({ ...fakeWorkspace(b), repoIdentity: 'github.com/acme/other' });

    recordProjectOpened(a);
    recordProjectOpened(b);
    recordProjectOpened(a);
    recordProjectOpened(b);

    expect(peekQueueForTesting().filter((event) => event.event === 'project_opened')).toHaveLength(2);
  });

  it('after its last tab closes, a project opened again counts again', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = makeRoot('workspace');
    rememberProject(fakeWorkspace(workspacePath));

    recordProjectOpened(workspacePath);
    forgetProjectOpened(workspacePath);
    recordProjectOpened(workspacePath);

    expect(peekQueueForTesting().filter((event) => event.event === 'project_opened')).toHaveLength(2);
  });

  it('carries the page counts beside the object census, so no second open-shaped event is needed (ONL-2488)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = makeRoot('workspace');
    rememberProject(fakeWorkspace(workspacePath));

    recordProjectOpened(workspacePath);

    const opened = peekQueueForTesting().find((event) => event.event === 'project_opened');
    expect(opened?.properties).toMatchObject({ page_count: 0, non_divider_page_count: 0 });
  });

});

describe('project_opened.source', () => {
  function openedWith(origin?: WorkspaceCreated['origin']): Record<string, unknown> | undefined {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = makeRoot('workspace');
    rememberProject(fakeWorkspace(workspacePath, origin));
    recordProjectOpened(workspacePath);
    return peekQueueForTesting().find((event) => event.event === 'project_opened')?.properties;
  }

  it("a blank record sends source 'blank' and its dev server as remembered", () => {
    expect(openedWith('blank')).toMatchObject({ source: 'blank', dev_server_source: 'remembered' });
  });

  it("an imported record sends source 'imported' and entered", () => {
    expect(openedWith('imported')).toMatchObject({ source: 'imported', dev_server_source: 'entered' });
  });

  it('a record older than the field reads as imported', () => {
    expect(openedWith(undefined)).toMatchObject({ source: 'imported', dev_server_source: 'entered' });
  });
});

describe('the canvas an open found (ONL-2486)', () => {

  function label(id: string): CanvasNode {
    return {
      id,
      pageId: 'page-1',
      kind: 'text',
      name: '',
      x: 0,
      y: 0,
      width: 212,
      height: 38,
      order: 0,
      content: { text: 'a note to self', size: 'medium' },
    };
  }

  function picture(id: string): CanvasNode {
    return {
      id,
      pageId: 'page-1',
      kind: 'image',
      name: 'ref.png',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      order: 1,
      content: { imageId: `img_${id}`, name: 'ref.png', originalWidth: 200, originalHeight: 100 },
    };
  }

  function documentFor(workspacePath: string, nodes: CanvasNode[], createdAt: string): void {
    const docId = canvasDocIdFor(workspacePath);
    mkdirSync(canvasDir(), { recursive: true });
    const doc: CanvasDoc = {
      schemaVersion: CANVAS_SCHEMA_VERSION,
      docId,
      revision: nodes.length,
      pages: { 'page-1': { id: 'page-1', name: '', order: 0 } },
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    };
    writeFileSync(
      canvasDocPath(docId),
      JSON.stringify({ version: CANVAS_SCHEMA_VERSION, data: doc }),
    );
    writeFileSync(
      canvasLogPath(docId),
      JSON.stringify(
        nodes.map((node, index) => ({
          revision: index + 1,
          author: 'user',
          at: createdAt,
          op: { type: 'create', node },
          prior: { kind: 'none' },
        })),
      ),
    );
  }

  function openedProperties(): Record<string, unknown> | undefined {
    return peekQueueForTesting().find((event) => event.event === 'project_opened')?.properties;
  }

  function workspaceOn(root: string): string {
    process.env['STUDIO_WORKSPACE_ROOT'] = root;
    resetCanvasRegistryCache();
    resetWorkspaceCache();
    const workspacePath = join(root, 'worktrees', 'brave-otter');
    rememberProject(fakeWorkspace(workspacePath));
    return workspacePath;
  }

  it('reports the labels and pictures the document holds, and the oldest label in whole days', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = workspaceOn(makeRoot('canvas-census'));
    documentFor(
      workspacePath,
      [label('t'), label('u'), picture('p')],
      new Date(Date.now() - 5 * DAY_MS - 1000).toISOString(),
    );

    recordProjectOpened(workspacePath);

    expect(openedProperties()).toMatchObject({
      text_node_count: 2,
      image_node_count: 1,
      oldest_text_node_days: 5,
    });
  });

  it('still reports the counts, and no age at all, when the operation log cannot be read', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = workspaceOn(makeRoot('canvas-census-no-log'));
    documentFor(workspacePath, [label('t'), picture('p')], new Date().toISOString());
    writeFileSync(canvasLogPath(canvasDocIdFor(workspacePath)), 'half a log');

    recordProjectOpened(workspacePath);

    expect(openedProperties()).toMatchObject({ text_node_count: 1, image_node_count: 1 });
    expect(openedProperties()?.['oldest_text_node_days']).toBeUndefined();
  });

  it('reports nothing on the canvas for a project that never opened one', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const workspacePath = workspaceOn(makeRoot('canvas-census-none'));

    recordProjectOpened(workspacePath);

    expect(openedProperties()).toMatchObject({ text_node_count: 0, image_node_count: 0 });
  });
});
