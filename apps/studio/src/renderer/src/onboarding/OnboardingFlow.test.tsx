import '../testing/dom.js';
import { afterEach, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { takeComplaints } from '../testing/dom.js';
import { installBridge } from '../testing/bridge.js';
import { seedFlags } from '../flags/store.js';
import { OnboardingFlow } from './OnboardingFlow.js';
import { useMachineStore } from './machine-store.js';

const noop = (): void => undefined;
let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  seedFlags();
  useMachineStore.setState({ snapshot: { checks: [], platform: 'mac', canChooseFolder: false }, checking: false, action: undefined, stalled: undefined, detail: undefined, notice: undefined });
  expect(takeComplaints()).toEqual([]);
});

/** The step a project is created from, where the checklist would stand in the way. */
async function renderFirstProject(): Promise<HTMLDivElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<OnboardingFlow startAt="import" onComplete={noop} onCreateBlank={noop} />);
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
