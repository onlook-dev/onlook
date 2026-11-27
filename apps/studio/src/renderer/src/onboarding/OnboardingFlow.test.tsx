import '../testing/dom.js';
import { afterEach, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { takeComplaints } from '../testing/dom.js';
import { installBridge } from '../testing/bridge.js';
import { seedFlags } from '../flags/store.js';
import { OnboardingFlow } from './OnboardingFlow.js';
import { useMachineStore } from './machine-store.js';
import { useBlankCreateStore } from '../create/store.js';

const noop = (): void => undefined;
let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  seedFlags();
  useBlankCreateStore.setState({ status: { kind: 'idle' } });
  useMachineStore.setState({ snapshot: { checks: [], platform: 'mac', canChooseFolder: false }, checking: false, action: undefined, stalled: undefined, detail: undefined, notice: undefined });
  expect(takeComplaints()).toEqual([]);
});

/** The step a project is created from, where the checklist would stand in the way. */
async function renderFirstProject(onCreateBlank = noop): Promise<HTMLDivElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<OnboardingFlow startAt="import" onComplete={noop} onCreateBlank={onCreateBlank} />);
  });
  return container;
}

test('a failed check stands between the agents screen and the first project only with machine-check on (ONL-3111)', async () => {
  installBridge({ telemetryEvent: () => {}, machineCheck: async () => ({ checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: false }) });
  useMachineStore.setState({ snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: false } });

  const off = await renderFirstProject();
  expect(off.querySelector('[data-testid="onboarding-import"]')).not.toBeNull();
  expect(off.querySelector('[data-testid="onboarding-machine"]')).toBeNull();

  await act(async () => { seedFlags({ 'machine-check': true }); });
  expect(off.querySelector('[data-testid="onboarding-machine"]')).not.toBeNull();
  expect(off.querySelector('[data-testid="onboarding-import"]')).toBeNull();
});

for (const cause of ['git_not_found', 'developer_tools_missing'] as const) {
  test(`Add codebase stays blocked with ${cause} while New Draft remains available`, async () => {
    let planned = 0;
    let drafts = 0;
    seedFlags({ 'machine-check': true });
    installBridge({
      telemetryEvent: () => {},
      machineCheck: async () => ({ checks: [{ id: 'git', status: 'failed', cause }], platform: 'mac', canChooseFolder: false }),
      workspacePlan: async () => { planned++; throw new Error('blocked import must not plan a codebase'); },
    });
    const view = await renderFirstProject(() => { drafts++; });
    expect(view.querySelector('[data-testid="onboarding-import"]')).toBeNull();
    expect(view.querySelector('[data-testid="onboarding-machine"]')).not.toBeNull();
    expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(true);
    expect(view.querySelector('[data-testid="machine-action-git"]')?.textContent).toContain('Install');
    await act(async () => { view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.click(); });
    expect(planned).toBe(0);
    expect(view.querySelector('[data-testid="onboarding-import"]')).toBeNull();
    await act(async () => { view.querySelector<HTMLButtonElement>('[data-testid="onboarding-import-blank"]')?.click(); });
    expect(drafts).toBe(1);
    expect(planned).toBe(0);
  });
}

test('New Draft cannot bypass a non-Git machine failure', async () => {
  let drafts = 0;
  seedFlags({ 'machine-check': true });
  installBridge({ telemetryEvent: () => {}, machineCheck: async () => ({ checks: [{ id: 'workspace', status: 'failed', cause: 'permission_denied' }], platform: 'mac', canChooseFolder: false }) });
  const view = await renderFirstProject(() => { drafts++; });
  expect(view.querySelector('[data-testid="onboarding-import-blank"]')).toBeNull();
  expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(true);
  expect(drafts).toBe(0);
});

test('New Draft is disabled while a blank project is already being created', async () => {
  let drafts = 0;
  seedFlags({ 'machine-check': true });
  installBridge({ telemetryEvent: () => {}, machineCheck: async () => ({ checks: [{ id: 'git', status: 'failed', cause: 'git_not_found' }], platform: 'mac', canChooseFolder: false }) });
  useBlankCreateStore.setState({ status: { kind: 'creating', stage: 'setting-up' } });
  const view = await renderFirstProject(() => { drafts++; });
  const button = view.querySelector<HTMLButtonElement>('[data-testid="onboarding-import-blank"]');
  expect(button?.disabled).toBe(true);
  await act(async () => { button?.click(); });
  expect(drafts).toBe(0);
});
