import { takeComplaints } from '../../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FrameRecovery } from './FrameRecovery.js';
import { registerChatSubmit, type ChatSubmitRequest } from '../../chat/submitRegistry.js';
import { useAgentStore } from '../../agent/store.js';
import { useCanvasStore } from '../store.js';
import { useServerStore } from '../../server/store.js';
import { useExportPanel } from '../artifact/exportPanelState.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let unregister: (() => void) | undefined;
const originalBridge = window.studio;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  unregister?.();
  window.studio = originalBridge;
  useAgentStore.setState({ hasSession: false });
  useServerStore.setState({ pending: false });
  useExportPanel.setState({ isOpen: false });
  expect(takeComplaints()).toEqual([]);
});

async function mount(onRestart = () => {}) {
  window.studio = { ...originalBridge, telemetryEvent: () => {} };
  useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<FrameRecovery frameId="broken" url="http://localhost:3000/page" detail="Nothing answered" onRestart={onRestart} />));
  return [...container.querySelectorAll('button')];
}

it('offers both recovery actions and restarts only on a press', async () => {
  let restarts = 0;
  const buttons = await mount(() => { restarts += 1; });
  expect(buttons.map((button) => button.textContent)).toEqual(['Ask the agent to fix it', 'Restart']);
  expect(restarts).toBe(0);
  await act(async () => buttons[1]!.click());
  expect(restarts).toBe(1);
});

it('sends the failed address and only its Frame to Project Chat, revealing the chat rail', async () => {
  const requests: ChatSubmitRequest[] = [];
  unregister = registerChatSubmit({ submit: async (request) => {
    requests.push(request);
    return { outcome: 'accepted', held: false, submitted: { text: request.text, attachments: [], context: '', images: [], evidence: [] } };
  } });
  useCanvasStore.setState({ hiddenRails: { left: true, right: true }, previewRails: { left: false, right: false }, chromeHidden: true });
  useExportPanel.setState({ isOpen: true });
  const buttons = await mount();
  await act(async () => buttons[0]!.click());
  expect(requests).toHaveLength(1);
  expect(requests[0]!.text).toContain('http://localhost:3000/page');
  expect(requests[0]!.frames?.selectedFrameIds).toEqual(['broken']);
  expect(requests[0]!.images).toEqual([]);
  expect(requests[0]!.elementSelections).toEqual([]);
  expect(useCanvasStore.getState().hiddenRails).toEqual({ left: true, right: false });
  expect(useCanvasStore.getState().previewRails.right).toBe(true);
  expect(useCanvasStore.getState().chromeHidden).toBe(false);
  expect(useExportPanel.getState().isOpen).toBe(false);
});

it('keeps Restart usable and explains a refused agent request', async () => {
  unregister = registerChatSubmit({ submit: async () => ({ outcome: 'rejected' }) });
  const buttons = await mount();
  await act(async () => buttons[0]!.click());
  expect(container!.querySelector('[role="alert"]')?.textContent).toBe('Couldn’t send the request. Try again in Project Chat.');
  expect(buttons[1]!.disabled).toBe(false);
});

it('does not send twice while the request is in flight', async () => {
  let finish!: (value: { outcome: 'rejected' }) => void;
  let sent = 0;
  unregister = registerChatSubmit({ submit: () => {
    sent += 1;
    return new Promise((resolve) => { finish = resolve; });
  } });
  const buttons = await mount();
  await act(async () => { buttons[0]!.click(); buttons[0]!.click(); });
  expect(sent).toBe(1);
  expect(buttons[0]!.disabled).toBe(true);
  expect(buttons[1]!.disabled).toBe(false);
  await act(async () => finish({ outcome: 'rejected' }));
  expect(buttons[0]!.disabled).toBe(false);
});

it('explains an unavailable agent without disabling Restart', async () => {
  const buttons = await mount();
  await act(async () => useAgentStore.setState({ hasSession: false }));
  expect(buttons[0]!.disabled).toBe(true);
  expect(buttons[1]!.disabled).toBe(false);
  expect(container!.querySelector('[role="alert"]')?.textContent).toContain('Connect an agent in Project Chat');
});

it('shows the pending server state and prevents repeated Restart presses', async () => {
  const buttons = await mount();
  await act(async () => useServerStore.setState({ pending: true }));
  expect(buttons[1]!.textContent).toBe('Starting…');
  expect(buttons[1]!.disabled).toBe(true);
});
