import '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProjectSetupSnapshot, WorkspaceCreated } from '@studio/events';
import { useAgentStore } from '../agent/store.js';
import { useCanvasStore } from '../canvas/store.js';
import { useSetupFailureCardStore } from '../canvas/failureCentre.js';
import { SetupFailureCardSlot } from '../canvas/SetupFailureCard.js';
import { useProjectSetupStore } from '../project-setup/store.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { AppRunNotice, RunNoticeCard } from './RunNotice.js';
import { runFeedback, useRunFeedbackStore } from './runFeedbackStore.js';

const initial = {
  workspace: useWorkspaceStore.getState(), canvas: useCanvasStore.getState(),
  setup: useProjectSetupStore.getState(), agent: useAgentStore.getState(),
};
let root: Root | undefined;
let container: HTMLElement | undefined;
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  useWorkspaceStore.setState(initial.workspace);
  useCanvasStore.setState(initial.canvas);
  useProjectSetupStore.setState(initial.setup);
  useAgentStore.setState(initial.agent);
  useSetupFailureCardStore.setState({ ask: { state: 'idle' } });
  runFeedback.reset();
  expect(takeComplaints()).toEqual([]);
});

it('shows and repairs the saved setup failure with frames on a reopened canvas', async () => {
  let asks = 0;
  installBridge({ projectSetupAsk: async () => { asks += 1; return { ok: false, reason: 'unavailable' }; } });
  useWorkspaceStore.setState({ workspace: { workspacePath: '/work/project', sourceRepoName: 'project', repoIdentity: 'project' } as WorkspaceCreated });
  useCanvasStore.setState({ nodes: [{ id: 'saved-frame', type: 'frame', position: { x: 0, y: 0 }, data: { homeUrl: 'http://localhost:4710', currentUrl: 'http://localhost:4710', name: 'Home', title: '', health: 'unreachable', canGoBack: false, canGoForward: false } }] });
  const snapshot: ProjectSetupSnapshot = {
    state: 'failed', verified: null,
    saved: { revision: 'r1', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 4710 }] } },
    failure: { revision: 'r1', stage: 'ready', command: 'npm run dev', reason: 'Another app is using port 4710.', outputTail: '', elapsedMs: 20 },
  };
  useProjectSetupStore.setState({ read: { kind: 'ready', snapshot } });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<AppRunNotice />); });
  const markup = container.innerHTML;
  expect(markup).toContain('Another app is using port 4710.');
  expect(markup).toContain('app-run-notice-repair');
  expect(markup).toContain('Ask the agent for help');
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="app-run-notice-repair"]')!.click(); });
  expect(asks).toBe(1);
  expect(container.textContent).toContain('The agent isn’t available yet. Try again.');
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="app-run-notice-dismiss"]')!.click(); });
  expect(container.innerHTML).toBe('');
  const next = { ...snapshot, failure: { ...snapshot.failure!, elapsedMs: 30 } };
  await act(async () => { useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: next } }); });
  expect(container.textContent).toContain('Another app is using port 4710.');
  await act(async () => { useSetupFailureCardStore.setState({ ask: { state: 'sent', workspacePath: '/work/project', failure: next.failure } }); });
  expect(container.innerHTML).toBe('');
  await act(async () => {
    useSetupFailureCardStore.setState({ ask: { state: 'idle' } });
    useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: { ...snapshot, state: 'running', failure: null } } });
  });
  expect(container.innerHTML).toBe('');
});

it('keeps a blank project’s saved setup failure in chat without covering stopped frames', async () => {
  let asks = 0;
  installBridge({ projectSetupAsk: async () => { asks += 1; return { ok: true }; } });
  useWorkspaceStore.setState({ workspace: { workspacePath: '/work/blank', sourceRepoName: 'blank', repoIdentity: 'blank', origin: 'blank' } as WorkspaceCreated });
  useCanvasStore.setState({ nodes: [{ id: 'saved-frame', type: 'frame', position: { x: 0, y: 0 }, data: { homeUrl: 'http://localhost:4710', currentUrl: 'http://localhost:4710', name: 'Home', title: '', health: 'unreachable', canGoBack: false, canGoForward: false } }] });
  const snapshot: ProjectSetupSnapshot = {
    state: 'failed', verified: null,
    saved: { revision: 'r1', definition: { prepare: 'test -f server.mjs', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'node server.mjs', port: 4710 }] } },
    failure: { revision: 'r1', stage: 'prepare', command: 'test -f server.mjs', reason: 'The command exited with code 1.', outputTail: '', elapsedMs: 20 },
  };
  useProjectSetupStore.setState({ read: { kind: 'ready', snapshot } });
  runFeedback.begin({ press: 'start', entryIds: ['saved-server'] }, true);
  runFeedback.observeSetup('failed');
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<><AppRunNotice /><SetupFailureCardSlot card={{ step: 'install', cause: 'install' }} /></>);
  });
  expect(container.querySelector('[data-testid="setup-failure-card"]')).toBeNull();
  expect(container.querySelector('[data-testid="app-run-notice"]')).not.toBeNull();
  expect(container.textContent).toContain('The command exited with code 1.');
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="app-run-notice-repair"]')!.click(); });
  expect(asks).toBe(1);
});

it('renders a neutral notice with a disabled repair action and an actionable ask refusal', () => {
  const markup = renderToStaticMarkup(<RunNoticeCard notice="start-failed" onDismiss={() => {}} repair={{ reason: 'Port 4710 is in use.', onAsk: () => {}, isDisabled: true, error: 'The agent isn’t available yet. Try again.' }} />);
  expect(markup).toContain('disabled');
  expect(markup).toContain('Try again.');
  expect(markup).toContain('app-run-notice-dismiss');
});

it('retires only the failed Start feedback when repair takes over, and lets a refused ask retry', async () => {
  let accepts = false;
  installBridge({ projectSetupAsk: async () => accepts ? { ok: true } : { ok: false, reason: 'unavailable' } });
  useWorkspaceStore.setState({ workspace: { workspacePath: '/work/project', sourceRepoName: 'project', repoIdentity: 'project' } as WorkspaceCreated });
  useCanvasStore.setState({ nodes: [{ id: 'saved-frame', type: 'frame', position: { x: 0, y: 0 }, data: { homeUrl: 'http://localhost:4710', currentUrl: 'http://localhost:4710', name: 'Home', title: '', health: 'unreachable', canGoBack: false, canGoForward: false } }] });
  const snapshot: ProjectSetupSnapshot = {
    state: 'failed', verified: null,
    saved: { revision: 'r1', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 4710 }] } },
    failure: { revision: 'r1', stage: 'ready', command: 'npm run dev', reason: 'Another app is using port 4710.', outputTail: '', elapsedMs: 20 },
  };
  useProjectSetupStore.setState({ read: { kind: 'ready', snapshot } });
  runFeedback.begin({ press: 'start' }, true);
  runFeedback.observeSetup('failed');
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<AppRunNotice />); });
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="app-run-notice-repair"]')!.click(); });
  expect(container.textContent).toContain('The agent isn’t available yet. Try again.');
  accepts = true;
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="app-run-notice-repair"]')!.click(); });
  expect(container.innerHTML).toBe('');
  await act(async () => { useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: { ...snapshot, state: 'preparing' } } }); });
  expect(container.innerHTML).toBe('');
  expect(useRunFeedbackStore.getState().notice).toBeUndefined();
  await act(async () => { useRunFeedbackStore.setState({ notice: 'stop-failed' }); });
  expect(container.textContent).toContain('Press Stop to try again.');
});
