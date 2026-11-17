import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { WorkspaceCreated } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { readStateFile } from '../state/file.js';
import { resetSettingsCache } from '../settings/state.js';
import { resetIdentityCache } from '../identity/store.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { recordProjectImported, recordProjectRemoved } from '../workspace/telemetry.js';
import * as telemetry from './index.js';
import { pendingBatches, readBatch } from './outbox.js';

const environmentKeys = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_TELEMETRY', 'AGENT_HEADLESS'] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const repoIdentity = 'github.com/example/shared-repo';

function launch(userData: string): void {
  telemetry.resetTelemetryForTesting();
  resetSettingsCache();
  resetIdentityCache();
  resetWorkspaceCache();
  process.env['STUDIO_STATE_ROOT'] = userData;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  telemetry.setAppForTesting({
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  });
  telemetry.initTelemetry();
}

function record(workspaceName: string): WorkspaceCreated {
  return {
    workspacePath: join(process.env['STUDIO_STATE_ROOT']!, workspaceName),
    workspaceName,
    branchName: `user/${workspaceName}`,
    baseBranch: 'main',
    sourceRepoName: 'shared-repo',
    sourcePath: '/source/shared-repo',
    sourceRepoRoot: '/source/shared-repo',
    repoIdentity,
    copiedEnvFiles: [],
  };
}

function imported(): Record<string, unknown> {
  recordProjectImported('picked', { ok: true, record: record('first'), completedBy: 'git' }, telemetry.capture);
  return telemetry.peekQueueForTesting().find((event) => event.event === 'project_imported')!.properties;
}

beforeEach(() => {
  for (const key of environmentKeys) delete process.env[key];
  globalThis.fetch = (() => Promise.resolve(new Response('{}'))) as unknown as typeof fetch;
});

afterEach(() => {
  telemetry.resetTelemetryForTesting();
  telemetry.setAppForTesting(undefined);
  resetSettingsCache();
  resetIdentityCache();
  resetWorkspaceCache();
  globalThis.fetch = originalFetch;
  for (const key of environmentKeys) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(cleanupTempFixtures);

describe('Workspace telemetry instance IDs', () => {
  it('two installs importing the same repo share project_id but differ in workspace_instance_id', () => {
    const firstRoot = makeStateRoot({ name: 'workspace-instance-first' });
    launch(firstRoot);
    const first = imported();
    const install = readStateFile(join(firstRoot, 'install-id'), 1);
    expect(install.kind).toBe('data');
    if (install.kind !== 'data') throw new Error('missing install id');
    expect(first['project_id']).toBe(createHash('sha256').update(repoIdentity).digest('hex').slice(0, 16));
    expect(first['workspace_instance_id']).toBe(createHash('sha256').update(`${install.data}${repoIdentity}`).digest('hex').slice(0, 16));

    launch(makeStateRoot({ name: 'workspace-instance-second' }));
    const second = imported();
    expect(second['project_id']).toBe(first['project_id']);
    expect(second['workspace_instance_id']).toMatch(/^[0-9a-f]{16}$/);
    expect(second['workspace_instance_id']).not.toBe(first['workspace_instance_id']);
    expect(JSON.stringify(second)).not.toContain(repoIdentity);
    expect(JSON.stringify(second)).not.toContain(firstRoot);
    expect(JSON.stringify(second)).not.toContain(install.data as string);
  });

  it('one install keeps both IDs across restart and anonymous identity reset', () => {
    const root = makeStateRoot({ name: 'workspace-instance-restart' });
    launch(root);
    const first = telemetry.workspaceTelemetryProperties(repoIdentity);
    telemetry.resetTelemetryIdentity();
    expect(telemetry.workspaceTelemetryProperties(repoIdentity)).toEqual(first);
    launch(root);
    expect(telemetry.workspaceTelemetryProperties(repoIdentity)).toEqual(first);
  });

  it('Projects in one Workspace share both IDs and unknown paths resolve neither', () => {
    launch(makeStateRoot({ name: 'workspace-instance-projects' }));
    const first = record('first');
    const second = record('second');
    rememberProject(first);
    rememberProject(second);
    expect(telemetry.resolveWorkspaceTelemetryProperties(first.workspacePath)).toEqual(telemetry.workspaceTelemetryProperties(repoIdentity));
    expect(telemetry.resolveWorkspaceTelemetryProperties(second.workspacePath)).toEqual(telemetry.resolveWorkspaceTelemetryProperties(first.workspacePath));
    expect(telemetry.resolveWorkspaceTelemetryProperties('/unknown')).toBeUndefined();
    expect(telemetry.workspaceTelemetryProperties('blank/other').workspace_instance_id).not.toBe(telemetry.workspaceTelemetryProperties(repoIdentity).workspace_instance_id);
  });

  it('import and removal carry both IDs without relying on registry membership', () => {
    launch(makeStateRoot({ name: 'workspace-instance-unregistered' }));
    const properties = imported();
    recordProjectRemoved(record('first'), { missing: false, last_in_group: true }, telemetry.capture);
    const removed = telemetry.peekQueueForTesting().find((event) => event.event === 'project_removed')!.properties;
    expect(properties['workspace_instance_id']).toMatch(/^[0-9a-f]{16}$/);
    expect(removed['project_id']).toBe(properties['project_id']);
    expect(removed['workspace_instance_id']).toBe(properties['workspace_instance_id']);
  });

  it('durable events persist both Workspace IDs before an offline retry', async () => {
    launch(makeStateRoot({ name: 'workspace-instance-durable' }));
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const properties = telemetry.workspaceTelemetryProperties(repoIdentity);
    expect(await telemetry.captureDurable('project_renamed', { ...properties, by: 'user' })).toBe('queued');
    const events = pendingBatches().flatMap((path) => readBatch(path) ?? []);
    expect(events.find((event) => event.event === 'project_renamed')?.properties).toMatchObject(properties);
  });
});
