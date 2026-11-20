import { takeComplaints } from '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { CopyFailure, PickFolderRequest, PickFolderResult, ProjectCreateState } from '@studio/events';
import { SetupTurn } from '@studio/chat-ui';
import { en } from '@studio/i18n/strings';
import { installBridge } from '../testing/bridge.js';
import { narrationFor } from '../create/projectCreate.js';
import { chooseProjectSource } from '../workspace/sourceFolder.js';
import { setupNarration } from './panelProps.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const originalStudio = window.studio;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  window.studio = originalStudio;
  expect(takeComplaints()).toEqual([]);
});

const GIT_OUTPUT = 'nothing added to commit but untracked files present';

function failedCopy(cause: CopyFailure['cause'], detail = GIT_OUTPUT): ProjectCreateState {
  return { kind: 'failed', sourceRepoName: 'acme-storefront', phase: 'copying', detail, copyFailure: { step: 'git_commit', cause } };
}

function row(state: ProjectCreateState): React.JSX.Element {
  const setup = setupNarration(narrationFor(state, { hasLiveServer: false }), {
    onRetry: () => {},
    onChooseFolder: () => { void chooseProjectSource('setup-failure'); },
    onDismiss: () => {},
  });
  return <SetupTurn {...setup!} />;
}

async function mount(state: ProjectCreateState): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(row(state));
  });
}

async function replace(state: ProjectCreateState): Promise<void> {
  await act(async () => { root!.render(row(state)); });
}

const find = (testId: string): HTMLButtonElement | null => container!.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);

it('offers choosing the folder again, and no Retry, where repeating the copy cannot succeed', async () => {
  const picks: PickFolderRequest[] = [];
  const created: unknown[] = [];
  installBridge({
    pickFolder: async (request): Promise<PickFolderResult> => { picks.push(request); return { canceled: false, folder: { path: '/src/acme-storefront', name: 'acme-storefront' } }; },
    tabsCreateProject: (request) => { created.push(request); },
  });
  await mount(failedCopy('ignored_files'));

  expect(container!.textContent).toContain(en['project.create.copy.ignored_files']);
  expect(find('chat-setup-retry')).toBeNull();
  const choose = find('chat-setup-choose-folder');
  expect(choose?.textContent).toContain(en['project.create.chooseFolder']);

  await act(async () => { choose!.click(); });
  expect(picks).toHaveLength(1);
  expect(created).toEqual([{ sourcePath: '/src/acme-storefront', entryPoint: 'setup-failure' }]);
});

it('keeps Retry, and no folder picker, for a copy that timed out', async () => {
  await mount(failedCopy('git_timed_out'));
  expect(container!.textContent).toContain(en['project.create.copy.git_timed_out']);
  expect(find('chat-setup-retry')).not.toBeNull();
  expect(find('chat-setup-choose-folder')).toBeNull();
});

it('keeps the failing command’s own words out of the guidance until they are asked for', async () => {
  await mount(failedCopy('ignored_files'));
  const toggle = find('chat-setup-output-toggle')!;
  expect(container!.textContent).not.toContain(GIT_OUTPUT);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(toggle.textContent).toContain(en['project.create.details.show']);

  await act(async () => { toggle.click(); });
  expect(container!.querySelector('[data-testid="chat-setup-output"]')?.textContent).toBe(GIT_OUTPUT);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(toggle.textContent).toContain(en['project.create.details.hide']);

  await act(async () => { toggle.click(); });
  expect(container!.textContent).not.toContain(GIT_OUTPUT);
});

it('leaves the picker closed when the person cancels it', async () => {
  const created: unknown[] = [];
  installBridge({
    pickFolder: async (): Promise<PickFolderResult> => ({ canceled: true }),
    tabsCreateProject: (request) => { created.push(request); },
  });
  await mount(failedCopy('permission_denied'));
  await act(async () => { find('chat-setup-choose-folder')!.click(); });
  expect(created).toEqual([]);
});

it('holds the next failure’s words back, however fast it replaced the last one', async () => {
  await mount(failedCopy('ignored_files'));
  await act(async () => { find('chat-setup-output-toggle')!.click(); });
  expect(container!.textContent).toContain(GIT_OUTPUT);

  await replace(failedCopy('permission_denied', 'EACCES: permission denied'));
  expect(container!.textContent).not.toContain('EACCES: permission denied');
  expect(find('chat-setup-output-toggle')!.getAttribute('aria-expanded')).toBe('false');
});

it('keeps a catalogued detail beside the guidance, where it is the instruction', async () => {
  const managerMissing = en['project.install.managerMissing'].replace('{manager}', 'bun');
  await mount({ kind: 'failed', sourceRepoName: 'acme-storefront', phase: 'installing', detail: managerMissing });
  expect(container!.textContent).toContain(managerMissing);
  expect(find('chat-setup-output-toggle')).toBeNull();
  expect(find('chat-setup-retry')).not.toBeNull();
});

it('draws no details control for a failure that carries no words', async () => {
  await mount(failedCopy('copy_in_progress', ''));
  expect(container!.textContent).toContain(en['project.create.copy.copy_in_progress']);
  expect(find('chat-setup-output-toggle')).toBeNull();
  expect(find('chat-setup-choose-folder')).not.toBeNull();
});
