import '../../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { FeaturedConnector } from '@studio/events';
import { ConnectorsMenu } from './ConnectorsMenu.js';
import { ConnectorsNotice } from './ConnectorsNotice.js';

/** What a screen reader hears: a shimmer paints its words twice and hides the copy. */
function spoken(node: Element | null | undefined): string | undefined {
  if (!node) return undefined;
  const copy = node.cloneNode(true) as Element;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return copy.textContent ?? '';
}

describe('connectors menu', () => {
  it('keeps account-managed sign-in actionable with supporting-size status and a readable external arrow', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const acted: string[] = [];
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ id: 'claude.ai Mobbin', name: 'claude.ai Mobbin', featured: 'mobbin', state: 'needs-sign-in', managedExternally: true }] }} onAdd={() => {}} onAct={(id) => acted.push(id)} />));
      const row = container.querySelector<HTMLElement>('[data-featured="mobbin"]')!;
      const status = row.querySelector<HTMLElement>('[data-testid="chat-connectors-state"]')!;
      expect(status.textContent).toBe('Needs sign-in');
      expect(status.style.fontSize).toBe('var(--text-supporting-size)');
      expect(row.querySelector<SVGElement>('svg:not([data-mark])')?.style.width).toBe('14px');
      await act(async () => row.click());
      expect(acted).toEqual(['claude.ai Mobbin']);
    } finally { await act(async () => root.unmount()); }
  });

  it('reads every status and action at the supporting size, in every state the menu can show', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const states = ['connected', 'starting', 'needs-sign-in', 'failed', 'off', 'adding', 'awaiting-sign-in', 'sign-in-failed'] as const;
    /* 'Add' needs an empty featured slot, 'Sign in' a signed-out one, and the loading notice no inventory at all, so no single render shows them together. */
    const renders: { label: string; inventory?: import('@studio/events').ConnectorInventory }[] = [
      { label: 'rows', inventory: { servers: states.map((state) => ({ id: state, name: state, state })) } },
      { label: 'add', inventory: { servers: [] } },
      { label: 'sign-in', inventory: { servers: [{ id: 'figma', name: 'Figma', featured: 'figma', state: 'needs-sign-in' }] } },
      { label: 'unavailable', inventory: { servers: [], unavailable: true } },
      { label: 'loading', inventory: undefined },
    ];
    const seen = new Set<string>();
    try {
      for (const { label, inventory } of renders) {
        await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={inventory} onAdd={() => {}} onAct={() => {}} defaultExpanded />));
        const menu = container.querySelector<HTMLElement>('[data-testid="chat-connectors-menu"]')!;
        const small = [...menu.querySelectorAll<HTMLElement>('[style*="font-size"]')].filter((node) => node.style.fontSize !== 'var(--text-supporting-size)');
        expect({ [label]: small.map((node) => `${node.textContent ?? ''}: ${node.style.fontSize}`) }).toEqual({ [label]: [] });
        for (const node of menu.querySelectorAll<HTMLElement>('[data-testid="chat-connectors-state"], [data-testid="chat-connectors-hint"], [role="status"]')) seen.add(node.textContent ?? '');
        for (const node of menu.querySelectorAll<HTMLElement>('[data-testid="chat-connectors-featured"]')) seen.add(node.textContent ?? '');
      }
      const everything = [...seen].join('|');
      for (const text of ['Connected', 'Starting…', 'Needs sign-in', 'Couldn’t connect', 'Off', 'Adding…', 'In your browser', 'Add', 'Sign in', 'Couldn’t load connectors. Trying again…']) {
        expect({ text, shown: everything.includes(text) }).toEqual({ text, shown: true });
      }
    } finally { await act(async () => root.unmount()); }
  });

  it('says where an account-managed tool is connected while its browser hand-off is open', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const server = { id: 'claude.ai Mobbin', name: 'claude.ai Mobbin', featured: 'mobbin' as const, managedExternally: true };
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ ...server, state: 'needs-sign-in' }] }} onAdd={() => {}} onAct={() => {}} />));
      expect(container.querySelector('[data-testid="chat-connectors-handoff"]')).toBeNull();
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ ...server, state: 'awaiting-sign-in' }] }} onAdd={() => {}} onAct={() => {}} />));
      const handoff = container.querySelector<HTMLElement>('[data-testid="chat-connectors-handoff"]')!;
      expect(handoff.textContent).toBe('Mobbin is managed in your Claude account. Connect it there, then come back.');
      expect(handoff.style.fontSize).toBe('var(--text-supporting-size)');
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ ...server, state: 'connected' }] }} onAdd={() => {}} onAct={() => {}} />));
      expect(container.querySelector('[data-testid="chat-connectors-handoff"]')).toBeNull();
      /* An ordinary Figma sign-in waits in the browser too, and must not be told to finish in a Claude account. */
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ id: 'figma', name: 'Figma', featured: 'figma', state: 'awaiting-sign-in' }] }} onAdd={() => {}} onAct={() => {}} />));
      expect(container.querySelector('[data-testid="chat-connectors-handoff"]')).toBeNull();
    } finally { await act(async () => root.unmount()); }
  });

  it('hands Escape to whoever opened it, which the list hook consumes otherwise', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let dismissed = 0;
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [] }} onAdd={() => {}} onAct={() => {}} onDismiss={() => { dismissed += 1; }} />));
      const menu = container.querySelector<HTMLElement>('[data-testid="chat-connectors-menu"]')!;
      await act(async () => { menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
      expect(dismissed).toBe(1);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('names the tool in the hand-off sentence exactly as its row does, and says what is happening on both kinds of row', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const servers = [
      { id: 'claude.ai Mobbin', name: 'claude.ai Mobbin', featured: 'mobbin' as const, state: 'awaiting-sign-in' as const, managedExternally: true },
      { id: 'claude.ai Linear', name: 'claude.ai Linear', state: 'awaiting-sign-in' as const, managedExternally: true },
    ];
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers }} onAdd={() => {}} onAct={() => {}} defaultExpanded />));
      const featured = container.querySelector<HTMLElement>('[data-featured="mobbin"]')!;
      const other = container.querySelector<HTMLElement>('[data-testid="chat-connectors-row"]')!;
      const shown = (row: HTMLElement, part: string): string => spoken(row.querySelector(`[data-testid="chat-connectors-${part}"]`)) ?? '';
      const lines = [...container.querySelectorAll<HTMLElement>('[data-testid="chat-connectors-handoff"]')].map((node) => node.textContent);
      expect(shown(featured, 'name')).toBe('Mobbin');
      expect(shown(other, 'name')).toBe('claude.ai Linear');
      expect(lines).toEqual([
        'Mobbin is managed in your Claude account. Connect it there, then come back.',
        'claude.ai Linear is managed in your Claude account. Connect it there, then come back.',
      ]);
      expect(lines.map((line) => line?.startsWith(`${shown(featured, 'name')} `))).toEqual([true, false]);
      expect(shown(featured, 'state')).toBe(shown(other, 'state'));
      expect(shown(featured, 'state')).toBe('In your browser');
      expect(featured.querySelector<HTMLElement>('[data-testid="chat-connectors-state"]')!.style.fontSize).toBe(other.querySelector<HTMLElement>('[data-testid="chat-connectors-state"]')!.style.fontSize);
    } finally { await act(async () => root.unmount()); }
  });

  it('draws no icon on an Other tools row and acknowledges only recently added tools', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const servers = [{ id: 'docs', name: 'Documentation', state: 'connected' as const }];
    const render = async (recentIds: ReadonlySet<string>) => act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers }} recentIds={recentIds} onAdd={() => {}} onAct={() => {}} defaultExpanded />));
    try {
      await render(new Set(['docs']));
      expect(container.querySelector('button')).toBeNull();
      expect(container.textContent).not.toContain('Docs');
      expect(container.textContent).not.toContain('Frames, styles and variables');
      expect(container.textContent).not.toContain('Real app screens as reference');
      expect(container.querySelector('[data-testid="chat-connectors-row"]')?.getAttribute('data-recent')).toBe('true');
      expect(container.querySelector('[data-testid="chat-connectors-added"]')?.getAttribute('aria-label')).toBe('Added');
      expect(container.querySelectorAll('[data-testid="chat-connectors-row"] svg')).toHaveLength(1);
      await render(new Set());
      expect(container.querySelector('[data-recent="true"]')).toBeNull();
      expect(container.querySelector('[data-testid="chat-connectors-added"]')).toBeNull();
      expect(container.textContent).toContain('Documentation');
    } finally { await act(async () => root.unmount()); }
  });
  it('other rows act by ID, failed featured rows never offer sign-in, and quiet states are inert', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const acted: string[] = [];
    const servers = [
      { id: 'figma', name: 'Figma', featured: 'figma' as const, state: 'failed' as const },
      ...(['needs-sign-in', 'failed', 'connected', 'starting', 'off'] as const).map((state) => ({ id: state, name: state, state })),
    ];
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers }} onAdd={() => {}} onAct={(id) => acted.push(id)} defaultExpanded />));
      const figma = container.querySelector<HTMLElement>('[data-featured="figma"]')!;
      expect(figma.textContent).not.toContain('Sign in');
      await act(async () => figma.click());
      for (const row of container.querySelectorAll<HTMLElement>('[data-testid="chat-connectors-row"]')) await act(async () => row.click());
      expect(acted).toEqual(['figma', 'failed', 'needs-sign-in']);
    } finally { await act(async () => root.unmount()); }
  });

  it('retries a sign-in that did not finish, keeps browser-wait noninteractive, and shows Connected after reopening', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const added: FeaturedConnector[] = [];
    const render = async (state: import('@studio/events').ConnectorState): Promise<void> => {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ id: 'alias', name: 'Alias', featured: 'figma', state }] }} onAdd={(provider) => added.push(provider)} onAct={(id) => { expect(id).toBe('alias'); added.push('figma'); }} />));
    };
    try {
      await render('awaiting-sign-in');
      const waiting = container.querySelector<HTMLElement>('[data-featured="figma"] [data-testid="chat-connectors-state"]');
      expect(spoken(waiting)).toBe('In your browser');
      /* The words replaced a spinner that announced itself; a state nobody is told about is worse than a slow one. */
      expect(waiting?.getAttribute('role')).toBe('status');
      await act(async () => container.querySelector<HTMLElement>('[data-featured="figma"]')?.click());
      expect(added).toEqual([]);
      await render('sign-in-failed');
      expect(container.querySelector('[data-featured="figma"] [data-testid="chat-connectors-state"]')?.textContent).toBe('Couldn’t connect');
      expect(container.textContent).not.toContain('Sign in');
      await act(async () => container.querySelector<HTMLElement>('[data-featured="figma"]')?.click());
      expect(added).toEqual(['figma']);
      await act(async () => root.render(null));
      await render('connected');
      expect(container.textContent).toContain('Connected');
      await act(async () => container.querySelector<HTMLElement>('[data-featured="figma"]')?.click());
      expect(added).toEqual(['figma']);
    } finally { await act(async () => root.unmount()); }
  });

  it('offers no Add before discovery, then updates an expanded menu in place', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const added: FeaturedConnector[] = [];
    const onAdd = (featured: FeaturedConnector) => { added.push(featured); };
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" onAdd={onAdd} onAct={() => {}} />));
      expect(container.textContent).not.toContain('Add');
      expect(container.querySelector('[data-testid="chat-connectors-loading"]')).not.toBeNull();
      const servers = [{ id: 'docs', name: 'Documentation', state: 'starting' as const }];
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers }} onAdd={onAdd} onAct={() => {}} />));
      await act(async () => container.querySelector<HTMLElement>('[data-featured="figma"]')?.click());
      expect(added).toEqual(['figma']);
      await act(async () => container.querySelector<HTMLElement>('[data-testid="chat-connectors-other"]')?.click());
      expect(container.querySelector('[data-testid="chat-connectors-row"]')?.textContent).toContain('Starting…');
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [{ ...servers[0]!, state: 'connected' }] }} onAdd={onAdd} onAct={() => {}} />));
      expect(container.querySelector('[data-testid="chat-connectors-row"]')?.textContent).toContain('Connected');
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: [], unavailable: true }} onAdd={onAdd} onAct={() => {}} />));
      expect(container.textContent).not.toContain('Add');
      expect(container.textContent).toContain('Trying again');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});

describe('connectors menu labels and order', () => {
  it('names the agent whose connectors it lists', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      for (const [agent, heading] of [['claude', 'Claude connectors'], ['codex', 'ChatGPT connectors']] as const) {
        await act(async () => root.render(<ConnectorsMenu agent={agent} inventory={{ servers: [] }} onAdd={() => {}} onAct={() => {}} />));
        expect(container.querySelector('[data-testid="chat-connectors-menu"]')?.getAttribute('aria-label')).toBe(heading);
        expect(container.textContent).toContain(heading);
      }
    } finally { await act(async () => root.unmount()); }
  });

  it('counts the tools the Other tools hint leaves out', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const servers = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `tool-${String(index)}`, name: `Tool ${String(index)}`, state: 'connected' as const }));
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: servers(3) }} onAdd={() => {}} onAct={() => {}} />));
      expect(container.querySelector('[data-testid="chat-connectors-more"]')).toBeNull();
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers: servers(6) }} onAdd={() => {}} onAct={() => {}} />));
      expect(container.querySelector('[data-testid="chat-connectors-hint"]')?.textContent).toBe('Tool 0, Tool 1, Tool 2');
      expect(container.querySelector('[data-testid="chat-connectors-more"]')?.textContent).toBe('+3');
    } finally { await act(async () => root.unmount()); }
  });

  it('draws a row that asks for something in the same ink as one that only reports', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const servers = (['needs-sign-in', 'failed', 'sign-in-failed', 'connected', 'starting', 'off'] as const).map((state) => ({ id: state, name: state, state }));
    try {
      await act(async () => root.render(<ConnectorsMenu agent="claude" inventory={{ servers }} onAdd={() => {}} onAct={() => {}} />));
      const other = container.querySelector<HTMLElement>('[data-testid="chat-connectors-other-label"]')!;
      const names = [...container.querySelectorAll<HTMLElement>('[data-testid="chat-connectors-name"]'), other].map((node) => node.style.color);
      expect(names.length).toBe(9);
      expect(new Set(names)).toEqual(new Set([other.style.color]));
    } finally { await act(async () => root.unmount()); }
  });
});

describe('connectors notice', () => {
  it('keeps opening and dismiss-only actions separate', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let opened = 0;
    let dismissed = 0;
    try {
      await act(async () => root.render(<ConnectorsNotice onOpen={() => { opened += 1; }} onDismiss={() => { dismissed += 1; }} />));
      const buttons = container.querySelectorAll<HTMLButtonElement>('button');
      await act(async () => buttons[1]?.click());
      expect(dismissed).toBe(1);
      expect(opened).toBe(0);
      await act(async () => buttons[0]?.click());
      expect(opened).toBe(1);
      expect(dismissed).toBe(1);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
