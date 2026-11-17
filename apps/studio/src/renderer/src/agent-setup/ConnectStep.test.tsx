import '../testing/dom.js';
import { afterEach, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CLAUDE_LOGIN_COMMAND, type HarnessId } from '@studio/events';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { resetSettingsPrimeForTests, useSettingsStore } from '../settings/store.js';
import { ConnectStep } from './ConnectStep.js';
import { resetAgentSetupForTesting, seedAgentSetupForShowroom } from './store.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  resetAgentSetupForTesting();
  resetSettingsPrimeForTests();
  expect(takeComplaints()).toEqual([]);
});

test('a preferred agent is saved to Settings and passed to the next onboarding step', async () => {
  const saved: HarnessId[] = [];
  const completed: Array<HarnessId | undefined> = [];
  installBridge({
    settingsSetHarness: async ({ harness }) => { saved.push(harness); return { harness }; },
    chromeSlots: () => {},
  });
  seedAgentSetupForShowroom({
    claude: { status: 'signed-in', command: CLAUDE_LOGIN_COMMAND, email: 'designer@onlook.test' },
    codex: { status: 'ready', email: 'designer@onlook.test' },
    touched: { claude: true, codex: true },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<ConnectStep entryPoint="onboarding" aside={<div />} onContinue={(harness) => { completed.push(harness); }} />);
  });
  const codex = container.querySelector<HTMLElement>('[data-testid="onboarding-tile-codex"]')!;
  await act(async () => { codex.querySelector<HTMLButtonElement>('[data-make-preferred]')!.click(); });
  expect(saved).toEqual(['codex']);
  expect(useSettingsStore.getState().harness).toBe('codex');
  expect(codex.querySelector('[data-preferred-star]')?.getAttribute('aria-pressed')).toBe('true');
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')!.click(); });
  expect(completed).toEqual(['codex']);
  await act(async () => {
    root!.render(<ConnectStep key="returned" entryPoint="onboarding" aside={<div />} onContinue={(harness) => { completed.push(harness); }} />);
  });
  expect(container.querySelector('[data-testid="onboarding-tile-codex"] [data-preferred-star]')?.getAttribute('aria-pressed')).toBe('true');
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')!.click(); });
  expect(completed).toEqual(['codex', 'codex']);
});
