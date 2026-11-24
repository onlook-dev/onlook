import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { AppLike } from './index.js';
import { notePreviewDiagnostics, resetPreviewDiagnostics } from './preview-diagnostics.js';
import { createServerEntry, moveServerEntryPort, recordPortMeasurement, resetServerBookCache } from '../server/book.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { restoreProjectPreviewDiagnostics } from '../workspace/preview-diagnostics.js';

const { resetIdentityCache } = await import('../identity/store.js');
const { capture, initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting, setPreviewDiagnosticsRestorer } =
  await import('./index.js');
const { recordPreviewSettlement, resetPreviewLatchForTesting } =
  await import('./preview.js');

const made: string[] = [];
const makeRoot = (name: string): string => {
  const root = mkdtempSync(join(tmpdir(), `studio-preview-${name}-`));
  made.push(root);
  return root;
};

const fakeApp = (userData: string): AppLike => ({
  getPath: () => userData,
  getVersion: () => '0.0.0-test',
  getLocale: () => 'en-US',
  isPackaged: false,
});

const realFetch = globalThis.fetch;
const originalKey = process.env['STUDIO_POSTHOG_KEY'];
const originalRoot = process.env['STUDIO_STATE_ROOT'];

beforeEach(() => {
  resetTelemetryForTesting();
  setPreviewDiagnosticsRestorer(restoreProjectPreviewDiagnostics);
  resetPreviewLatchForTesting();
  resetIdentityCache();
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  setAppForTesting(fakeApp(makeRoot('userdata')));
  globalThis.fetch = (() =>
    Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  initTelemetry();
});

afterEach(() => {
  resetTelemetryForTesting();
  resetPreviewLatchForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  if (originalKey === undefined) delete process.env['STUDIO_POSTHOG_KEY'];
  else process.env['STUDIO_POSTHOG_KEY'] = originalKey;
  if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = originalRoot;
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const previewRows = (): Record<string, unknown>[] =>
  peekQueueForTesting()
    .filter((event) => event.event === 'preview_ready')
    .map((event) => event.properties);

const workspaceTelemetry = { project_id: 'p1', workspace_instance_id: 'instance-1' };
const otherWorkspaceTelemetry = { project_id: 'p2', workspace_instance_id: 'instance-2' };

describe('recordPreviewSettlement', () => {
  for (const { origin, wasLive } of [{ origin: 'blank', wasLive: true }, { origin: 'imported', wasLive: true }, { origin: 'imported', wasLive: false }] as const) {
    it(`restores reopened preview diagnostics after a restart for ${origin}, previously live: ${wasLive}`, () => {
      const previousRoot = process.env['STUDIO_WORKSPACE_ROOT'];
      const root = makeRoot('saved-project');
      process.env['STUDIO_WORKSPACE_ROOT'] = root;
      resetWorkspaceCache();
      resetServerBookCache();
      const folder = join(root, 'project');
      mkdirSync(folder);
      writeFileSync(join(folder, 'package.json'), JSON.stringify({ dependencies: { vite: '1.0.0' }, packageManager: 'pnpm@10.0.0' }));
      const serverFolder = join(folder, 'app');
      mkdirSync(serverFolder);
      writeFileSync(join(serverFolder, 'package.json'), JSON.stringify({ dependencies: { next: '1.0.0' } }));
      try {
        rememberProject({
          workspacePath: folder, workspaceName: 'example', branchName: 'example', baseBranch: 'main',
          sourceRepoName: 'example', sourcePath: folder, sourceRepoRoot: folder,
          repoIdentity: 'example', copiedEnvFiles: [], origin,
        });
        const entry = createServerEntry(folder, { folder: serverFolder, port: 4100, ownership: 'agent-started' });
        if (wasLive) recordPortMeasurement(folder, entry.id, 4100, 'live');
        recordPortMeasurement(folder, entry.id, 4100, 'dead');
        createServerEntry(folder, { folder, port: 4300, ownership: 'agent-started' });
        notePreviewDiagnostics(folder, { expected_port: 4100, actual_port: wasLive ? 4100 : null, was_live: wasLive, cause: wasLive ? 'server_down' : 'not_started', framework: 'Next.js', package_manager: 'pnpm', project_source: origin === 'blank' ? 'template' : 'imported' });
        resetPreviewDiagnostics();
        resetWorkspaceCache();
        resetServerBookCache();

        capture('dead_end_shown', { state: 'preview_failed', cover: 'mixed' }, folder);
        expect(peekQueueForTesting().at(-1)?.properties).toMatchObject({ cause: 'unknown', expected_port: null, actual_port: null, was_live: false });
        capture('dead_end_shown', { state: 'preview_failed', cover: 'dead', error_class: 'port_unreachable', server_port: 4100 }, folder);
        expect(peekQueueForTesting().at(-1)?.properties).toMatchObject({
          cause: wasLive ? 'server_down' : 'not_started', server_port: 4100, expected_port: 4100, actual_port: wasLive ? 4100 : null,
          was_live: wasLive, framework: 'Next.js', package_manager: 'pnpm', project_source: origin === 'blank' ? 'template' : 'imported',
          process_exited: null, exit_code: null, install_succeeded: null,
        });
        notePreviewDiagnostics(folder, { expected_port: 4100, cause: 'process_exited', exit_code: 23 });
        capture('dead_end_shown', { state: 'preview_failed', server_port: 4100 }, folder);
        expect(peekQueueForTesting().at(-1)?.properties).toMatchObject({ cause: 'process_exited', exit_code: 23 });
        capture('dead_end_shown', { state: 'preview_failed', server_port: 4200 }, folder);
        expect(peekQueueForTesting().at(-1)?.properties).toMatchObject({ cause: 'unknown', expected_port: null, actual_port: null, was_live: false });
        moveServerEntryPort(folder, entry.id, { from: 4100, to: 4400 });
        resetPreviewDiagnostics();
        resetServerBookCache();
        capture('dead_end_shown', { state: 'preview_failed', server_port: 4100 }, folder);
        expect(peekQueueForTesting().at(-1)?.properties).toMatchObject({ cause: 'unknown', expected_port: null, actual_port: null, was_live: false });
      } finally {
        if (previousRoot === undefined) delete process.env['STUDIO_WORKSPACE_ROOT'];
        else process.env['STUDIO_WORKSPACE_ROOT'] = previousRoot;
        resetWorkspaceCache();
        resetServerBookCache();
      }
    });
  }

  it('ships the measured startup cause on an unreachable preview', () => {
    notePreviewDiagnostics('preview-project', { cause: 'process_exited', expected_port: 4100, exit_code: 23, process_exited: true });
    recordPreviewSettlement({ workspaceTelemetry, workspacePath: 'preview-project', state: 'unreachable', elapsedMs: 9000 });
    expect(previewRows()[0]).toMatchObject({ cause: 'process_exited', expected_port: 4100, exit_code: 23, process_exited: true });
  });

  it('a live frame is the win', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 4200 });
    expect(previewRows()).toEqual([
      expect.objectContaining({ ...workspaceTelemetry, outcome: 'success', duration_ms: 4200 }),
    ]);
  });

  it('an unreachable frame is the loss, classified', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'unreachable', elapsedMs: 9000 });
    expect(previewRows()[0]).toMatchObject({
      ...workspaceTelemetry,
      outcome: 'failure',
      error_class: 'port_unreachable',
    });
  });

  it('loading is not a settlement', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'loading', elapsedMs: 100 });
    expect(previewRows()).toHaveLength(0);
  });

  it('ONE row per project per launch, however much the frame flaps', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 1000 });
    recordPreviewSettlement({ workspaceTelemetry, state: 'unreachable', elapsedMs: 2000 });
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 3000 });
    expect(previewRows()).toHaveLength(1);
    expect(previewRows()[0]).toMatchObject({ outcome: 'success', duration_ms: 1000 });
  });

  it('latches per project, not globally', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 1 });
    recordPreviewSettlement({ workspaceTelemetry: otherWorkspaceTelemetry, state: 'live', elapsedMs: 2 });
    expect(previewRows()).toHaveLength(2);
  });

  it('keeps the legacy project latch when the instance changes', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 1 });
    const anotherInstance = { ...workspaceTelemetry, workspace_instance_id: 'instance-3' };
    recordPreviewSettlement({ workspaceTelemetry: anotherInstance, state: 'unreachable', elapsedMs: 2 });
    expect(previewRows()).toEqual([
      expect.objectContaining({ ...workspaceTelemetry, outcome: 'success' }),
    ]);
  });

  it('carries the entry point when the creation path knew one', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 1, entryPoint: 'blank' });
    expect(previewRows()[0]).toMatchObject({ entry_point: 'blank' });
  });
});

const deadEndRows = (): Record<string, unknown>[] =>
  peekQueueForTesting()
    .filter((event) => event.event === 'dead_end_shown')
    .map((event) => event.properties);

describe('background preview measurements are not displayed dead ends (ONL-2686)', () => {
  it('an unreachable measurement alone is not a shown dead end', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'unreachable', elapsedMs: 9000 });
    expect(deadEndRows()).toHaveLength(0);
  });

  it('a successful settlement does not fire dead_end_shown', () => {
    recordPreviewSettlement({ workspaceTelemetry, state: 'live', elapsedMs: 1000 });
    expect(deadEndRows()).toHaveLength(0);
  });
});
