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

function failedCopy(cause: CopyFailure['cause']): ProjectCreateState {
  return { kind: 'failed', sourceRepoName: 'acme-storefront', phase: 'copying', detail: GIT_OUTPUT, copyFailure: { step: 'git_commit', cause } };
}

async function mount(state: ProjectCreateState): Promise<void> {
  const setup = setupNarration(narrationFor(state, { hasLiveServer: false }), {
    onRetry: () => {},
    onChooseFolder: () => { void chooseProjectSource('setup-failure'); },
    onDismiss: () => {},
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<SetupTurn {...setup!} />);
  });
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
  const toggle = find('chat-setup-detail-toggle')!;
  expect(container!.textContent).not.toContain(GIT_OUTPUT);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(toggle.textContent).toContain(en['project.create.details.show']);

  await act(async () => { toggle.click(); });
  expect(container!.querySelector('[data-testid="chat-setup-detail"]')?.textContent).toBe(GIT_OUTPUT);
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
