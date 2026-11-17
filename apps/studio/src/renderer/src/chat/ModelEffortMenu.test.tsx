import '../testing/dom.js';
import { expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ModelEffortMenu } from './ModelEffortMenu.js';
import { permissionModeControls } from './composerControls.js';
import { ForwardIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';

it('keeps permissions reachable when the model catalog is unavailable', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    for (const mode of ['default', 'danger-full-access'] as const) {
      const permission = permissionModeControls({ mode, offered: mode === 'default' ? ['default', 'acceptEdits', 'auto', 'plan'] : ['danger-full-access'], setMode: () => {} });
      await act(async () => root.render(<ModelEffortMenu icon={ForwardIcon} label="Model" size={18} testId="model" modelRows={[]} isDisabled permission={permission} />));
      expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
    }
    await act(async () => root.render(<ModelEffortMenu icon={ForwardIcon} label="Model" size={18} testId="model" modelRows={[]} isDisabled />));
    expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  } finally {
    await act(async () => root.unmount());
  }
});

it.each([true, false])('offers the other agent with an empty catalog, ready=%s', async (ready) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onClick = mock(() => {});
  try {
    await act(async () => root.render(<ModelEffortMenu icon={ForwardIcon} label="Model" size={18} testId="model" modelRows={[]} isDisabled agentAction={{ harness: 'codex', ready, isDisabled: false, onClick }} />));
    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger?.disabled).toBe(false);
    await act(async () => trigger?.click());
    const action = document.querySelector<HTMLElement>('[data-testid="chat-switch-agent"]');
    expect(action?.textContent).toContain(t(ready ? 'chat.error.useOther' : 'chat.error.setUpOther', { other: t('agent.name.codex') }));
    expect(document.body.textContent?.includes(t('chat.composer.agent.consequence'))).toBe(ready);
    expect(document.querySelector('[role="menu"]')?.textContent).not.toContain(t('chat.composer.menu.heading'));
    expect(action?.getAttribute('data-selected')).toBeNull();
    await act(async () => action?.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it.each([false, true])('honors focused keyboard activation, disabled=%s', async (isDisabled) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onClick = mock(() => {});
  try {
    await act(async () => root.render(<ModelEffortMenu icon={ForwardIcon} label="Model" size={18} testId="model" modelRows={[]} isDisabled agentAction={{ harness: 'claude', ready: false, isDisabled, onClick }} />));
    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger?.disabled).toBe(false);
    for (const key of ['Enter', ' ']) {
      if (trigger?.getAttribute('aria-expanded') !== 'true') await act(async () => trigger?.click());
      await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });
      const action = document.querySelector<HTMLElement>('[data-testid="chat-switch-agent"]');
      expect(action).not.toBeNull();
      expect(action?.getAttribute('aria-disabled') === 'true').toBe(isDisabled);
      action?.focus();
      expect(document.activeElement === action).toBe(true);
      const before = onClick.mock.calls.length;
      await act(async () => action?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
      expect(onClick).toHaveBeenCalledTimes(before + (isDisabled ? 0 : 1));
      expect(trigger?.getAttribute('aria-expanded')).toBe(isDisabled ? 'true' : 'false');
    }
    if (isDisabled) {
      await act(async () => document.querySelector<HTMLElement>('[data-testid="chat-switch-agent"]')?.click());
      expect(onClick).not.toHaveBeenCalled();
    }
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
