import { useLayoutEffect, useRef } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import type { GithubImportState } from '@studio/events';
import { GITHUB_FLOW_WIDTH, GithubImportView, GithubSettings, GithubSettingsView, SETTINGS_FLOW_HEIGHT, SETTINGS_FLOW_WIDTH } from '../../github-import/GithubImport.js';
import { AddCodebase } from '../../github-import/AddCodebase.js';
import { EMPTY_GITHUB, useGithubImport } from '../../github-import/store.js';
import { seedCapabilities } from '../../capabilities.js';
import { seedFlags } from '../../flags/store.js';
import { t } from '@studio/i18n';
import { ImportSourceChooser } from '../../onboarding/ImportSourceChooser.js';
import { ProjectsSidebar } from '../../projects/ProjectsSidebar.js';
import { Focused, noop, type Gallery } from './Showroom.js';

const repository = { id: 1, fullName: 'github/docs', private: true, defaultBranch: 'main', archived: false, canPull: true, canPush: true };
const CONNECTED: GithubImportState = { ...EMPTY_GITHUB, enabled: true, connection: { status: 'connected', scopes: ['repo'], expiresAt: null }, repositories: [repository, ...['octocat/Hello-World', 'acme-design/checkout-flow', 'acme-design/design-system', 'yuki-tanaka/portfolio', 'acme-design/mobile-app'].map((fullName, index) => ({ ...repository, id: index + 2, fullName }))] };
const SELECTED: GithubImportState = { ...CONNECTED, repositoryId: 1, branches: ['main', 'design-refresh'], destination: '/Documents', destinationChoice: 'documents' };
const STATES = ['connect', 'connecting', 'no-connection', 'waiting', 'reconnect', 'missing-scopes', 'forbidden', 'unavailable', 'unavailable-after-connect', 'rate-limited', 'token-lifetime', 'not-found', 'invalid-request', 'disabled', 'list', 'selected', 'archived', 'local', 'blocked-sso', 'blocked-approval', 'slow', 'empty', 'refreshing', 'connect-pending', 'clone-pending', 'list-hover', 'list-focus', 'existing', 'cloning', 'network', 'access', 'credential-failed', 'disk', 'empty-repo', 'cancelled', 'destination', 'existing-failed', 'cleanup', 'unknown', 'hover', 'focus'] as const;
const SURFACES = ['sources', 'sources-off', 'card', 'card-busy', 'onboarding', 'projects', 'projects-hover', 'projects-focus', 'settings', 'settings-lapsed', 'settings-connected', 'settings-disconnected', 'settings-connecting', 'settings-error'] as const;

function stateFor(name: typeof STATES[number]): GithubImportState {
  if (name === 'connect' || name === 'focus' || name === 'hover' || name === 'connect-pending') return { ...EMPTY_GITHUB, enabled: true };
  if (name === 'connecting') return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, connection: { status: 'connecting' } };
  if (name === 'no-connection') return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true };
  if (name === 'waiting') return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, waitingForApproval: true };
  if (name === 'reconnect' || name === 'missing-scopes') return { ...EMPTY_GITHUB, enabled: true, connection: { status: 'reconnect', reason: name === 'reconnect' ? 'expired' : 'missing_scopes' } };
  if (name === 'forbidden') return { ...EMPTY_GITHUB, enabled: true, connection: { status: 'forbidden' } };
  if (name === 'unavailable' || name === 'rate-limited' || name === 'token-lifetime') return { ...EMPTY_GITHUB, enabled: true, connection: { status: 'unavailable', reason: name === 'rate-limited' ? 'rate_limited' : name === 'token-lifetime' ? 'token_lifetime' : 'provider_unavailable' } };
  if (name === 'unavailable-after-connect') return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, connection: { status: 'unavailable', reason: 'provider_unavailable' } };
  if (name === 'disabled') return { ...EMPTY_GITHUB, enabled: true };
  if (name === 'not-found' || name === 'invalid-request') return { ...EMPTY_GITHUB, enabled: true, connectionAttempted: true, connection: { status: name === 'not-found' ? 'not_found' : 'invalid_request' } };
  if (name === 'list' || name === 'refreshing' || name === 'list-hover' || name === 'list-focus') return CONNECTED;
  if (name === 'empty') return { ...CONNECTED, repositories: [] };
  if (name === 'archived' || name === 'local') return { ...SELECTED, repositories: CONNECTED.repositories.map((repo) => repo.id === 1 ? { ...repo, archived: name === 'archived', onThisComputer: name === 'local' } : repo) };
  /* No listing answers with an organization-policy block today; the presentation stands ready behind the row state (ONL-3182). */
  if (name === 'blocked-sso' || name === 'blocked-approval') return { ...SELECTED, repositories: CONNECTED.repositories.map((repo) => repo.id === 1 ? { ...repo, access: name === 'blocked-sso' ? 'sso' as const : 'approval' as const } : repo) };
  if (name === 'slow') return { ...SELECTED, phase: 'cloning', cloneStage: 'slow', progress: 12 };
  if (name === 'credential-failed') return { ...SELECTED, branches: [], phase: 'failed', failure: 'access', connection: { status: 'reconnect', reason: 'expired' } };
  if (name === 'empty-repo') return { ...SELECTED, branches: [], phase: 'failed', failure: 'empty' };
  if (name === 'existing') return { ...SELECTED, existingPath: '/registered/project' };
  if (name === 'cloning') return { ...SELECTED, phase: 'cloning', cloneStage: 'cloning', progress: 63 };
  if (name === 'existing-failed') return { ...SELECTED, phase: 'failed', failure: 'existing' };
  if (name === 'network' || name === 'access' || name === 'disk' || name === 'cancelled' || name === 'destination' || name === 'cleanup' || name === 'unknown') return { ...SELECTED, phase: 'failed', failure: name };
  return SELECTED;
}

function FlowStory({ name, height = 'min(650px, calc(100vh - 220px))' }: { name: typeof STATES[number]; height?: number | string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const pendingCommands = name === 'disabled' ? [{ kind: 'begin' as const, entryPoint: 'projects' as const }]
    : name === 'refreshing' ? [{ kind: 'repositories' as const }]
    : name === 'connect-pending' ? [{ kind: 'start' as const, entryPoint: 'projects' as const }]
    : name === 'clone-pending' ? [{ kind: 'clone' as const, repositoryId: 1, branch: 'main', entryPoint: 'projects' as const }] : [];
  return <Focused selector={name === 'focus' || name === 'hover' ? 'button' : name === 'list-hover' ? '[data-testid="github-repo-1"]'
    : name === 'list-focus' ? '[role="listbox"]' : undefined} hover={name === 'hover' || name === 'list-hover'}>
    <div ref={root} style={{ width: GITHUB_FLOW_WIDTH + 80, padding: 20 }}>
      <Dialog isInline isOpen onOpenChange={noop} purpose="form" padding={0} width={GITHUB_FLOW_WIDTH} maxHeight={height} style={{ height }} aria-label={t('github.import')}>
        <GithubImportView state={stateFor(name)} pendingCommands={pendingCommands} progressCommands={pendingCommands} entryPoint="projects"
          onCommand={noop} onClose={noop} onFolder={noop} onOpen={noop} />
      </Dialog>
    </div>
  </Focused>;
}

function SurfaceStory({ name }: { name: typeof SURFACES[number] }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    seedFlags({ sections: false, connectors: false, githubImport: name !== 'sources-off' });
    seedCapabilities({ github: true });
    useGithubImport.setState({ state: name === 'settings-lapsed' ? stateFor('reconnect') : CONNECTED });
    if (name === 'sources' || name === 'sources-off') root.current?.querySelector<HTMLButtonElement>('[data-testid="add-codebase"]')?.click();
  }, [name]);
  if (name === 'onboarding') return <div style={{ width: 840 }}><ImportSourceChooser onOpen={noop} /></div>;
  /* Settings keeps the dialog it had before the picker grew: the library's chrome at 520px (ONL-3182). */
  if (name.startsWith('settings-') && name !== 'settings-lapsed') {
    const state = name === 'settings-connected' ? stateFor('list') : name === 'settings-connecting' ? stateFor('connecting') : name === 'settings-error' ? stateFor('rate-limited') : stateFor('no-connection');
    return <div style={{ width: SETTINGS_FLOW_WIDTH + 80, padding: 20 }}>
      <Dialog isInline isOpen onOpenChange={noop} purpose="form" width={SETTINGS_FLOW_WIDTH} maxHeight={SETTINGS_FLOW_HEIGHT} style={{ height: SETTINGS_FLOW_HEIGHT }} aria-label={t('github.name')}>
        <GithubSettingsView state={state} onCommand={noop} onClose={noop} />
      </Dialog>
    </div>;
  }
  if (name === 'settings' || name === 'settings-lapsed') return <div style={{ width: 560, padding: 24 }}><GithubSettings /></div>;
  /* The same door as a card, which is how the first-run step stands it beside Start from scratch. */
  if (name === 'card' || name === 'card-busy') return <div style={{ width: 300, height: 170, padding: 24, display: 'flex' }}>
    <AddCodebase entryPoint="onboarding" presentation="card" isBusy={name === 'card-busy'} onFolder={noop} onOpen={noop} />
  </div>;
  if (name === 'sources' || name === 'sources-off') return <div ref={root} style={{ width: 300, height: 260, padding: 24 }}><AddCodebase entryPoint="projects" onFolder={noop} onOpen={noop} /></div>;
  return <Focused selector={name === 'projects' ? undefined : '[data-testid="add-codebase"]'} hover={name === 'projects-hover'}>
    <div ref={root} style={{ width: 300, height: 560 }}><ProjectsSidebar workspaces={[]} onAddWorkspace={noop} onOpenGithub={noop} /></div>
  </Focused>;
}

/* A window too short for the modal's own height: the states where the footer has to survive the clip. */
const SHORT_WINDOW = 360;
const CRAMPED = ['cancelled', 'disk', 'access', 'network', 'selected'] as const;

export const GITHUB_IMPORT_GALLERY: Gallery = {
  id: 'github-import', title: 'GitHub import', categories: [
    { id: 'states', title: 'Connection and clone', stories: STATES.map((name) => ({ id: name, title: name, render: () => <FlowStory name={name} /> })) },
    { id: 'surfaces', title: 'Where it opens from', stories: SURFACES.map((name) => ({ id: name, title: name, wide: name === 'onboarding', render: () => <SurfaceStory name={name} /> })) },
    { id: 'cramped', title: 'Modal on a short window', stories: CRAMPED.map((name) => ({ id: `cramped-${name}`, title: name, render: () => <FlowStory name={name} height={SHORT_WINDOW} /> })) },
  ],
};
