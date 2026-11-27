import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LayerProvider } from '@astryxdesign/core/Layer';
import type { HarnessId } from '@studio/events';
import { t } from '@studio/i18n';
import { makeSetupController, SetupDialogHost, useTerminalFailureToast } from './SetupDialogHost.js';
import { resetAgentSetupForTesting, useAgentSetupStore } from './store.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let previousBridge: PropertyDescriptor | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  if (previousBridge) Object.defineProperty(window, 'studio', previousBridge);
  else Reflect.deleteProperty(window, 'studio');
  root = undefined;
  container = undefined;
  resetAgentSetupForTesting();
  expect(takeComplaints()).toEqual([]);
});

test('a terminal launch failure stays inside a setup modal opened after the toast provider', async () => {
  previousBridge = Object.getOwnPropertyDescriptor(window, 'studio');
  Object.defineProperty(window, 'studio', { configurable: true, value: {
    openTerminal: () => Promise.reject(new Error('launcher unavailable')),
    claudeSignInCancel: async () => undefined,
  } });
  useAgentSetupStore.setState({ claude: { status: 'failed', detail: 'server-rejected', command: 'claude auth login' } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<LayerProvider><div /></LayerProvider>); });
  await act(async () => { root!.render(<LayerProvider><SetupDialogHost harness="claude" entryPoint="onboarding" onClose={() => undefined} /></LayerProvider>); });
  const dialog = document.querySelector('[data-testid="onboarding-dialog-claude"]')!;
  const button = dialog.querySelector<HTMLButtonElement>('[data-testid="setup-action-open-terminal"]')!;
  await act(async () => { button.click(); });
  expect(dialog.querySelector('[role="alert"]')?.textContent).toBe(t('onboarding.setup.terminalOpenFailed'));
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
});

function TerminalAction({ harness }: { harness: HarnessId }): React.JSX.Element {
  const terminalFailed = useTerminalFailureToast();
  const [controller] = useState(() => makeSetupController({ harness, entryPoint: 'onboarding', onClose: () => undefined, terminalFailed }));
  return <button onClick={() => { void controller.act('open-terminal', { harness, state: 'fallback', command: 'agent login' }); }}>Open Terminal</button>;
}

test.each(['claude', 'codex'] as const)('%s terminal failure displays one persistent remedy after repeated presses', async (harness) => {
  previousBridge = Object.getOwnPropertyDescriptor(window, 'studio');
  Object.defineProperty(window, 'studio', { configurable: true, value: { openTerminal: () => Promise.reject(new Error('launcher unavailable')) } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<LayerProvider><TerminalAction harness={harness} /></LayerProvider>); });
  const button = container.querySelector('button')!;
  await act(async () => { button.click(); });
  await act(async () => { button.click(); });
  const alerts = document.querySelectorAll('[role="alert"]');
  expect(alerts).toHaveLength(1);
  expect(alerts[0]?.textContent).toContain(t('onboarding.setup.terminalOpenFailed'));
  expect(alerts[0]?.querySelector('[role="progressbar"]')).toBeNull();
});
