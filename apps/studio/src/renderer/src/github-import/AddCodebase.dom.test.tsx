import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GithubImportCommand, GithubImportState } from '@studio/events';
import { seedCapabilities } from '../capabilities.js';
import { seedFlags } from '../flags/store.js';
import { t } from '@studio/i18n';
import { deferred, installBridge } from '../testing/bridge.js';
import { FolderIcon } from '../icons/glyphs.js';
import { SidebarRow, SIDEBAR_ROW_HEIGHT } from '../projects/SidebarRow.js';
import { AddCodebase } from './AddCodebase.js';
import { GithubImportFlow, GithubSettings } from './GithubImport.js';
import { EMPTY_GITHUB, githubCommand, useGithubImport } from './store.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const disconnected = { ...EMPTY_GITHUB, enabled: true, connection: { status: 'disconnected' as const } };

async function mount(bridge: Parameters<typeof installBridge>[0], canOpen = true): Promise<void> {
  seedFlags({ sections: false, connectors: false, githubImport: true });
  seedCapabilities({ github: true });
  installBridge(bridge);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<AddCodebase entryPoint="projects" onFolder={() => {}} {...(canOpen ? { onOpen: () => {} } : {})} />); });
}

const dialog = (): HTMLElement | null => document.querySelector('[data-testid="add-codebase-dialog"]');
const search = (): HTMLInputElement => document.querySelector<HTMLInputElement>('[data-testid="github-search"]')!;
const action = (id: 'clone' | 'open'): HTMLButtonElement | null => document.querySelector<HTMLButtonElement>(`[data-testid="github-${id}"]`);

/** This DOM reports a typed value to React on the key events around it, so a keystroke carries all three. */
function keySearch(key: string, value: string): void {
  const field = search();
  field.focus();
  field.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

function typeSearch(text: string): void {
  let value = '';
  for (const character of text) {
    value += character;
    keySearch(character, value);
  }
}

const clearSearch = (): void => keySearch('Backspace', '');
/* `Dialog` keeps its `<dialog>` mounted while closed, so the flow inside it is what tells the two apart. */
const flow = (): HTMLElement | null => document.querySelector('[data-testid="github-import-flow"]');

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  seedFlags({ sections: false, connectors: false, githubImport: false });
  seedCapabilities();
  useGithubImport.setState({ state: EMPTY_GITHUB, pendingCommands: [], progressCommands: [] });
  expect(takeComplaints()).toEqual([]);
});

test('the repository choice opens a modal and focus moves in once preparation ends', async () => {
  const beginning = deferred<GithubImportState>();
  await mount({ githubImport: (command: GithubImportCommand) => command.kind === 'begin' ? beginning.promise : Promise.resolve(disconnected) });
  const source = document.querySelector<HTMLButtonElement>('[data-testid="codebase-from-github"]');
  expect(source).not.toBeNull();
  await act(async () => { source!.click(); });
  expect(dialog()).not.toBeNull();
  expect(dialog()!.textContent).toContain(t('github.checking'));
  expect(dialog()!.querySelector('[data-testid="github-import-connect"] button')).toBeNull();
  await act(async () => { beginning.settle(disconnected); });
  const connect = dialog()!.querySelector<HTMLButtonElement>('[data-testid="github-import-connect"] button');
  expect(connect?.disabled).toBe(false);
  expect(document.activeElement).toBe(connect);
});

test('Settings shows Checking without Connect GitHub until the first answer arrives', async () => {
  const answer = deferred<GithubImportState>();
  await mount({ githubImport: () => answer.promise });
  await act(async () => { root!.render(<GithubSettings />); });
  const row = document.querySelector('[data-testid="github-settings"]')!;
  expect(row.textContent).toContain(t('github.checking'));
  expect(row.textContent?.split(t('github.checking')).length).toBe(2);
  expect(row.textContent).not.toContain(t('github.connect'));
  expect(row.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  const checking = githubCommand({ kind: 'status' });
  await act(async () => {
    answer.settle({ ...EMPTY_GITHUB, enabled: true, connection: { status: 'connected', scopes: [], expiresAt: null } });
    await checking;
  });
  expect(row.textContent).toContain(t('github.manage'));
  expect(row.textContent).not.toContain(t('github.connect'));
});

test('Settings offers a working Try again action after the first check fails', async () => {
  const commands: GithubImportCommand[] = [];
  await mount({ githubImport: async (command) => {
    commands.push(command);
    return { ...EMPTY_GITHUB, enabled: true, connection: { status: 'connected', scopes: [], expiresAt: null } };
  } });
  await act(async () => {
    useGithubImport.setState({ state: { ...EMPTY_GITHUB, enabled: true, connection: { status: 'unavailable', reason: 'provider_unavailable' } } });
    root!.render(<GithubSettings />);
  });
  const row = document.querySelector('[data-testid="github-settings"]')!;
  expect(row.textContent).toContain(t('github.unavailable'));
  const retry = row.querySelector<HTMLButtonElement>('button')!;
  expect(retry.textContent).toBe(t('github.tryAgain'));
  expect(retry.disabled).toBe(false);
  await act(async () => { retry.click(); });
  expect(commands.some((command) => command.kind === 'status')).toBe(true);
  expect(row.textContent).toContain(t('github.manage'));
});

for (const entryPoint of ['projects', 'settings'] as const) test(`${entryPoint} dialog retries an unavailable first check`, async () => {
  const commands: GithubImportCommand[] = [];
  await mount({ githubImport: async (command) => {
    commands.push(command);
    return { ...EMPTY_GITHUB, enabled: true, connection: { status: 'connected', scopes: [], expiresAt: null } };
  } });
  await act(async () => {
    useGithubImport.setState({ state: { ...EMPTY_GITHUB, enabled: true, connection: { status: 'unavailable', reason: 'provider_unavailable' } } });
    root!.render(<GithubImportFlow entryPoint={entryPoint} onClose={() => {}} onOpen={() => {}} />);
  });
  const retry = [...container!.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === t('github.tryAgain'))!;
  expect(retry.disabled).toBe(false);
  await act(async () => { retry.click(); });
  expect(commands.some((command) => command.kind === 'status')).toBe(true);
  expect(container!.textContent).not.toContain(t('github.unavailable'));
});

test('Back closes the modal without reopening the choices and ignores preparation that finishes later', async () => {
  const beginning = deferred<GithubImportState>();
  await mount({ githubImport: (command: GithubImportCommand) => command.kind === 'begin' ? beginning.promise : Promise.resolve(disconnected) });
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="codebase-from-github"]')!.click(); });
  expect(flow()).not.toBeNull();
  await act(async () => { dialog()!.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.click(); });
  expect(flow()).toBeNull();
  expect(document.querySelector<HTMLButtonElement>('[data-testid="add-codebase"]')!.getAttribute('aria-expanded')).toBe('false');
  await act(async () => { beginning.settle(disconnected); });
  expect(flow()).toBeNull();
});

test('preparation from a closed dialog cannot focus the reopened dialog before its own preparation ends', async () => {
  const firstBegin = deferred<GithubImportState>();
  const secondBegin = deferred<GithubImportState>();
  const secondStatus = deferred<GithubImportState>();
  let begins = 0;
  let statuses = 0;
  await mount({ githubImport: (command: GithubImportCommand) => {
    if (command.kind === 'begin') return ++begins === 1 ? firstBegin.promise : secondBegin.promise;
    if (command.kind === 'status' && ++statuses === 2) return secondStatus.promise;
    return Promise.resolve(disconnected);
  } });
  const choose = (): void => document.querySelector<HTMLButtonElement>('[data-testid="codebase-from-github"]')!.click();
  await act(async () => { choose(); });
  await act(async () => { dialog()!.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.click(); });
  expect(flow()).toBeNull();
  await act(async () => { choose(); });
  const trigger = document.querySelector<HTMLButtonElement>('[data-testid="add-codebase"]')!;
  await act(async () => { firstBegin.settle(disconnected); });
  expect(begins).toBe(2);
  trigger.focus();
  await act(async () => { secondBegin.settle(disconnected); });
  expect(statuses).toBe(2);
  expect(flow()).not.toBeNull();
  expect(document.activeElement).toBe(trigger);
  await act(async () => { secondStatus.settle(disconnected); });
  expect(document.activeElement).toBe(dialog()!.querySelector('[data-testid="github-import-connect"] button'));
});

test('Escape leaves the flow outright instead of returning to the choices', async () => {
  await mount({ githubImport: () => Promise.resolve(disconnected) });
  const trigger = document.querySelector<HTMLButtonElement>('[data-testid="add-codebase"]');
  await act(async () => { trigger!.click(); });
  expect(trigger!.getAttribute('aria-expanded')).toBe('true');
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="codebase-from-github"]')!.click(); });
  expect(flow()).not.toBeNull();
  await act(async () => { dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  expect(flow()).toBeNull();
  /* `usePopover` keeps its panel mounted after `hide()`, so the trigger's own state is what says it is closed. */
  expect(trigger!.getAttribute('aria-expanded')).toBe('false');
});

test('a host that cannot open a cloned Workspace is not offered the repository choice', async () => {
  await mount({ githubImport: () => Promise.resolve(disconnected) }, false);
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="add-codebase"]')!.click(); });
  expect(document.querySelector('[data-testid="codebase-from-folder"]')).not.toBeNull();
  expect(document.querySelector('[data-testid="codebase-from-github"]')).toBeNull();
});

test('search receives focus when repositories arrive in an open flow without stealing it on refresh', async () => {
  const repository = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository] };
  await mount({ githubImport: () => Promise.resolve(disconnected) });
  await act(async () => {
    useGithubImport.setState({ state: disconnected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  expect(document.querySelector('[data-testid="github-search"]')).toBeNull();
  await act(async () => { useGithubImport.setState({ state: connected }); });
  expect(document.activeElement).toBe(document.querySelector('[data-testid="github-search"]'));
  const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
  await act(async () => { list.focus(); });
  await act(async () => { useGithubImport.setState({ state: { ...connected, repositories: [{ ...repository }] } }); });
  expect(document.activeElement).toBe(list);
});

test('background checks leave every picker control unchanged and selection is immediate without disabling its row', async () => {
  const repository = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository, { ...repository, id: 2, fullName: 'team/components' }], repositoryId: 2, branches: ['main', 'design'], destination: '/clones' };
  const answer = deferred<GithubImportState>();
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command) => { calls.push(command); return answer.promise; } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const before = flow()!.innerHTML;
  let check!: Promise<GithubImportState>;
  await act(async () => { check = githubCommand({ kind: 'status' }); });
  expect(flow()!.innerHTML).toBe(before);
  await act(async () => { answer.settle(connected); await check; });
  expect(flow()!.innerHTML).toBe(before);
  const selection = deferred<GithubImportState>();
  installBridge({ githubImport: (command) => { calls.push(command); return selection.promise; } });
  const row = document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!;
  await act(async () => { row.click(); row.click(); });
  expect(row.getAttribute('aria-disabled')).not.toBe('true');
  expect(row.getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!.disabled).toBe(false);
  expect(document.querySelector('[data-testid="github-repo-2"]')!.getAttribute('aria-disabled')).not.toBe('true');
  expect(document.querySelector<HTMLInputElement>('[data-testid="github-search"]')!.disabled).toBe(false);
  expect(calls.filter((command) => command.kind === 'select')).toHaveLength(1);
  await act(async () => { selection.settle({ ...connected, repositoryId: 1, branches: ['main'], destination: '/clones' }); });
  expect(row.getAttribute('aria-disabled')).not.toBe('true');
});

test('a submitted clone immediately shows progress and locks navigation and duplicates', async () => {
  const repository = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository], repositoryId: 1, branches: ['main', 'design'], destination: '/clones' };
  const answer = deferred<GithubImportState>();
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command) => { calls.push(command); return answer.promise; } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const clone = document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!;
  await act(async () => { clone.click(); clone.click(); });
  expect(clone.disabled).toBe(true);
  expect(document.querySelector('[data-testid="github-repositories"]')).toBeNull();
  expect(document.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.disabled).toBe(true);
  expect(document.querySelector('[data-testid="github-cancel"]')).not.toBeNull();
  expect(calls).toEqual([{ kind: 'clone', repositoryId: 1, branch: 'main', entryPoint: 'projects' }]);
  await act(async () => { answer.settle(connected); });
});

test('pointerdown selection queues one default-branch clone before selection IPC resolves', async () => {
  const repository = { id: 1, fullName: 'team/site', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const replacement = { ...repository, id: 2, fullName: 'team/components', defaultBranch: 'release' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository, replacement] };
  const selected: GithubImportState = { ...connected, repositoryId: repository.id, branches: ['design'], destination: '/clones' };
  const selection = deferred<GithubImportState>();
  const cloning = deferred<GithubImportState>();
  const calls: GithubImportCommand[] = [];
  let closed = false;
  await mount({ githubImport: (command) => { calls.push(command); return command.kind === 'select' ? selection.promise : cloning.promise; } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => { closed = true; }} onOpen={() => {}} />);
  });
  const row = document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!;
  await act(async () => { row.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
  expect(row.getAttribute('aria-selected')).toBe('true');
  const clone = document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!;
  const back = document.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!;
  expect(clone.disabled).toBe(false);
  expect(useGithubImport.getState().state.destination).toBeUndefined();
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
  await act(async () => { clone.click(); clone.click(); });
  expect(clone.disabled).toBe(true);
  expect(back.disabled).toBe(true);
  expect(document.querySelector('[data-testid="github-cancel"]')).not.toBeNull();
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
  const pendingCommands: GithubImportCommand[] = [{ kind: 'select', repositoryId: 1 }, { kind: 'clone', repositoryId: 1, branch: 'design', entryPoint: 'projects' }];
  expect(useGithubImport.getState().pendingCommands).toEqual(pendingCommands);
  await act(async () => {
    back.click();
    await githubCommand({ kind: 'select', repositoryId: replacement.id });
  });
  expect(closed).toBe(false);
  expect(useGithubImport.getState().state.repositoryId).toBe(repository.id);
  expect(useGithubImport.getState().pendingCommands).toEqual(pendingCommands);
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
  await act(async () => { selection.settle(selected); });
  const expectedCalls: GithubImportCommand[] = [{ kind: 'select', repositoryId: 1 }, { kind: 'clone', repositoryId: 1, branch: 'design', entryPoint: 'projects' }];
  expect(calls).toEqual(expectedCalls);
  expect(useGithubImport.getState().state.destination).toBe('/clones');
  expect(clone.disabled).toBe(true);
  expect(back.disabled).toBe(true);
  await act(async () => { cloning.settle({ ...selected, phase: 'cloning' }); });
  expect(calls).toEqual(expectedCalls);
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().state.repositoryId).toBe(repository.id);
  expect(document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!.disabled).toBe(true);
  expect(back.disabled).toBe(true);
});

test('a queued clone never reaches the bridge when replacement selection IPC rejects', async () => {
  const repository = { id: 1, fullName: 'team/site', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const previous = { ...repository, id: 2, fullName: 'team/components', defaultBranch: 'release' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null },
    repositories: [repository, previous], repositoryId: previous.id, branches: ['release'], destination: '/previous/clones' };
  const selection = deferred<GithubImportState>();
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command) => { calls.push(command); return command.kind === 'select' ? selection.promise : Promise.resolve(connected); } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  await act(async () => {
    document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
  });
  const cloneCommand: GithubImportCommand = { kind: 'clone', repositoryId: repository.id, branch: 'design', entryPoint: 'projects' };
  let queuedClone!: Promise<GithubImportState>;
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!.click();
    queuedClone = githubCommand(cloneCommand);
  });
  expect(calls).toEqual([{ kind: 'select', repositoryId: repository.id }]);
  expect(document.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.disabled).toBe(true);
  expect(useGithubImport.getState().pendingCommands).toEqual([{ kind: 'select', repositoryId: repository.id }, cloneCommand]);
  await act(async () => {
    selection.refuse(new Error('Selection IPC failed'));
    await queuedClone;
  });
  expect(calls).toEqual([{ kind: 'select', repositoryId: repository.id }]);
  expect(useGithubImport.getState().state).toMatchObject({ repositoryId: repository.id, phase: 'failed', failure: 'network', branches: [] });
  expect(useGithubImport.getState().pendingCommands).toEqual([]);
  expect(useGithubImport.getState().progressCommands).toEqual([]);
  expect(document.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.disabled).toBe(false);
  expect(document.querySelector('[data-testid="github-cancel"]')).toBeNull();
});

test('the list is one Tab stop, arrows walk it and Enter or Space chooses the row they reached', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
  const components = { ...website, id: 2, fullName: 'team/components' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website, components] };
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command: GithubImportCommand) => { calls.push(command); return Promise.resolve({ ...connected, repositoryId: 2 }); } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
  expect(list.tabIndex).toBe(0);
  expect([...list.querySelectorAll('button')].every((row) => row.tabIndex === -1)).toBe(true);
  expect(list.getAttribute('aria-activedescendant')).toBe('github-repo-option-1');
  const press = async (key: string): Promise<void> => { await act(async () => { list.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); };
  await press('ArrowDown');
  expect(list.getAttribute('aria-activedescendant')).toBe('github-repo-option-2');
  await press('ArrowDown');
  expect(list.getAttribute('aria-activedescendant')).toBe('github-repo-option-2');
  await press('Enter');
  expect(calls).toEqual([{ kind: 'select', repositoryId: 2 }]);
  await press('ArrowUp');
  await press(' ');
  expect(calls).toEqual([{ kind: 'select', repositoryId: 2 }, { kind: 'select', repositoryId: 1 }]);
  /* Refresh repositories and the GitHub door sit after the list, so they are one more Tab away, never twenty. */
  const actions = document.querySelector<HTMLElement>('[data-testid="github-list-actions"]')!;
  expect(list.contains(actions)).toBe(false);
  expect(actions.querySelectorAll('button')).toHaveLength(2);
});

test('Escape and the backdrop cannot leave a running clone; Cancel clone is the way out', async () => {
  const repository = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository], repositoryId: 1, branches: ['main'], destination: '/clones' };
  const cloning = deferred<GithubImportState>();
  await mount({ githubImport: (command: GithubImportCommand) => command.kind === 'clone' ? cloning.promise : Promise.resolve(connected) });
  await act(async () => { useGithubImport.setState({ state: connected }); });
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="add-codebase"]')!.click(); });
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="codebase-from-github"]')!.click(); });
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!.click(); });
  expect(document.querySelector('[data-testid="github-cancel"]')).not.toBeNull();
  await act(async () => { dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  await act(async () => { dialog()!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  expect(flow()).not.toBeNull();
  expect(document.querySelector('[data-testid="github-cancel"]')).not.toBeNull();
  await act(async () => { cloning.settle({ ...connected, phase: 'failed', failure: 'cancelled' }); });
  await act(async () => { dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  expect(flow()).toBeNull();
  expect(document.activeElement).toBe(document.querySelector('[data-testid="add-codebase"]'));
});

test('late duplicate Back returns to the repository list without closing the flow', async () => {
  const repository = { id: 1, fullName: 'team/site', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository] };
  let closed = false;
  await mount({ githubImport: async () => connected });
  await act(async () => {
    useGithubImport.setState({ state: { ...connected, repositoryId: 1, existingPath: '/existing' } });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => { closed = true; }} onOpen={() => {}} />);
  });
  expect(document.querySelector('[data-testid="github-existing"]')?.textContent).toContain('team/site');
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.click(); });
  expect(closed).toBe(false);
  expect(document.querySelector('[data-testid="github-search"]')).not.toBeNull();
});

test('Use a folder instead acts immediately while GitHub leave is pending', async () => {
  const leaving = deferred<GithubImportState>();
  let picked = false;
  await mount({ githubImport: () => leaving.promise });
  await act(async () => {
    useGithubImport.setState({ state: disconnected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onFolder={() => { picked = true; }} onOpen={() => {}} />);
  });
  await act(async () => { Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Use a folder instead'))!.click(); });
  expect(picked).toBe(true);
  await act(async () => { leaving.settle(disconnected); });
});

test('an unchanged repository refresh retains row DOM, avatar and scroll position', async () => {
  const repository = { id: 1, fullName: 'team/site', private: false, defaultBranch: 'main', archived: true, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository], repositoryId: 1 };
  await mount({ githubImport: async () => structuredClone(connected) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const list = document.querySelector<HTMLElement>('[data-testid="github-list"]')!;
  const row = document.querySelector('[data-testid="github-repo-1"]');
  const avatar = row!.querySelector('img');
  list.scrollTop = 120;
  await act(async () => { await githubCommand({ kind: 'repositories' }); });
  expect(document.querySelector('[data-testid="github-repo-1"]')).toBe(row);
  expect(row!.querySelector('img')).toBe(avatar);
  expect(list.scrollTop).toBe(120);
  expect(useGithubImport.getState().state.repositories).toBe(connected.repositories);
});

test('a repository the search hides cannot be cloned until it is listed again', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const components = { ...website, id: 2, fullName: 'team/components' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website, components] };
  const selection = deferred<GithubImportState>();
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command) => { calls.push(command); return selection.promise; } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  await act(async () => { document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
  expect(action('clone')!.disabled).toBe(false);
  await act(async () => { typeSearch('components'); });
  expect(document.querySelector('[data-testid="github-repo-1"]')).toBeNull();
  expect(document.querySelector('[data-testid="github-repo-2"]')).not.toBeNull();
  expect(document.querySelector('[aria-selected="true"]')).toBeNull();
  expect(action('clone')!.disabled).toBe(true);
  await act(async () => { action('clone')!.click(); });
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
  expect(useGithubImport.getState().state.repositoryId).toBe(1);
  await act(async () => { clearSearch(); });
  expect(document.querySelector('[data-testid="github-repo-1"]')!.getAttribute('aria-selected')).toBe('true');
  expect(action('clone')!.disabled).toBe(false);
  await act(async () => { selection.settle({ ...connected, repositoryId: 1, branches: ['design'], destination: '/clones' }); });
});

test('a search that matches nothing leaves no repository to clone', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website], repositoryId: 1, branches: ['design'], destination: '/clones' };
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command) => { calls.push(command); return Promise.resolve(connected); } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  expect(action('clone')!.disabled).toBe(false);
  await act(async () => { typeSearch('missing-owner/missing-repository'); });
  expect(document.querySelector('[data-testid="github-list"]')!.textContent).toContain(t('github.noMatch'));
  expect(action('clone')!.disabled).toBe(true);
  await act(async () => { action('clone')!.click(); });
  expect(calls).toEqual([]);
});

test('a local copy discovered during a search names the repository instead of acting unseen', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const components = { ...website, id: 2, fullName: 'team/components' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website, components] };
  const selection = deferred<GithubImportState>();
  await mount({ githubImport: (command) => command.kind === 'select' ? selection.promise : Promise.resolve(connected) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  await act(async () => { document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
  await act(async () => { typeSearch('components'); });
  expect(action('clone')!.disabled).toBe(true);
  await act(async () => { selection.settle({ ...connected, repositoryId: 1, branches: ['design'], existingPath: '/Workspaces/website' }); });
  expect(document.querySelector('[data-testid="github-existing"]')?.textContent).toContain('team/website');
  expect(action('open')!.disabled).toBe(false);
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="github-back"]')!.click(); });
  expect(search()).not.toBeNull();
});

test('losing the repository list drops a search typed against it', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const components = { ...website, id: 2, fullName: 'team/components' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website, components] };
  await mount({ githubImport: () => Promise.resolve(connected) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  await act(async () => { typeSearch('components'); });
  expect(document.querySelector('[data-testid="github-repo-1"]')).toBeNull();
  await act(async () => { useGithubImport.setState({ state: disconnected }); });
  await act(async () => { useGithubImport.setState({ state: connected }); });
  expect(search().value).toBe('');
  expect(document.querySelector('[data-testid="github-repo-1"]')).not.toBeNull();
});

test('a local repository the search hides offers no Open project either', async () => {
  const local = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true, onThisComputer: true };
  const components = { ...local, id: 2, fullName: 'team/components', onThisComputer: false };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [local, components], repositoryId: 1, branches: ['design'] };
  const calls: GithubImportCommand[] = [];
  let opened = false;
  await mount({ githubImport: (command) => { calls.push(command); return Promise.resolve(connected); } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => { opened = true; }} />);
  });
  expect(action('open')!.disabled).toBe(false);
  await act(async () => { typeSearch('components'); });
  expect(action('open')).toBeNull();
  expect(action('clone')!.disabled).toBe(true);
  await act(async () => { action('clone')!.click(); });
  expect(calls).toEqual([]);
  expect(opened).toBe(false);
  await act(async () => { clearSearch(); });
  expect(action('open')!.disabled).toBe(false);
});

/* The rendered height is asserted in `tests/e2e/github-import-dialog.e2e.ts`, which has layout;
   happy-dom resolves no StyleX class, so this holds only the wiring that gets it there. */
test('Add codebase is wired to the left column rows\u2019 own floor and sets no height of its own', async () => {
  await mount({ githubImport: () => Promise.resolve(disconnected) });
  await act(async () => {
    root!.render(<>
      <AddCodebase entryPoint="projects" onFolder={() => {}} onOpen={() => {}} isRowSized />
      <SidebarRow icon={FolderIcon} label="New Draft" onSelect={() => {}} />
    </>);
  });
  const button = document.querySelector<HTMLElement>('[data-testid="add-codebase"]')!;
  const row = document.querySelector<HTMLElement>('[data-testid="sidebar-row"] button')!;
  expect(getComputedStyle(button).minHeight).toBe(`${String(SIDEBAR_ROW_HEIGHT)}px`);
  expect(getComputedStyle(row).minHeight).toBe(getComputedStyle(button).minHeight);
  expect(getComputedStyle(button).height).toBe('auto');
  /* Without this the control's own padding lands it at 36px and the floor never decides. */
  expect(button.style.paddingBlock).toBe('0');
});

test('choosing a repository changes nothing outside the list', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const components = { ...website, id: 2, fullName: 'team/components' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website, components] };
  await mount({ githubImport: () => Promise.resolve({ ...connected, repositoryId: 1 }) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  /* The list's measured size before and after is asserted in `tests/e2e/github-import-dialog.e2e.ts`;
     this holds the structure around it, which is what a selection could disturb. */
  const frame = (): string => {
    const body = document.querySelector('[data-testid="github-import-body"]')!.cloneNode(true) as HTMLElement;
    body.querySelector('[data-testid="github-repositories"]')!.replaceChildren();
    body.querySelector('[data-testid="github-list"]')!.removeAttribute('style');
    return body.innerHTML;
  };
  const before = frame();
  await act(async () => { document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
  expect(document.querySelector('[data-testid="github-repo-1"]')!.getAttribute('aria-selected')).toBe('true');
  expect(frame()).toBe(before);
  expect(document.querySelector('[data-testid="github-list"] [data-testid="github-list-actions"]')).not.toBeNull();
});

test('a refresh that adds and drops repositories keeps the same list node, and its scroll with it', async () => {
  const website = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const components = { ...website, id: 2, fullName: 'team/components' };
  const archive = { ...website, id: 3, fullName: 'team/archive' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [website, components] };
  const refreshed: GithubImportState = { ...connected, repositories: [website, archive] };
  await mount({ githubImport: async () => structuredClone(refreshed) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const list = document.querySelector<HTMLElement>('[data-testid="github-list"]')!;
  list.scrollTop = 96;
  await act(async () => { await githubCommand({ kind: 'repositories' }); });
  expect(document.querySelector('[data-testid="github-list"]')).toBe(list);
  expect(list.scrollTop).toBe(96);
  expect(document.querySelector('[data-testid="github-repo-3"]')).not.toBeNull();
  expect(document.querySelector('[data-testid="github-repo-2"]')).toBeNull();
});

test('a selected row turns its name and its label white', async () => {
  const local = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true, onThisComputer: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [local] };
  await mount({ githubImport: (command) => Promise.resolve(command.kind === 'select' ? { ...connected, repositoryId: command.repositoryId } : connected) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const row = (): HTMLElement => document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!;
  const label = (): HTMLElement => row().querySelector<HTMLElement>('[data-testid="github-repo-label"]')!;
  expect(row().style.color).toBe('#e6e6e6');
  /* The label rests behind the name, as the handoff's `.meta` does, and only selection brings them together. */
  expect(label().style.color).toBe('#8a8a8a');
  await act(async () => { row().dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
  expect(row().style.color).toBe('#fff');
  expect(label().style.color).toBe('#fff');
});

test('one explanation is open at a time and the list scrolls it into view', async () => {
  const first = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: true, canPull: true, canPush: true };
  const second = { ...first, id: 2, fullName: 'team/components' };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [first, second] };
  const scrolled: HTMLElement[] = [];
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = function scrollIntoView(this: HTMLElement, options?: boolean | ScrollIntoViewOptions): void {
    scrolled.push(this);
    expect(options).toEqual({ block: 'nearest' });
  };
  try {
    await mount({ githubImport: (command) => Promise.resolve(command.kind === 'select' ? { ...connected, repositoryId: command.repositoryId } : connected) });
    await act(async () => {
      useGithubImport.setState({ state: connected });
      root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
    });
    await act(async () => { document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
    expect(document.querySelectorAll('[data-testid="github-repo-explanation"]')).toHaveLength(1);
    expect(scrolled.at(-1)).toBe(document.querySelector<HTMLElement>('[data-testid="github-repo-block-1"]')!);
    await act(async () => { document.querySelector<HTMLElement>('[data-testid="github-repo-2"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
    expect(document.querySelectorAll('[data-testid="github-repo-explanation"]')).toHaveLength(1);
    expect(document.querySelector('[data-testid="github-repo-block-2"]')!.contains(document.querySelector('[data-testid="github-repo-explanation"]'))).toBe(true);
    expect(scrolled.at(-1)).toBe(document.querySelector<HTMLElement>('[data-testid="github-repo-block-2"]')!);
  } finally {
    HTMLElement.prototype.scrollIntoView = original;
  }
});

test('the already-local screen names the repository with its avatar and the one sentence', async () => {
  const repository = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository], repositoryId: 1, existingPath: '/Workspaces/website' };
  await mount({ githubImport: () => Promise.resolve(connected) });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  const screen = document.querySelector<HTMLElement>('[data-testid="github-existing"]')!;
  expect(screen.querySelector('img')?.getAttribute('src')).toBe('https://avatars.githubusercontent.com/team?s=40');
  expect(screen.textContent).toContain('team/website');
  expect(screen.textContent).toContain(t('github.existing', { repository: 'team/website' }));
  expect(screen.textContent).toContain('/Workspaces/website');
});

test('a repository an organization blocks opens its reason and never clones', async () => {
  const blocked = { id: 1, fullName: 'team/website', private: false, defaultBranch: 'design', archived: false, canPull: true, canPush: true, access: 'sso' as const };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [blocked] };
  const calls: GithubImportCommand[] = [];
  await mount({ githubImport: (command) => { calls.push(command); return Promise.resolve({ ...connected, repositoryId: 1 }); } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => {}} />);
  });
  await act(async () => { document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true })); });
  expect(document.querySelector('[data-testid="github-repo-explanation"]')?.textContent).toContain(t('github.blocked.sso.action'));
  expect(action('clone')!.disabled).toBe(true);
  await act(async () => { action('clone')!.click(); });
  expect(calls).toEqual([{ kind: 'select', repositoryId: 1 }]);
});

test('an existing-project result cannot open after its import flow is dismissed', async () => {
  const result = deferred<GithubImportState>();
  const calls: GithubImportCommand[] = [];
  const repository = { id: 1, fullName: 'team/site', private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true, onThisComputer: true };
  const connected: GithubImportState = { ...disconnected, connection: { status: 'connected', scopes: [], expiresAt: null }, repositories: [repository], repositoryId: 1 };
  let opened = false;
  await mount({ githubImport: (command) => { calls.push(command); return result.promise; } });
  await act(async () => {
    useGithubImport.setState({ state: connected });
    root!.render(<GithubImportFlow entryPoint="projects" onClose={() => {}} onOpen={() => { opened = true; }} />);
  });
  await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="github-open"]')!.click(); });
  expect(calls).toEqual([{ kind: 'open', repositoryId: repository.id }]);
  await act(async () => { root!.render(<div />); });
  await act(async () => { result.settle({ ...connected, existingPath: '/existing' }); });
  expect(opened).toBe(false);
  expect(calls).toEqual([{ kind: 'open', repositoryId: repository.id }]);
});

/* The card's press target is the button `ClickableCard` hides inside it, which is also what a screen reader reads. */
const cardPress = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('[data-testid="add-codebase"] button')!;

test('on the onboarding step the door is a card, and its own press target opens the same menu', async () => {
  await mount({ githubImport: () => Promise.resolve(disconnected) });
  await act(async () => {
    root!.render(<AddCodebase entryPoint="onboarding" presentation="card" onFolder={() => {}} onOpen={() => {}} />);
  });
  const card = document.querySelector<HTMLElement>('[data-testid="add-codebase"]')!;
  expect(card.tagName).toBe('DIV');
  expect(card.getAttribute('data-state')).toBe('default');
  expect(cardPress().getAttribute('aria-label')).toBe(t('codebase.add'));
  expect(cardPress().getAttribute('aria-expanded')).toBe('false');
  await act(async () => { cardPress().click(); });
  expect(cardPress().getAttribute('aria-expanded')).toBe('true');
  expect(cardPress().getAttribute('aria-controls')).toBe(document.querySelector('[data-testid="add-codebase-popover"]')!.closest('[id]')!.id);
  expect(document.querySelector('[data-testid="codebase-from-folder"]')).not.toBeNull();
  expect(document.querySelector('[data-testid="codebase-from-github"]')).not.toBeNull();
});

test('while a blank project is being created the card is there, out of reach', async () => {
  await mount({ githubImport: () => Promise.resolve(disconnected) });
  const card = (isBusy: boolean): React.JSX.Element =>
    <AddCodebase entryPoint="onboarding" presentation="card" isBusy={isBusy} onFolder={() => {}} onOpen={() => {}} />;
  await act(async () => { root!.render(card(false)); });
  expect(cardPress().disabled).toBe(false);
  expect(cardPress().getAttribute('aria-haspopup')).toBe('dialog');
  await act(async () => { root!.render(card(true)); });
  expect(document.querySelector('[data-testid="add-codebase"]')).not.toBeNull();
  expect(cardPress().disabled).toBe(true);
  /* The press target survives the change, so the menu it no longer has must be taken off it. */
  expect(cardPress().getAttribute('aria-haspopup')).toBeNull();
  expect(cardPress().getAttribute('aria-expanded')).toBeNull();
});

test('the Projects screen keeps the button the library gives it', async () => {
  await mount({ githubImport: () => Promise.resolve(disconnected) });
  await act(async () => {
    root!.render(<AddCodebase entryPoint="projects" isFullWidth={false} onFolder={() => {}} onOpen={() => {}} />);
  });
  const trigger = document.querySelector<HTMLElement>('[data-testid="add-codebase"]')!;
  expect(trigger.tagName).toBe('BUTTON');
  expect(trigger.getAttribute('data-state')).toBeNull();
  expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
});
