import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { BlankCreateStage, BlankCreateResult, CreateBlankRequest, WorkspaceCreated } from '@studio/events';
import {
  cancelBlankCreate,
  dismissBlankCreate,
  retryBlankCreate,
  startBlankCreate,
  useBlankCreateStore,
} from './store.js';

const WORKSPACE: WorkspaceCreated = {
  workspacePath: '/scratch/teal-skylark',
  workspaceName: 'teal-skylark',
  branchName: 'studio/teal-skylark',
  baseBranch: 'main',
  sourceRepoName: 'blank-project',
  sourcePath: '/scratch/blank-project',
  sourceRepoRoot: '/scratch/blank-project',
  repoIdentity: 'blank-project',
  origin: 'blank',
  copiedEnvFiles: [],
};

function fakeBridge(): {
  install: () => void;
  stage: (stage: BlankCreateStage) => void;
  resolve: (result: BlankCreateResult) => Promise<void>;
  reject: (error: unknown) => Promise<void>;
  invokes: () => readonly CreateBlankRequest[];
  cancels: () => number;
  unsubscribed: () => number;
} {
  const invokes: CreateBlankRequest[] = [];
  let cancels = 0;
  let unsubscribed = 0;
  let stageListener: ((stage: BlankCreateStage) => void) | undefined;
  let settle: { resolve: (r: BlankCreateResult) => void; reject: (e: unknown) => void } | undefined;
  let pending: Promise<BlankCreateResult> | undefined;

  const bridge = {
    onBlankCreateStage(listener: (stage: BlankCreateStage) => void): () => void {
      stageListener = listener;
      return () => {
        unsubscribed += 1;
      };
    },
    workspaceCreateBlank(request: CreateBlankRequest): Promise<BlankCreateResult> {
      invokes.push(request);
      pending = new Promise<BlankCreateResult>((resolve, reject) => {
        settle = { resolve, reject };
      });
      return pending;
    },
    blankCreateCancel(): void {
      cancels += 1;
    },
  };

  async function drain(): Promise<void> {
    // Let the invoke's `.then`/`.catch`/`.finally` run before the case asserts.
    await pending?.catch(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
  }

  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', {
        value: { studio: bridge },
        configurable: true,
        writable: true,
      });
    },
    stage(stage): void {
      stageListener?.(stage);
    },
    async resolve(result): Promise<void> {
      settle?.resolve(result);
      await drain();
    },
    async reject(error): Promise<void> {
      settle?.reject(error);
      await drain();
    },
    invokes: () => invokes,
    cancels: () => cancels,
    unsubscribed: () => unsubscribed,
  };
}

const status = (): ReturnType<typeof useBlankCreateStore.getState>['status'] =>
  useBlankCreateStore.getState().status;

beforeEach(() => {
  useBlankCreateStore.setState({ status: { kind: 'idle' } });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

it('requests a new tab without replacing the originating project and keeps that destination when retrying', async () => {
  const bridge = fakeBridge();
  bridge.install();
  const landed: WorkspaceCreated[] = [];
  startBlankCreate('projects', (workspace) => landed.push(workspace), true);
  expect(bridge.invokes()).toEqual([{ entryPoint: 'projects', openInNewTab: true }]);
  await bridge.resolve({ ok: false, stage: 'starting', canceled: false });
  expect(status().kind).toBe('failed');
  retryBlankCreate();
  expect(bridge.invokes()).toEqual([
    { entryPoint: 'projects', openInNewTab: true },
    { entryPoint: 'projects', openInNewTab: true },
  ]);
  await bridge.resolve({ ok: true, workspace: WORKSPACE });
  expect(status().kind).toBe('idle');
  expect(landed).toEqual([]);
});

describe('startBlankCreate', () => {
  it('invokes once and mirrors the first stage immediately', () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    expect(bridge.invokes()).toEqual([{ entryPoint: 'projects' }]);
    expect(status()).toEqual({ kind: 'creating', stage: 'setting-up' });
  });

  it('is a no-op while a create is already in flight', () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    startBlankCreate('onboarding', () => {});
    expect(bridge.invokes()).toHaveLength(1);
    expect(status()).toEqual({ kind: 'creating', stage: 'setting-up' });
  });

  it('follows stage emits while creating', () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    bridge.stage('starting');
    expect(status()).toEqual({ kind: 'creating', stage: 'starting' });
  });

  it('lands the project and returns to idle on ok', async () => {
    const bridge = fakeBridge();
    bridge.install();
    const landed: WorkspaceCreated[] = [];
    startBlankCreate('projects', (workspace) => landed.push(workspace));
    await bridge.resolve({ ok: true, workspace: WORKSPACE });
    expect(landed).toEqual([WORKSPACE]);
    expect(status()).toEqual({ kind: 'idle' });
    expect(bridge.unsubscribed()).toBe(1);
  });

  it('fails with the reported stage and detail', async () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    await bridge.resolve({ ok: false, canceled: false, stage: 'starting', detail: 'port busy' });
    expect(status()).toEqual({ kind: 'failed', stage: 'starting', detail: 'port busy' });
  });

  it('fails with the last-known stage when the invoke rejects', async () => {
    const bridge = fakeBridge();
    bridge.install();
    const landed: WorkspaceCreated[] = [];
    startBlankCreate('projects', (workspace) => landed.push(workspace));
    bridge.stage('starting');
    await bridge.reject(new Error('bridge gone'));
    expect(status()).toEqual({ kind: 'failed', stage: 'starting', detail: 'bridge gone' });
    expect(landed).toEqual([]);
    expect(bridge.unsubscribed()).toBe(1);
  });
});

describe('cancelBlankCreate', () => {
  it('sends the cancel exactly once and holds canceling until the invoke settles', async () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    bridge.stage('starting');
    cancelBlankCreate();
    cancelBlankCreate();
    expect(bridge.cancels()).toBe(1);
    expect(status()).toEqual({ kind: 'canceling', stage: 'starting' });

    bridge.stage('setting-up');
    expect(status()).toEqual({ kind: 'canceling', stage: 'starting' });

    await bridge.resolve({ ok: false, canceled: true, stage: 'starting' });
    expect(status()).toEqual({ kind: 'idle' });
  });

  it('does nothing when nothing is creating', () => {
    const bridge = fakeBridge();
    bridge.install();
    cancelBlankCreate();
    expect(bridge.cancels()).toBe(0);
    expect(status()).toEqual({ kind: 'idle' });
  });
});

describe('after a failure', () => {
  it('retry re-invokes with the stored entry point and landing', async () => {
    const bridge = fakeBridge();
    bridge.install();
    const landed: WorkspaceCreated[] = [];
    startBlankCreate('onboarding', (workspace) => landed.push(workspace));
    await bridge.resolve({ ok: false, canceled: false, stage: 'setting-up' });
    expect(status()).toEqual({ kind: 'failed', stage: 'setting-up' });

    retryBlankCreate();
    expect(bridge.invokes()).toEqual([
      { entryPoint: 'onboarding' },
      { entryPoint: 'onboarding' },
    ]);
    expect(status()).toEqual({ kind: 'creating', stage: 'setting-up' });

    await bridge.resolve({ ok: true, workspace: WORKSPACE });
    expect(landed).toEqual([WORKSPACE]);
  });

  it('dismiss returns to idle without re-invoking', async () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    await bridge.resolve({ ok: false, canceled: false, stage: 'setting-up' });
    dismissBlankCreate();
    expect(status()).toEqual({ kind: 'idle' });
    expect(bridge.invokes()).toHaveLength(1);
  });

  it('retry and dismiss are no-ops outside the failed state', () => {
    const bridge = fakeBridge();
    bridge.install();
    startBlankCreate('projects', () => {});
    retryBlankCreate();
    dismissBlankCreate();
    expect(bridge.invokes()).toHaveLength(1);
    expect(status()).toEqual({ kind: 'creating', stage: 'setting-up' });
  });
});
