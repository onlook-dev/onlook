import { expect, test } from 'bun:test';
import '../testing/dom.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { GithubImportView, GithubSettingsView } from './GithubImport.js';
import { EMPTY_GITHUB } from './store.js';

const noop = (): void => {};
const props = { onCommand: noop, onClose: noop, onOpen: noop, entryPoint: 'projects' as const };
const repository = { id: 1, fullName: 'team/repo', private: true, defaultBranch: 'main', canPull: true, canPush: true, archived: false };
const CONNECTED = { ...EMPTY_GITHUB, connection: { status: 'connected' as const, scopes: [], expiresAt: null } };
const DISCONNECTED = { ...EMPTY_GITHUB, connection: { status: 'disconnected' as const } };

test('the initial import and Settings dialogs show Checking without Connect GitHub', () => {
  for (const view of [<GithubImportView {...props} state={EMPTY_GITHUB} />, <GithubSettingsView {...props} state={EMPTY_GITHUB} />]) {
    const html = renderToStaticMarkup(view);
    expect(html).toContain('Checking');
    expect(html).not.toContain(t('github.connect'));
  }
});

test('a listed repository lights Clone immediately, before selection IPC or destination checks finish', () => {
  const command = { kind: 'select' as const, repositoryId: 1 };
  const html = renderToStaticMarkup(<GithubImportView {...props} pendingCommands={[command]}
    state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'loading' }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  expect(document.querySelector('[data-testid="github-clone"]')?.hasAttribute('disabled')).toBe(false);
  expect(document.querySelector<HTMLElement>('[data-testid="github-clone"]')?.style.transition).toBe('none');
});

test('the unselected Clone action uses the handoff disabled colors without opacity or motion', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository] }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const clone = document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!;
  expect(clone.disabled).toBe(true);
  expect(clone.style.backgroundColor).toBe('#2a2a2a');
  expect(clone.style.color).toBe('#6a6a6a');
  expect(clone.style.opacity).toBe('1');
  expect(clone.style.transition).toBe('none');
});

test('the picker uses the handoff title and labels archived repositories without blocking clone', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props}
    state={{ ...CONNECTED, repositories: [{ ...repository, archived: true }], repositoryId: 1 }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  expect(html).toContain('Import from GitHub');
  expect(html).toContain('Archived');
  expect(document.querySelector('[data-testid="github-clone"]')?.hasAttribute('disabled')).toBe(false);
});

test('a clone rejected after receiving credentials keeps its repository and offers access review', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props}
    state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'failed', failure: 'access' }} />);
  expect(html).toContain(t('github.error.access'));
  expect(html).toContain(t('github.access'));
  expect(html).toContain('team/repo');
  const document = new DOMParser().parseFromString(html, 'text/html');
  expect(document.querySelector('[data-testid="github-clone"]')?.hasAttribute('disabled')).toBe(false);
});

test('a fresh connection offers one next step without recovery actions', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={DISCONNECTED} onFolder={noop} />);
  expect(html).toContain(t('github.connect'));
  expect(html).toContain(t('github.connect.body'));
  expect(html).toContain(t('github.folder'));
  expect(html).not.toContain(t('github.check'));
  expect(html).not.toContain(t('github.access'));
  expect(html).not.toContain(t('github.waiting.body'));
});

test('connecting replaces Connect GitHub with Check again', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...EMPTY_GITHUB, connectionAttempted: true, connection: { status: 'connecting' } }} />);
  expect(html).toContain(t('github.connecting'));
  expect(html).toContain(t('github.check'));
  expect(html).not.toContain(t('github.connect'));
  expect(html).not.toContain(t('github.access'));
});

test('returning without a connection offers retry and contextual access review', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...DISCONNECTED, connectionAttempted: true }} />);
  expect(html).toContain(t('github.noConnection'));
  expect(html).toContain(t('github.connect'));
  expect(html).toContain(t('github.check'));
  expect(html).toContain(t('github.access'));
  expect(html).not.toContain(t('github.waiting'));
});

test('unavailable explains the problem once and preserves the folder exit', () => {
  for (const connectionAttempted of [false, true]) {
    const html = renderToStaticMarkup(<GithubImportView {...props} onFolder={noop} state={{ ...EMPTY_GITHUB, connectionAttempted, connection: { status: 'unavailable', reason: 'provider_unavailable' } }} />);
    expect(html).toContain(t('github.unavailable'));
    expect(html).toContain(t('github.folder'));
    expect(html).toContain(t('github.tryAgain'));
    expect(html).not.toContain(t('github.connect'));
    expect(html).not.toContain(t('github.access'));
  }
});

test('approval recovery only appears when access is denied', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...EMPTY_GITHUB, connection: { status: 'forbidden' } }} />);
  expect(html).toContain(t('github.approval.body'));
  expect(html).toContain(t('github.access'));
  expect(html).toContain(t('github.waiting'));
  expect(html).not.toContain(t('github.connect'));
  expect(html).not.toContain(t('github.check'));
});

test('waiting shows one explanation and does not ask for acknowledgement again', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...DISCONNECTED, connectionAttempted: true, waitingForApproval: true }} />);
  expect(html).toContain(t('github.waiting.body'));
  expect(html).toContain(t('github.check'));
  expect(html).not.toContain(t('github.waiting'));
  expect(html).not.toContain(t('github.connect'));
});

test('access loss does not repeat a clone failure below connection recovery', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...EMPTY_GITHUB, connection: { status: 'reconnect', reason: 'expired' }, phase: 'failed', failure: 'access' }} />);
  expect(html).toContain(t('github.reconnect'));
  expect(html).not.toContain(t('github.error.access'));
});

test('other connection failures do not look like a fresh connection', () => {
  for (const status of ['not_found', 'invalid_request'] as const) {
    const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...EMPTY_GITHUB, connectionAttempted: true, connection: { status } }} />);
    expect(html).toContain(t('github.connectionFailed'));
    expect(html).toContain(t('github.tryAgain'));
    expect(html).not.toContain(t('github.connect'));
    expect(html).not.toContain(t('github.access'));
  }
});

test('an existing Workspace offers Open Workspace instead of Clone repository', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, existingPath: '/Workspaces/repo' }} />);
  expect(html).toContain(t('github.open'));
  expect(html).not.toContain(t('github.clone'));
});

test('Settings only manages the connection and cannot silently clone a repository', () => {
  const html = renderToStaticMarkup(<GithubSettingsView state={CONNECTED} onCommand={noop} onClose={noop} />);
  expect(html).toContain(t('github.connected'));
  expect(html).not.toContain(t('github.clone'));
  expect(html).not.toContain(t('github.search'));
});

/* Settings is the dialog it was before the picker grew: the library's own chrome, not the modal's (ONL-3182). */
test('the Settings dialog keeps the library chrome and none of the import modal styling', () => {
  for (const state of [CONNECTED, { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true }]) {
    const html = renderToStaticMarkup(<GithubSettingsView state={state} onCommand={noop} onClose={noop} />);
    expect(html).toContain(t('github.name'));
    expect(html).not.toContain('background:#000');
    expect(html).not.toContain('font-size:19px');
    expect(html).not.toContain('min-height:40px');
    expect(html).toContain('data-testid="github-back"');
    expect(html).not.toContain('data-testid="github-clone"');
  }
});

test('the repository list uses flat rows and holds one Clone repository action', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository] }} />);
  expect(html).toContain(t('github.import'));
  expect(html).toContain('github-repo-1');
  expect(html).not.toContain('astryx-card');
  expect(html.match(new RegExp(`>${t('github.clone')}<`, 'g'))).toHaveLength(1);
  expect(html).not.toContain('github-clone-options');
  expect(html.match(new RegExp(`>${t('github.access')}<`, 'g'))).toHaveLength(1);
});

test('the picker keeps only the repository choice instead of waiting on branch controls', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, branches: ['main'], destination: '/clones' }} />);
  expect(html).not.toContain('github-clone-options');
  expect(html).toContain('github-repositories');
});

test('search is outside the only scrolling list and matches the handoff dimensions', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, branches: ['main'], destination: '/clones' }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const list = document.querySelector('[data-testid="github-list"]')!;
  const search = document.querySelector('[data-testid="github-search"]')!;
  expect(list.contains(search)).toBe(false);
  expect(list.getAttribute('style')).toContain('overflow-y:auto');
  expect(document.querySelectorAll('[style*="overflow-y:auto"]')).toHaveLength(1);
  expect(search.getAttribute('style')).toContain('height:36px');
  expect(search.getAttribute('style')).toContain('border-radius:6px');
});

test('a known local repository stays in the list with an immediately enabled Open project action', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [{ ...repository, onThisComputer: true }], repositoryId: 1 }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  expect(document.querySelector('[data-testid="github-open"]')?.hasAttribute('disabled')).toBe(false);
  expect(html).toContain(t('github.onComputer'));
  expect(html).toContain('github-repo-1');
  expect(html).not.toContain('github-existing');
});

test('pending selection leaves both the selected row and Clone enabled', () => {
  const command = { kind: 'select' as const, repositoryId: 1 };
  const html = renderToStaticMarkup(<GithubImportView {...props} pendingCommands={[command]} progressCommands={[command]}
    state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'loading' }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const row = document.querySelector('[data-testid="github-repo-1"]')!;
  expect(row.querySelector('[aria-busy="true"]')).toBeNull();
  expect(row.querySelector('[disabled]')).toBeNull();
  expect(row.getAttribute('aria-selected')).toBe('true');
  expect(document.querySelector('[data-testid="github-clone"]')?.hasAttribute('disabled')).toBe(false);
});

test('credential recovery leaves the repository list and its selection visible', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1,
    phase: 'failed', failure: 'access', connection: { status: 'reconnect', reason: 'expired' } }} />);
  expect(html).toContain('data-testid="github-repo-1"');
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain(t('github.reconnect'));
  expect(html).not.toContain('data-testid="github-import-connect"');
});

test('every action beside the primary one is a secondary button, never a ghost', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} onFolder={noop} state={{ ...CONNECTED, repositories: [repository], connectionAttempted: true }} />);
  expect(html).toContain(t('github.back'));
  expect(html).toContain(t('github.folder'));
  expect(html).not.toContain('data-variant="ghost"');
});

test('clone progress has one cancel action and no premature clone button', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'cloning', progress: 42 }} />);
  expect(html).toContain(t('github.progress', { percent: '42' }));
  expect(html).toContain(t('github.cancel'));
  expect(html).not.toContain('astryx-card');
  expect(html).not.toContain(t('github.search'));
});

test('the progress bar names what it measures, so a screen reader is not read “Cloning…” twice', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'cloning', progress: 42 }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const bar = document.querySelector<HTMLElement>('[role="progressbar"]')!;
  const label = document.getElementById(bar.getAttribute('aria-labelledby') ?? '');
  expect(label?.textContent).toBe(t('github.cloneProgress'));
});

test('one door to GitHub access at a time, wherever the list offers it', () => {
  const once = (html: string): number => (html.match(new RegExp(`>${t('github.access')}<`, 'g')) ?? []).length;
  expect(once(renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository] }} />))).toBe(1);
  expect(once(renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'failed', failure: 'access' }} />))).toBe(1);
  expect(once(renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'failed', failure: 'network' }} />))).toBe(1);
});

test('a clone that is only slow says so without replacing its progress or cancel action', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'cloning', cloneStage: 'slow', progress: 12 }} />);
  expect(html).toContain(t('github.slow'));
  expect(html).toContain(t('github.cancel'));
  expect(html).toContain(t('github.progress', { percent: '12' }));
  const slow = new DOMParser().parseFromString(html, 'text/html').querySelector<HTMLElement>('[data-testid="github-clone-slow"]')!;
  expect(slow.style.visibility).toBe('visible');
  /* The line holds its room from the first frame, so arriving at eight seconds moves no button. */
  const early = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'cloning', cloneStage: 'cloning', progress: 12 }} />);
  const reserved = new DOMParser().parseFromString(early, 'text/html').querySelector<HTMLElement>('[data-testid="github-clone-slow"]')!;
  expect(reserved.style.visibility).toBe('hidden');
  expect(reserved.textContent).toBe(slow.textContent);
});

test('the cloning action carries the handoff label', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [repository], repositoryId: 1, phase: 'cloning', progress: 5 }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const clone = document.querySelector<HTMLButtonElement>('[data-testid="github-clone"]')!;
  expect(clone.disabled).toBe(true);
  expect(clone.textContent).toBe(t('github.cloning'));
});

test('a repository an organization blocks is greyed, explains itself and leaves Clone disabled', () => {
  for (const access of ['sso', 'approval'] as const) {
    const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [{ ...repository, access }], repositoryId: 1 }} />);
    const document = new DOMParser().parseFromString(html, 'text/html');
    const row = document.querySelector<HTMLElement>('[data-testid="github-repo-1"]')!;
    expect(row.getAttribute('data-state')).toBe(access);
    expect(row.style.cursor).toBe('not-allowed');
    expect(row.style.background).toBe('#262626');
    expect(row.style.color).toBe('#9a9a9a');
    expect(html).toContain(t(access === 'sso' ? 'github.blocked.sso' : 'github.blocked.approval'));
    expect(document.querySelector('[data-testid="github-repo-explanation"]')?.textContent).toContain(t(access === 'sso' ? 'github.blocked.sso.action' : 'github.blocked.approval.action'));
    expect(document.querySelector('[data-testid="github-clone"]')?.hasAttribute('disabled')).toBe(true);
  }
});

test('an organization block stops the clone, never the copy already on this computer', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [{ ...repository, access: 'sso', onThisComputer: true }], repositoryId: 1 }} />);
  const document = new DOMParser().parseFromString(html, 'text/html');
  expect(document.querySelector('[data-testid="github-open"]')?.hasAttribute('disabled')).toBe(false);
  expect(html).toContain(t('github.blocked.sso'));
  const duplicate = renderToStaticMarkup(<GithubImportView {...props} state={{ ...CONNECTED, repositories: [{ ...repository, access: 'sso' }], repositoryId: 1, existingPath: '/Workspaces/repo' }} />);
  expect(new DOMParser().parseFromString(duplicate, 'text/html').querySelector('[data-testid="github-open"]')?.hasAttribute('disabled')).toBe(false);
});

test('an empty repository list offers one refresh action without duplicate access links', () => {
  const html = renderToStaticMarkup(<GithubImportView {...props} state={CONNECTED} />);
  expect(html.match(new RegExp(`>${t('github.refresh')}<`, 'g'))).toHaveLength(1);
  expect(html).toContain(t('github.access'));
});
