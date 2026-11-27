import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '../overlay/Dialog.js';
import { Icon } from '@astryxdesign/core/Icon';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { GithubEntryPoint, GithubImportCommand, GithubImportState } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { capable } from '../capabilities.js';
import { CAP_GLYPH } from '../icons/capGlyph.js';
import { GithubIcon } from '../icons/glyphs.js';
import { useFlag } from '../flags/store.js';
import { SettingsRow, SettingsSection } from '../settings/rows.js';
import { cloningNow, dismissGithub, githubCommand, primeGithub, useGithubImport } from './store.js';
import { RepositoryAvatar } from './RepositoryAvatar.js';
import { matchRepositories, repositoryBlocked, RepositoryPicker } from './RepositoryPicker.js';

const FAILURE_KEYS = {
  network: 'github.error.network', access: 'github.error.access', disk: 'github.error.disk',
  empty: 'github.error.empty', cancelled: 'github.error.cancelled', destination: 'github.error.destination',
  existing: 'github.error.existing', cleanup: 'github.error.cleanup', unknown: 'github.error.unknown',
} as const satisfies Record<NonNullable<GithubImportState['failure']>, StringKey>;

export const GITHUB_FLOW_WIDTH = 660;
export const GITHUB_FLOW_HEIGHT = 'min(650px, calc(100vh - 120px))';
/* Settings keeps the dialog it had before the picker grew: its own width, padding, header and buttons (ONL-3182). */
export const SETTINGS_FLOW_WIDTH = 520;
/** Twenty taller than the box Settings had: the state that asks to connect overflowed it by twelve, and a dialog this small has nowhere to scroll (ONL-3182). */
export const SETTINGS_FLOW_HEIGHT = 'min(280px, calc(100vh - 120px))';

export const FLOW_BOX: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 };
const CENTRED: React.CSSProperties = { textAlign: 'center' };
const BODY_BOX: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: '100%' };
const BODY_STATE: React.CSSProperties = { flex: '1 1 0', minHeight: 0, padding: 20, overflowY: 'auto' };
const FOOTER_BUTTON: React.CSSProperties = { minHeight: 40, height: 'auto', padding: '8px 15px', fontSize: 16, transition: 'none', cursor: 'default' };
const DISABLED_COMMIT: React.CSSProperties = { ...FOOTER_BUTTON, backgroundColor: '#2a2a2a', color: '#6a6a6a', opacity: 1 };
const LIST_ACTION: React.CSSProperties = { height: 32, paddingInline: 12, fontSize: 14, transition: 'none', cursor: 'default' };

export interface GithubImportViewProps {
  state: GithubImportState;
  pendingCommands?: GithubImportCommand[];
  progressCommands?: GithubImportCommand[];
  entryPoint: GithubEntryPoint;
  onCommand(command: GithubImportCommand): void;
  onClose(): void;
  onFolder?(): void;
  onOpen(path: string, existing: boolean): void;
}

interface ConnectionPrompt {
  message: StringKey;
  alert: boolean;
  action?: { label: StringKey; command: GithubImportCommand };
  extras: { label: StringKey; command: GithubImportCommand }[];
}

/** Where the person stands with GitHub, and what they can press about it; one answer for both dialogs. */
function connectionPrompt(state: GithubImportState, entryPoint: GithubEntryPoint): ConnectionPrompt {
  if (state.connection.status === 'checking') return { message: 'github.checking', alert: false, extras: [] };
  const connecting = state.connection.status === 'connecting';
  const failed = state.connection.status === 'unavailable' || state.connection.status === 'not_found' || state.connection.status === 'invalid_request';
  const forbidden = state.connection.status === 'forbidden';
  const waiting = state.waitingForApproval === true && (state.connection.status === 'disconnected' || forbidden);
  const message: StringKey = connecting ? 'github.connecting'
    : state.connection.status === 'reconnect' ? 'github.reconnect.body'
    : waiting ? 'github.waiting.body'
    : forbidden ? 'github.approval.body'
    : state.connection.status === 'unavailable' ? state.connection.reason === 'rate_limited' ? 'github.rateLimited'
      : state.connection.reason === 'token_lifetime' ? 'github.tokenLifetime' : 'github.unavailable'
    : failed ? 'github.connectionFailed'
    : state.connectionAttempted === true ? 'github.noConnection' : 'github.connect.body';
  let action: ConnectionPrompt['action'] = {
    label: state.connection.status === 'reconnect' ? 'github.reconnect' : 'github.connect', command: { kind: 'start', entryPoint },
  };
  if (connecting || (waiting && state.connectionAttempted === true)) action = { label: 'github.check', command: { kind: 'status' } };
  else if (forbidden) action = { label: 'github.access', command: { kind: 'access' } };
  else if (failed) action = { label: 'github.tryAgain', command: { kind: 'status' } };
  const extras: ConnectionPrompt['extras'] = [];
  if (state.connectionAttempted === true && !connecting && !waiting && !failed && !forbidden) extras.push({ label: 'github.check', command: { kind: 'status' } });
  if (state.connectionAttempted === true && state.connection.status === 'disconnected' && !waiting) extras.push({ label: 'github.access', command: { kind: 'access' } });
  if (forbidden && !waiting) extras.push({ label: 'github.waiting', command: { kind: 'leave', next: 'waiting' } });
  return { message, alert: failed || forbidden, ...(action === undefined ? {} : { action }), extras };
}

export function GithubImportView({ state, pendingCommands = [], progressCommands = [], entryPoint, onCommand, onClose, onFolder }: GithubImportViewProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const repo = state.repositories.find((candidate) => candidate.id === state.repositoryId);
  const listed = state.repositories.length > 0;
  /* The query outlives the picker, so a search typed against another account's repositories drops with the list. */
  useEffect(() => { if (!listed) setQuery(''); }, [listed]);
  const connected = state.connection.status === 'connected';
  const cloning = cloningNow({ state, pendingCommands });
  const showRepositories = connected || repo !== undefined;
  const existing = state.existingPath;
  const pending = (kind: GithubImportCommand['kind']): boolean => pendingCommands.some((command) => command.kind === kind);
  const progressing = (kind: GithubImportCommand['kind']): boolean => progressCommands.some((command) => command.kind === kind);
  const buttonProgress = (kind: GithubImportCommand['kind']): { isDisabled: boolean; isLoading: boolean } => ({ isDisabled: pending(kind), isLoading: progressing(kind) });
  const duplicate = existing !== undefined && repo?.onThisComputer !== true;
  const screen = !showRepositories ? 'connect' : cloning ? 'cloning' : duplicate ? 'duplicate' : 'picker';
  const visible = useMemo(() => matchRepositories(state.repositories, query), [state.repositories, query]);
  const target = screen === 'picker' && !visible.some((candidate) => candidate.id === repo?.id) ? undefined : repo;
  /* Organization policy blocks the clone, never the copy already on this computer: opening it asks GitHub for nothing. */
  const blocked = target !== undefined && repositoryBlocked(target);
  const openTarget = target !== undefined && (target.onThisComputer === true || existing !== undefined) ? target : undefined;
  const branch = target?.defaultBranch ?? '';
  const selectRepository = useCallback((repositoryId: number) => onCommand({ kind: 'select', repositoryId }), [onCommand]);
  const prompt = connectionPrompt(state, entryPoint);
  const connectionAction = prompt.action;

  const failureMessage = !connected ? prompt.message : state.failure === undefined ? undefined : FAILURE_KEYS[state.failure];
  /* The failure's own recovery is the nearer door; the list keeps the other one rather than two of the same. */
  const noteRecoversAccess = showRepositories && failureMessage !== undefined
    && (connected ? state.failure === 'access' : connectionAction?.command.kind === 'access');
  const failureNote = showRepositories && failureMessage !== undefined
    ? <VStack gap={2} align="start">
      <Text role="alert" type="supporting">{t(failureMessage)}</Text>
      {!connected && connectionAction && <Button label={t(connectionAction.label)} variant="secondary" style={FOOTER_BUTTON} {...buttonProgress(connectionAction.command.kind)} onClick={() => onCommand(connectionAction.command)} />}
      {connected && state.failure === 'access' && <Button label={t('github.access')} variant="secondary" style={FOOTER_BUTTON} {...buttonProgress('access')} onClick={() => onCommand({ kind: 'access' })} />}
    </VStack> : null;
  /* At the end of the list, where someone who read every row and did not find theirs is already looking. */
  const listOpen = <HStack justify="between" gap={3} style={{ padding: '12px 12px 4px', flexWrap: 'wrap' }} data-testid="github-list-actions">
    <Button label={t('github.refresh')} variant="secondary" style={LIST_ACTION} {...buttonProgress('repositories')} onClick={() => onCommand({ kind: 'repositories' })} />
    {!noteRecoversAccess && <Button label={t('github.access')} variant="secondary" style={LIST_ACTION} {...buttonProgress('access')} onClick={() => onCommand({ kind: 'access' })} />}
  </HStack>;
  const body = screen === 'connect' ? <ConnectionBody prompt={prompt} buttonProgress={buttonProgress} isWaiting={pending('begin')} style={{ ...BODY_STATE, ...CENTRED }} onCommand={onCommand} />
  : screen === 'cloning' ? <VStack gap={3} align="center" justify="center" style={{ ...BODY_STATE, ...CENTRED }}>
    <Text type="body">{t('github.cloning')}</Text>
    <Text type="supporting">{repo?.fullName}</Text>
    {/* The bar names what it measures rather than repeating the line above it, which a screen reader reads in turn (ONL-3182). */}
    <ProgressBar label={t('github.cloneProgress')} isLabelHidden value={state.progress} style={{ width: 260 }} />
    <Text type="supporting" style={{ fontVariantNumeric: 'tabular-nums' }}>{t('github.progress', { percent: String(state.progress) })}</Text>
    {/* Drawn from the first frame and only hidden, so the line arriving at eight seconds moves nothing. */}
    <Text type="supporting" style={{ textWrap: 'balance', maxWidth: 360, visibility: state.cloneStage === 'slow' ? 'visible' : 'hidden' }}
      data-testid="github-clone-slow" data-state={state.cloneStage ?? 'cloning'}>{t('github.slow')}</Text>
    <Button label={t('github.cancel')} variant="secondary" style={FOOTER_BUTTON} {...buttonProgress('cancel')} onClick={() => onCommand({ kind: 'cancel' })} data-testid="github-cancel" />
  </VStack> : screen === 'duplicate' ? <VStack gap={3} align="center" justify="center" style={{ ...BODY_STATE, ...CENTRED }} data-testid="github-existing">
    {failureNote}
    {repo && <HStack gap={3} align="center"><RepositoryAvatar fullName={repo.fullName} /><Text type="body">{repo.fullName}</Text></HStack>}
    <Text type="body" style={{ textWrap: 'balance', maxWidth: 420 }}>{t('github.existing', { repository: repo?.fullName ?? '' })}</Text>
    <Text type="supporting" style={{ overflowWrap: 'anywhere' }}>{existing}</Text>
  </VStack> : <>
    {failureNote && <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>{failureNote}</div>}
    <RepositoryPicker repositories={visible} repositoryId={target?.id} locked={cloning} query={query} onQuery={setQuery}
      onSelect={selectRepository}
      empty={listed ? t('github.noMatch') : <Text type="supporting">{t('github.empty')}</Text>}
      actions={listOpen} />
  </>;

  const commit = screen === 'connect' ? undefined
    : openTarget !== undefined ? <Button label={t('github.open')} variant="primary" style={cloning ? DISABLED_COMMIT : FOOTER_BUTTON} isDisabled={cloning}
      onClick={() => onCommand({ kind: 'open', repositoryId: openTarget.id })} data-testid="github-open" />
    : <Button label={t(cloning ? 'github.cloning' : 'github.clone')} variant="primary" style={cloning || target === undefined || blocked ? DISABLED_COMMIT : FOOTER_BUTTON} isDisabled={cloning || target === undefined || blocked}
      onClick={() => target !== undefined && !blocked && onCommand({ kind: 'clone', repositoryId: target.id, branch, entryPoint })} data-testid="github-clone" />;

  /* Every control in the flow carries its own arrow: a button's own `cursor` outranks the one the flow sets around it. */
  return <div style={{ ...FLOW_BOX, background: '#000', border: '0.5px solid #3a3a3a', borderRadius: 10, overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none', cursor: 'default' }} data-testid="github-import-flow">
    <h2 style={{ margin: 0, padding: '18px 20px', fontSize: 19, fontWeight: 400, lineHeight: 1.2, color: '#f2f2f2', borderBottom: '0.5px solid #2c2c2c', flexShrink: 0 }}>
      {t('github.import')}
    </h2>
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }} data-testid="github-import-body">{body}</div>
    <HStack justify="between" align="center" gap={3} width="100%" data-testid="github-import-actions"
      style={{ padding: 20, borderTop: '0.5px solid #2c2c2c', flexShrink: 0, boxSizing: 'border-box', flexWrap: 'wrap' }}>
          <HStack gap={2} style={{ flexWrap: 'wrap' }}>
            <Button label={t('github.back')} variant="secondary" style={FOOTER_BUTTON} isDisabled={cloning}
              onClick={() => duplicate ? onCommand({ kind: 'list' }) : onClose()} data-testid="github-back" />
            {onFolder && <Button label={t('github.folder')} variant="secondary" style={FOOTER_BUTTON} isDisabled={cloning} onClick={onFolder} />}
          </HStack>
          {commit}
    </HStack>
  </div>;
}

/** The connection screen of the import modal, at the modal's own button size. */
function ConnectionBody({ prompt, buttonProgress, isWaiting, style, onCommand }: {
  prompt: ConnectionPrompt;
  buttonProgress(kind: GithubImportCommand['kind']): { isDisabled: boolean; isLoading: boolean };
  isWaiting: boolean;
  style: React.CSSProperties;
  onCommand(command: GithubImportCommand): void;
}): React.JSX.Element {
  const action = prompt.action;
  return <VStack gap={4} align="center" justify="center" style={style} data-testid="github-import-connect">
    <Text type="supporting" style={{ textWrap: 'balance', maxWidth: 360 }} role={prompt.alert ? 'alert' : 'status'}>{t(prompt.message)}</Text>
    {/* The mark belongs to connecting an account, not to checking again or to asking an organization. */}
    {action && <Button label={t(action.label)} variant="primary" style={FOOTER_BUTTON}
      {...(action.command.kind === 'start' ? { icon: <Icon icon={GithubIcon} color="inherit" style={CAP_GLYPH} /> } : {})}
      {...buttonProgress(action.command.kind)} isDisabled={isWaiting || buttonProgress(action.command.kind).isDisabled}
      onClick={() => onCommand(action.command)} />}
    <HStack gap={2}>
      {prompt.extras.map((extra) => <Button key={extra.label} label={t(extra.label)} variant="secondary" style={FOOTER_BUTTON}
        {...buttonProgress(extra.command.kind)} onClick={() => onCommand(extra.command)} />)}
    </HStack>
  </VStack>;
}

/** Settings as it stood before the picker grew: the library's own dialog chrome around one connection state. */
export function GithubSettingsView({ state, pendingCommands = [], progressCommands = [], onCommand, onClose }: Omit<GithubImportViewProps, 'onOpen' | 'entryPoint' | 'onFolder'>): React.JSX.Element {
  const prompt = connectionPrompt(state, 'settings');
  const pending = (kind: GithubImportCommand['kind']): boolean => pendingCommands.some((command) => command.kind === kind);
  const buttonProgress = (kind: GithubImportCommand['kind']): { isDisabled: boolean; isLoading: boolean } => ({
    isDisabled: pending(kind), isLoading: progressCommands.some((command) => command.kind === kind),
  });
  const connected = state.connection.status === 'connected';
  return <div style={FLOW_BOX} data-testid="github-import-flow">
    <Layout
      header={<DialogHeader title={t('github.name')} hasDivider />}
      content={<LayoutContent><div style={BODY_BOX} data-testid="github-import-body">
        {connected
          ? <VStack align="center" justify="center" style={{ ...CENTRED, flex: '1 1 auto' }}><Text type="body">{t('github.connected')}</Text></VStack>
          : <VStack gap={4} align="center" justify="center" style={{ ...CENTRED, flex: '1 1 auto' }} data-testid="github-import-connect">
            <Text type="supporting" role={prompt.alert ? 'alert' : 'status'}>{t(prompt.message)}</Text>
            {prompt.action && <Button label={t(prompt.action.label)} variant="primary" {...buttonProgress(prompt.action.command.kind)}
              isDisabled={pending('begin') || pending(prompt.action.command.kind)} onClick={() => { if (prompt.action) onCommand(prompt.action.command); }} />}
            <HStack gap={2}>
              {prompt.extras.map((extra) => <Button key={extra.label} label={t(extra.label)} variant="secondary" size="sm"
                {...buttonProgress(extra.command.kind)} onClick={() => onCommand(extra.command)} />)}
            </HStack>
          </VStack>}
      </div></LayoutContent>}
      footer={<LayoutFooter hasDivider>
        <HStack justify="between" align="center" gap={3} width="100%" data-testid="github-import-actions">
          <Button label={t('github.back')} variant="secondary" onClick={onClose} data-testid="github-back" />
        </HStack>
      </LayoutFooter>}
    />
  </div>;
}

function leaveForFolder(action: () => void): void {
  void githubCommand({ kind: 'leave', next: 'folder' });
  action();
}

export function GithubImportFlow({ entryPoint, onClose, onFolder, onOpen }: Omit<GithubImportViewProps, 'state' | 'pendingCommands' | 'progressCommands' | 'onCommand'>): React.JSX.Element {
  const { state, pendingCommands, progressCommands } = useGithubImport();
  const landed = useRef<string | undefined>(undefined);
  /* The open intent has its own owner, so pressing anything else afterwards never discards its answer. */
  const openRequest = useRef(0);
  const gone = useRef(false);
  useEffect(() => () => { gone.current = true; }, []);
  const onCommand = useCallback((command: GithubImportCommand): void => {
    if (command.kind === 'status') { void primeGithub(false); return; }
    if (command.kind !== 'open') { void githubCommand(command); return; }
    const request = ++openRequest.current;
    void githubCommand(command).then((next) => {
      if (gone.current || request !== openRequest.current) return;
      if (next.repositoryId === command.repositoryId && next.existingPath !== undefined) onOpen(next.existingPath, true);
    });
  }, [onOpen]);
  useEffect(() => {
    if (entryPoint !== 'settings' && state.phase === 'done' && state.sourcePath !== undefined && landed.current !== state.sourcePath) {
      landed.current = state.sourcePath;
      onOpen(state.sourcePath, false);
    }
  }, [state.phase, state.sourcePath, onOpen, entryPoint]);
  const leave = (): void => { gone.current = true; dismissGithub(); onClose(); };
  if (entryPoint === 'settings') return <GithubSettingsView state={state} pendingCommands={pendingCommands} progressCommands={progressCommands} onCommand={onCommand} onClose={leave} />;
  return <GithubImportView state={state} pendingCommands={pendingCommands} progressCommands={progressCommands} entryPoint={entryPoint}
    onCommand={onCommand}
    onClose={leave} {...(onFolder ? { onFolder: () => { gone.current = true; leaveForFolder(onFolder); } } : {})} onOpen={onOpen} />;
}

export function GithubSettingsSection({ state, onManage }: { state: GithubImportState; onManage(): void }): React.JSX.Element {
  const status = state.connection.status;
  const unavailable = status === 'unavailable' || status === 'not_found' || status === 'invalid_request';
  return <SettingsSection label={t('github.settings')} testId="github-settings">
    <SettingsRow label={t('github.name')} description={status === 'checking' ? undefined : t(status === 'connected' ? 'github.connected' : status === 'reconnect' ? 'github.reconnect.body' : unavailable ? connectionPrompt(state, 'settings').message : 'github.connect.body')}
      control={<Button label={t(status === 'checking' ? 'github.checking' : status === 'connected' ? 'github.manage' : status === 'reconnect' ? 'github.reconnect' : unavailable ? 'github.tryAgain' : 'github.connect')} variant="secondary" isDisabled={status === 'checking'} onClick={onManage} />} />
  </SettingsSection>;
}

export function GithubSettings(): React.JSX.Element | null {
  const enabled = useFlag('githubImport') && capable('github');
  const state = useGithubImport((store) => store.state);
  const [open, setOpen] = useState(false);
  if (!enabled) return null;
  return <>
    <GithubSettingsSection state={state} onManage={() => { void primeGithub(false); setOpen(true); }} />
    <Dialog isOpen={open} onOpenChange={(value) => { if (!value) { dismissGithub(); setOpen(false); } }}
      purpose="form" width={SETTINGS_FLOW_WIDTH} maxHeight={SETTINGS_FLOW_HEIGHT} style={{ height: SETTINGS_FLOW_HEIGHT }} data-testid="github-settings-dialog">
      {open && <GithubImportFlow entryPoint="settings" onClose={() => setOpen(false)} onOpen={() => setOpen(false)} />}
    </Dialog>
  </>;
}
