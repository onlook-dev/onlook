import '../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PermissionMode } from '@studio/events';
import { permissionModeControls } from './composerControls.js';
import { PermissionRow } from './PermissionRow.js';

describe('model menu permission row', () => {
  it('names itself Permissions and cycles the mode beside it in the canonical order', async () => {
    const picked: PermissionMode[] = [];
    function Menu(): React.JSX.Element {
      const [mode, setMode] = useState<PermissionMode>('default');
      const control = permissionModeControls({ mode, offered: ['auto', 'plan', 'acceptEdits', 'default'], setMode: (next) => { picked.push(next); setMode(next); } });
      return <div role="menu"><PermissionRow control={control} /></div>;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      const mode = (): string | null | undefined => container.querySelector('[data-testid="chat-permission-value"]')?.textContent;
      await act(async () => root.render(<Menu />));
      expect(container.textContent).toBe('PermissionsAsk');
      for (const label of ['Accept edits', 'Auto', 'Plan', 'Ask']) {
        await act(async () => container.querySelector<HTMLElement>('[role="menuitem"]')?.click());
        expect(mode()).toBe(label);
      }
      expect(picked).toEqual(['acceptEdits', 'auto', 'plan', 'default']);
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it('shows ChatGPT Full access as text, not a control', async () => {
    let clicks = 0;
    const container = document.createElement('div');
    const root = createRoot(container);
    const control = permissionModeControls({ mode: 'danger-full-access', offered: ['danger-full-access'], setMode: () => { clicks += 1; } });
    try {
      await act(async () => root.render(<PermissionRow control={control} />));
      expect(container.textContent).toBe('PermissionsFull access');
      expect(container.querySelector('[role="menuitem"],button,[tabindex]')).toBeNull();
      await act(async () => container.querySelector<HTMLElement>('[data-testid="chat-permission-row"]')?.click());
      expect(clicks).toBe(0);
    } finally { await act(async () => root.unmount()); }
  });
});
