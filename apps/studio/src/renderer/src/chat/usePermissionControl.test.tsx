import '../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { AgentCommandAcceptance, PermissionMode } from '@studio/events';
import { PermissionRow } from './PermissionRow.js';
import { usePermissionControl } from './usePermissionControl.js';

describe('model menu permission row acknowledgements', () => {
  for (const transition of ['unmount', 'session-change'] as const) {
    it(`invalidates queued permission writes on ${transition}`, async () => {
      const container = document.createElement('div');
      let root = createRoot(container);
      const writes: PermissionMode[] = [];
      const replies: ((acceptance: AgentCommandAcceptance) => void)[] = [];
      let sessionKey = 'first';
      const setMode = (mode: PermissionMode) => {
        writes.push(mode);
        return new Promise<AgentCommandAcceptance>((resolve) => { replies.push(resolve); });
      };
      function Menu(): React.JSX.Element {
        return <PermissionRow control={usePermissionControl({ mode: 'default', offered: ['default', 'acceptEdits', 'auto', 'plan'], sessionKey, setMode })} />;
      }
      try {
        await act(async () => root.render(<Menu />));
        for (let index = 0; index < 3; index += 1) await act(async () => container.querySelector<HTMLElement>('[role="menuitem"]')?.click());
        expect(writes).toEqual(['acceptEdits']);
        if (transition === 'unmount') {
          await act(async () => root.unmount());
          root = createRoot(container);
        } else sessionKey = 'second';
        await act(async () => root.render(<Menu />));
        await act(async () => container.querySelector<HTMLElement>('[role="menuitem"]')?.click());
        expect(writes).toEqual(['acceptEdits', 'acceptEdits']);
        await act(async () => replies[0]?.({ accepted: true }));
        expect(writes).toEqual(['acceptEdits', 'acceptEdits']);
        expect(container.querySelector('[data-testid="chat-permission-value"]')?.textContent).toBe('Accept edits');
      } finally {
        await act(async () => root.unmount());
      }
    });
  }

  it('serializes rapid cycles and keeps the latest label through intermediate acknowledgements', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const writes: PermissionMode[] = [];
    let release: ((acceptance: AgentCommandAcceptance) => void) | undefined;
    let mode: PermissionMode = 'default';
    const setMode = (next: PermissionMode) => {
      writes.push(next);
      return new Promise<AgentCommandAcceptance>((resolve) => { release = resolve; });
    };
    function Menu(): React.JSX.Element {
      return <PermissionRow control={usePermissionControl({ mode, offered: ['default', 'acceptEdits', 'auto', 'plan'], sessionKey: 'project:chat', setMode })} />;
    }
    try {
      await act(async () => root.render(<Menu />));
      for (const label of ['Accept edits', 'Auto', 'Plan']) {
        await act(async () => container.querySelector<HTMLElement>('[role="menuitem"]')?.click());
        expect(container.querySelector('[data-testid="chat-permission-value"]')?.textContent).toBe(label);
      }
      expect(writes).toEqual(['acceptEdits']);
      for (const acknowledgement of ['acceptEdits', 'auto', 'plan'] as const) {
        mode = acknowledgement;
        await act(async () => { root.render(<Menu />); release?.({ accepted: true }); });
        expect(container.querySelector('[data-testid="chat-permission-value"]')?.textContent).toBe('Plan');
      }
      expect(writes).toEqual(['acceptEdits', 'auto', 'plan']);
      await act(async () => container.querySelector<HTMLElement>('[role="menuitem"]')?.click());
      expect(container.querySelector('[data-testid="chat-permission-value"]')?.textContent).toBe('Ask');
      await act(async () => release?.({ accepted: false }));
      expect(container.querySelector('[data-testid="chat-permission-value"]')?.textContent).toBe('Plan');
    } finally {
      await act(async () => root.unmount());
    }
  });
});
