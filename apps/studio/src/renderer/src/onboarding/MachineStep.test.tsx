import '../testing/dom.js';
import { afterEach, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MACHINE_CHECK_IDS, type HarnessId } from '@studio/events';
import { takeComplaints } from '../testing/dom.js';
import { MachineStepView } from './MachineStep.js';
import type { MachineState } from './machine-rows.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

function state(partial: Partial<MachineState> = {}): MachineState {
  return {
    snapshot: { checks: [], platform: 'mac', canChooseFolder: true },
    checking: false, action: undefined, stalled: undefined, detail: undefined, notice: undefined,
    ...partial,
  };
}

const copy = async (): Promise<boolean> => true;

interface Hooks {
  onCheckAgain?: () => void;
  agents?: readonly HarnessId[];
  onCopy?: (command: string) => Promise<boolean>;
  onOpenAgent?: (harness: HarnessId) => void;
}

async function render(machine: MachineState, hooks: Hooks = {}): Promise<HTMLDivElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<MachineStepView {...machine} onContinue={() => {}} onBack={() => {}} onInstall={() => {}} onChoose={() => {}}
      onFix={() => {}} onCheckAgain={hooks.onCheckAgain ?? (() => {})} onCloseDetail={() => {}}
      onCopy={hooks.onCopy ?? copy} onHelp={() => {}}
      onOpenAgent={hooks.onOpenAgent ?? (() => {})} agents={hooks.agents ?? []} />);
  });
  return container;
}

async function press(element: Element | null): Promise<void> {
  await act(async () => { element?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

test('every check starts at once, and nothing blocks Continue while they run', async () => {
  const view = await render(state({ checking: true }));
  expect(view.querySelectorAll('[data-phase="checking"]')).toHaveLength(4);
  expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(false);
});

test('all four ready reads as four ticks, and Continue lights up', async () => {
  const view = await render(state({ snapshot: { checks: MACHINE_CHECK_IDS.map((id) => ({ id, status: 'passed' })), platform: 'mac', canChooseFolder: true } }));
  expect(view.querySelectorAll('[data-phase="ready"]')).toHaveLength(4);
  expect(view.textContent).toContain('Where Onlook saves the projects you make.');
  expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(false);
});

test('Onlook installs the developer tools, and you choose the folder', async () => {
  const view = await render(state({ snapshot: {
    checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }, { id: 'workspace', status: 'failed', cause: 'workspace_not_writable' }],
    platform: 'mac', canChooseFolder: true } }));
  expect(view.querySelector('[data-testid="machine-check-git"]')?.textContent).toContain('Not on your Mac yet. Onlook can install them.');
  expect(view.querySelector('[data-testid="machine-action-git"]')?.textContent).toContain('Install');
  expect(view.querySelector('[data-testid="machine-action-workspace"]')?.textContent).toContain('Choose folder');
  expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(true);
});

test('a row Onlook is acting on shows what it is doing, and offers nothing to press', async () => {
  const installing = await render(state({
    snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: true },
    action: { id: 'git', kind: 'install', token: 1 },
  }));
  const row = installing.querySelector('[data-testid="machine-check-git"]');
  expect(row?.getAttribute('data-phase')).toBe('acting');
  expect(row?.textContent).toContain('Installing. Your Mac may ask you to confirm.');
  expect(row?.querySelectorAll('button')).toHaveLength(0);
});

test('while Onlook is acting, no other row can take the floor from it', async () => {
  const view = await render(state({
    snapshot: { checks: [
      { id: 'git', status: 'failed', cause: 'developer_tools_missing' },
      { id: 'workspace', status: 'failed', cause: 'workspace_not_writable' },
      { id: 'port', status: 'failed', cause: 'no_free_port' },
    ], platform: 'mac', canChooseFolder: true },
    action: { id: 'git', kind: 'install', token: 1 },
  }));
  // A second action would take the owner token and the running install's answer would be dropped.
  expect(view.querySelector<HTMLButtonElement>('[data-testid="machine-action-workspace"]')?.disabled).toBe(true);
  expect(view.querySelector<HTMLButtonElement>('[data-testid="machine-action-port"]')?.disabled).toBe(true);
});

test('an install that did not finish turns the row over to the person', async () => {
  const view = await render(state({
    snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: true },
    stalled: 'git',
  }));
  const row = view.querySelector('[data-testid="machine-check-git"]');
  expect(row?.getAttribute('data-phase')).toBe('failed');
  expect(row?.textContent).toContain('The install didn’t finish.');
  expect(view.querySelector('[data-testid="machine-action-git"]')?.textContent).toContain('Fix');
});

test('a check Onlook cannot fix offers Fix, never a verb it cannot perform', async () => {
  const view = await render(state({ snapshot: {
    checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }, { id: 'helper', status: 'failed', cause: 'helper_failed' }],
    platform: 'mac', canChooseFolder: true } }));
  expect(view.querySelector('[data-testid="machine-action-port"]')?.textContent).toContain('Fix');
  expect(view.querySelector('[data-testid="machine-check-helper"]')?.textContent).toContain('The helper didn’t start.');
  expect(view.querySelector('[data-testid="machine-action-helper"]')?.textContent).toContain('Fix');
  // The design offers Restart here; the product has no running helper to restart (ONL-3111).
  expect([...view.querySelectorAll('button')].map((button) => button.textContent)).not.toContain('Restart');
});

test('a check that cannot answer says so and leaves Continue alone', async () => {
  const view = await render(state({ snapshot: {
    checks: [...MACHINE_CHECK_IDS.filter((id) => id !== 'port').map((id) => ({ id, status: 'passed' as const })), { id: 'port', status: 'inconclusive' }],
    platform: 'mac', canChooseFolder: true } }));
  const row = view.querySelector('[data-testid="machine-check-port"]');
  expect(row?.textContent).toContain('Couldn’t confirm. You can still continue.');
  expect(row?.textContent).toContain('Not confirmed');
  expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(false);
});

test('a status the row only draws is still spoken, and changes when a check settles', async () => {
  const view = await render(state({ checking: true, snapshot: {
    checks: [{ id: 'git', status: 'passed' }, { id: 'workspace', status: 'failed', cause: 'workspace_not_writable' }],
    platform: 'mac', canChooseFolder: true } }));
  const spoken = (id: string): string | undefined => view.querySelector(`[data-testid="machine-status-${id}"]`)?.textContent ?? undefined;
  expect(spoken('git')).toBe('Ready');
  expect(spoken('workspace')).toBe('Needs attention');
  expect(spoken('port')).toBe('Checking…');
  // The word has to be text inside the live region: a changed `aria-label` is not announced.
  expect(view.querySelector('[aria-live="polite"]')?.contains(view.querySelector('[data-testid="machine-status-git"]'))).toBe(true);
});

test('Fix opens that one check on its own, with its prompt and its link', async () => {
  const view = await render(state({
    snapshot: { checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }], platform: 'mac', canChooseFolder: true },
    detail: 'port',
  }));
  const detail = view.querySelector('[data-testid="machine-detail"]');
  expect(detail?.textContent).toContain('Another app is using the preview ports');
  expect(detail?.textContent).toContain('Onlook shows your app on a port between 4700 and 4799');
  expect(detail?.textContent).toContain('Something on my computer is using every port from 4700 to 4799 on 127.0.0.1.');
  expect(view.querySelector('[data-testid="machine-help"]')?.textContent).toContain('Open Activity Monitor');
  expect(view.querySelector('[data-testid="machine-check-again"]')?.textContent).toContain('Check again');
  // The list is replaced, not stacked under it.
  expect(view.querySelector('[data-testid="machine-check-port"]')).toBeNull();
});

test('a detail view with no link to offer draws none', async () => {
  const view = await render(state({
    snapshot: { checks: [{ id: 'helper', status: 'failed', cause: 'helper_failed' }], platform: 'mac', canChooseFolder: true },
    detail: 'helper',
  }));
  expect(view.querySelector('[data-testid="machine-detail"]')?.textContent).toContain('The helper didn’t start');
  expect(view.querySelector('[data-testid="machine-help"]')).toBeNull();
});

test('Check again runs on a press, and a second press while it runs does nothing', async () => {
  const failing = { checks: [{ id: 'port' as const, status: 'failed' as const, cause: 'no_free_port' as const }], platform: 'mac' as const, canChooseFolder: true };
  let presses = 0;
  const count = (): void => { presses += 1; };

  const idle = await render(state({ snapshot: failing, detail: 'port' }), { onCheckAgain: count });
  await press(idle.querySelector('[data-testid="machine-check-again"]'));
  expect(presses).toBe(1);

  await act(async () => { root?.unmount(); });
  container?.remove();

  const busy = await render(state({ snapshot: failing, detail: 'port', action: { id: 'port', kind: 'fix', token: 1 } }), { onCheckAgain: count });
  const again = busy.querySelector('[data-testid="machine-check-again"]');
  // The design keeps this the one filled control while it runs, so the press is dropped rather than the button dimmed.
  expect(again?.textContent).toContain('Checking…');
  await press(again);
  expect(presses).toBe(1);
});

test('a detail view whose check has recovered falls back to the list', async () => {
  const view = await render(state({
    snapshot: { checks: MACHINE_CHECK_IDS.map((id) => ({ id, status: 'passed' })), platform: 'mac', canChooseFolder: true },
    detail: 'port',
  }));
  expect(view.querySelector('[data-testid="machine-detail"]')).toBeNull();
  expect(view.querySelectorAll('[data-phase="ready"]')).toHaveLength(4);
});

test('existing Projects are never offered a folder change', async () => {
  const view = await render(state({ snapshot: {
    checks: [{ id: 'workspace', status: 'failed', cause: 'workspace_not_writable' }], platform: 'mac', canChooseFolder: false } }));
  expect(view.querySelector('[data-testid="machine-action-workspace"]')?.textContent).toContain('Fix');
  expect([...view.querySelectorAll('button')].map((button) => button.textContent)).not.toContain('Choose folder');
});

test('a refused check never leaves its rows claiming to still be running', async () => {
  const view = await render(state({ notice: 'machine.unavailable' }));
  expect(view.querySelectorAll('[data-phase="checking"]')).toHaveLength(0);
  expect(view.querySelectorAll('[data-phase="unconfirmed"]')).toHaveLength(4);
  expect(view.querySelector<HTMLButtonElement>('[data-testid="onboarding-continue"]')?.disabled).toBe(false);
});

test('a Mac without developer tools and a Linux box without Git are not the same row', async () => {
  const linux = await render(state({ snapshot: {
    checks: [{ id: 'git', status: 'failed', cause: 'git_not_found' }], platform: 'linux', canChooseFolder: true } }));
  expect(linux.querySelector('[data-testid="machine-check-git"]')?.textContent).toContain('Git isn’t installed.');
  expect(linux.querySelector('[data-testid="machine-action-git"]')?.textContent).toContain('Fix');
  expect([...linux.querySelectorAll('button')].map((button) => button.textContent)).not.toContain('Install');
});

test('the prompt can be taken straight to the agents the person connected', async () => {
  const opened: HarnessId[] = [];
  let copies = 0;
  const view = await render(state({
    snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: true },
    detail: 'git', stalled: 'git',
  }), {
    agents: ['claude', 'codex'],
    onCopy: async () => { copies += 1; return true; },
    onOpenAgent: (harness) => { opened.push(harness); },
  });
  expect(view.querySelector('[data-testid="copy-block-action-claude"]')?.textContent).toContain('Open Claude');
  expect(view.querySelector('[data-testid="copy-block-action-codex"]')?.textContent).toContain('Open ChatGPT');
  await press(view.querySelector('[data-testid="copy-block-action-claude"]'));
  expect(opened).toEqual(['claude']);
  // The prompt travels with the press: an agent opened beside an empty clipboard is no help.
  expect(copies).toBe(1);
});

test('no agent connected, no app to offer, and the prompt is still there to copy', async () => {
  const view = await render(state({
    snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: true },
    detail: 'git', stalled: 'git',
  }));
  expect(view.querySelectorAll('[data-testid^="copy-block-action-"]')).toHaveLength(0);
  expect(view.querySelector('[data-testid="copy-block-copy"]')).not.toBeNull();
  expect(view.querySelector('[data-testid="machine-help"]')).not.toBeNull();
});

test('a copy that did not land keeps the agent closed', async () => {
  const opened: HarnessId[] = [];
  const view = await render(state({
    snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: true },
    detail: 'git', stalled: 'git',
  }), { agents: ['claude'], onCopy: async () => false, onOpenAgent: (harness) => { opened.push(harness); } });
  await press(view.querySelector('[data-testid="copy-block-action-claude"]'));
  // An agent in front of the person with nothing to paste is worse than no agent.
  expect(opened).toEqual([]);
  expect(view.querySelector('[data-testid="copy-block-copied"]')).toBeNull();
});

test('the agent opens only once the line is on the clipboard', async () => {
  const order: string[] = [];
  let land = (): void => {};
  const view = await render(state({
    snapshot: { checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }], platform: 'mac', canChooseFolder: true },
    detail: 'git', stalled: 'git',
  }), {
    agents: ['claude'],
    onCopy: () => new Promise<boolean>((resolve) => { order.push('copy'); land = () => { resolve(true); }; }),
    onOpenAgent: () => { order.push('open'); },
  });
  await press(view.querySelector('[data-testid="copy-block-action-claude"]'));
  expect(order).toEqual(['copy']);
  await act(async () => { land(); });
  expect(order).toEqual(['copy', 'open']);
});

test('a copy that landed says so in place of the control', async () => {
  const view = await render(state({
    snapshot: { checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }], platform: 'mac', canChooseFolder: true },
    detail: 'port',
  }));
  await press(view.querySelector('[data-testid="copy-block-copy"]'));
  expect(view.querySelector('[data-testid="copy-block-copied"]')).not.toBeNull();
  expect(view.querySelector('[data-testid="copy-block-copy"]')).toBeNull();
});

test('a copy that did not land leaves the control where it was', async () => {
  const view = await render(state({
    snapshot: { checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }], platform: 'mac', canChooseFolder: true },
    detail: 'port',
  }), { onCopy: async () => false });
  await press(view.querySelector('[data-testid="copy-block-copy"]'));
  expect(view.querySelector('[data-testid="copy-block-copied"]')).toBeNull();
  expect(view.querySelector('[data-testid="copy-block-copy"]')).not.toBeNull();
});

test('Copied belongs to the line that was copied, not to the box', async () => {
  const failing = { checks: [
    { id: 'port' as const, status: 'failed' as const, cause: 'no_free_port' as const },
    { id: 'helper' as const, status: 'failed' as const, cause: 'helper_failed' as const },
  ], platform: 'mac' as const, canChooseFolder: true };
  const view = await render(state({ snapshot: failing, detail: 'port' }));
  await press(view.querySelector('[data-testid="copy-block-copy"]'));
  expect(view.querySelector('[data-testid="copy-block-copied"]')).not.toBeNull();
  await act(async () => {
    root!.render(<MachineStepView {...state({ snapshot: failing, detail: 'helper' })} onContinue={() => {}} onBack={() => {}}
      onInstall={() => {}} onChoose={() => {}} onFix={() => {}} onCheckAgain={() => {}} onCloseDetail={() => {}}
      onCopy={copy} onHelp={() => {}} onOpenAgent={() => {}} agents={[]} />);
  });
  // Another check's prompt is a line nobody copied.
  expect(view.querySelector('[data-testid="copy-block-copied"]')).toBeNull();
  expect(view.querySelector('[data-testid="copy-block-copy"]')).not.toBeNull();
});
