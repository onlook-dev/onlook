import { useLayoutEffect, useRef, useState } from 'react';
import type { AgentConnector, ConnectorInventory, HarnessId, PermissionMode } from '@studio/events';
import { ToolCalls } from '@studio/chat-ui';
import { CHAT_FIXTURE_STRINGS, tool } from '../ChatFixture.js';
import { ConnectorsMenu } from '../../chat/connectors/ConnectorsMenu.js';
import { ConnectorsNotice } from '../../chat/connectors/ConnectorsNotice.js';
import { ModelEffortMenu } from '../../chat/ModelEffortMenu.js';
import { PermissionRow } from '../../chat/PermissionRow.js';
import { composerControls, permissionModeControls } from '../../chat/composerControls.js';
import { ForwardIcon } from '../../icons/glyphs.js';
import { TipsPill } from '../../chat/TipsPill.js';
import { t } from '@studio/i18n';
import { noop, type Gallery } from './Showroom.js';

const SERVERS: AgentConnector[] = [
  { id: 'design', name: 'Design workspace', featured: 'figma', state: 'connected' },
  { id: 'search', name: 'Search', state: 'connected' },
  { id: 'library', name: 'Design library', state: 'needs-sign-in' },
  { id: 'broken', name: 'Local tools', state: 'failed', error: 'Connection refused' },
  { id: 'boot', name: 'Documentation', state: 'starting' },
  { id: 'off', name: 'Archive', state: 'off' },
];

const EVERY_STATE = ['connected', 'starting', 'needs-sign-in', 'failed', 'off', 'adding', 'awaiting-sign-in', 'sign-in-failed'] as const;

/** Every status a row can show, each on the longest name the fixtures hold, so a status that crowds the name out is visible (ONL-3181). */
const LONGEST_ROWS: AgentConnector[] = [
  ...EVERY_STATE.map((state) => ({ id: state, name: 'claude.ai Linear', state, ...(state === 'failed' ? { error: 'Connection refused' } : {}) })),
  ...(['needs-sign-in', 'failed', 'sign-in-failed', 'awaiting-sign-in'] as const).map((state) => ({ id: `cloud-${state}`, name: 'claude.ai Linear', state, managedExternally: true as const })),
  { id: 'mobbin', name: 'claude.ai Mobbin', featured: 'mobbin', state: 'awaiting-sign-in', managedExternally: true },
  { id: 'long', name: 'storybook-mcp-local-dev-server-for-the-design-system', state: 'needs-sign-in' },
];

function Menu({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const item = root.current?.querySelector<HTMLElement>(state.startsWith('rows-') ? '[data-testid="chat-connectors-row"][role="menuitem"]' : '[role="menuitem"]');
    if (state.endsWith('focus')) item?.focus();
    if (state.endsWith('hover')) item?.setAttribute('data-menu-hover', 'true');
  }, [state]);
  const signInState = state === 'adding' || state === 'awaiting-sign-in' || state === 'sign-in-failed' || state === 'needs-sign-in' || state === 'failed' ? state : undefined;
  let inventory: ConnectorInventory | undefined;
  if (state === 'loading') inventory = undefined;
  else if (state === 'unavailable') inventory = { servers: [], unavailable: true };
  else if (state === 'empty') inventory = { servers: [] };
  else if (signInState) inventory = { servers: [...SERVERS, { id: 'mobbin', name: 'Mobbin', featured: 'mobbin', state: signInState }] };
  else if (state === 'rows-sign-in' || state === 'rows-sign-in-failed' || state === 'rows-starting') inventory = { servers: SERVERS.map((server) => server.id === 'library' ? { ...server, state: state === 'rows-sign-in' ? 'awaiting-sign-in' : state === 'rows-sign-in-failed' ? 'sign-in-failed' : 'starting' } : server) };
  else if (state === 'rows-longest') inventory = { servers: LONGEST_ROWS };
  else if (state === 'rows-cloud') inventory = { servers: [...SERVERS, { id: 'mobbin', name: 'claude.ai Mobbin', featured: 'mobbin', state: 'needs-sign-in', managedExternally: true }, { id: 'cloud', name: 'claude.ai Linear', state: 'needs-sign-in', managedExternally: true }] };
  else if (state === 'rows-cloud-handoff') inventory = { servers: [...SERVERS, { id: 'mobbin', name: 'claude.ai Mobbin', featured: 'mobbin', state: 'awaiting-sign-in', managedExternally: true }, { id: 'cloud', name: 'claude.ai Linear', state: 'awaiting-sign-in', managedExternally: true }] };
  else inventory = { servers: SERVERS };
  return <div ref={root}><style>{'[data-menu-hover] { background: var(--color-overlay-hover); --menu-detail-color: var(--color-on-dark); }'}</style><ConnectorsMenu agent="claude" inventory={inventory} recentIds={state === 'rows-added' ? new Set(['search']) : undefined} onAdd={noop} onAct={noop} defaultExpanded={state === 'expanded' || state.startsWith('rows-')} /></div>;
}

/**
 * The whole account-managed hand-off on a scripted connector: the click opens the browser, and the
 * return that refreshes the inventory is a timer, since no Claude account is signed in here (ONL-3181).
 */
function CloudReturn(): React.JSX.Element {
  const [state, setState] = useState<'needs-sign-in' | 'awaiting-sign-in' | 'connected'>('needs-sign-in');
  useLayoutEffect(() => {
    if (state !== 'awaiting-sign-in') return;
    const timer = setTimeout(() => { setState('connected'); }, 2000);
    return () => { clearTimeout(timer); };
  }, [state]);
  const servers: AgentConnector[] = [...SERVERS, { id: 'mobbin', name: 'claude.ai Mobbin', featured: 'mobbin', state, managedExternally: true }];
  return <ConnectorsMenu agent="claude" inventory={{ servers }} onAdd={noop} onAct={() => { setState('awaiting-sign-in'); }} defaultExpanded />;
}

const QUIET_TOOLS: AgentConnector[] = [...(['Notion', 'Linear', 'GitHub', 'context7'] as const).map((name): AgentConnector => ({ id: name.toLowerCase(), name, state: 'connected' })), { id: 'playwright', name: 'playwright', state: 'off' }];
const ACCOUNT_TOOLS: AgentConnector[] = [
  { id: 'notion', name: 'Notion', state: 'connected' }, { id: 'linear', name: 'Linear', state: 'connected' }, { id: 'github', name: 'GitHub', state: 'connected' },
  { id: 'slack', name: 'Slack', state: 'needs-sign-in' }, { id: 'sentry', name: 'Sentry', state: 'failed', error: 'Connection closed' },
  { id: 'claude.ai Claude Docs', name: 'claude.ai Claude Docs', state: 'connected', managedExternally: true },
];
const EVERY_TOOL: AgentConnector[] = [
  { id: 'notion', name: 'Notion', state: 'connected' }, { id: 'linear', name: 'Linear', state: 'starting' }, { id: 'github', name: 'GitHub', state: 'off' },
  { id: 'slack', name: 'Slack', state: 'needs-sign-in' }, { id: 'asana', name: 'Asana', state: 'awaiting-sign-in' },
  { id: 'sentry', name: 'Sentry', state: 'failed', error: 'Connection closed' }, { id: 'claude.ai Gmail', name: 'claude.ai Gmail', state: 'needs-sign-in', managedExternally: true },
  { id: 'claude.ai Claude Docs', name: 'claude.ai Claude Docs', state: 'connected', managedExternally: true },
];
const MANY_TOOLS: AgentConnector[] = [
  { id: 'claude.ai Google Calendar', name: 'claude.ai Google Calendar', state: 'needs-sign-in', managedExternally: true },
  { id: 'company-design-system-tokens', name: 'company-design-system-tokens', state: 'failed', error: 'Connection closed' },
  ...(['Notion', 'Linear', 'GitHub', 'context7', 'playwright', 'supabase', 'vercel'] as const).map((name): AgentConnector => ({ id: name.toLowerCase(), name, state: 'connected' })),
  { id: 'stripe', name: 'stripe', state: 'starting' }, { id: 'storybook-mcp-local-dev-server', name: 'storybook-mcp-local-dev-server', state: 'connected' },
  { id: 'posthog', name: 'posthog', state: 'connected' }, { id: 'claude.ai Claude Docs', name: 'claude.ai Claude Docs', state: 'connected', managedExternally: true },
  { id: 'sequential-thinking', name: 'sequential-thinking', state: 'off' }, { id: 'filesystem', name: 'filesystem', state: 'connected' },
];
const FIGMA = (state: AgentConnector['state'], extra: Partial<AgentConnector> = {}): AgentConnector => ({ id: 'figma', name: 'Figma', featured: 'figma', state, ...extra });
const MOBBIN = (state: AgentConnector['state'], extra: Partial<AgentConnector> = {}): AgentConnector => ({ id: 'mobbin', name: 'Mobbin', featured: 'mobbin', state, ...extra });

/** The approved design's states, one story per frame of its states round, so a frame and its build can sit side by side (ONL-3193). */
const DESIGN_STATES: { id: string; agent?: HarnessId; servers?: AgentConnector[]; expanded?: boolean }[] = [
  { id: 'S1' },
  { id: 'S2', servers: QUIET_TOOLS },
  { id: 'S3', servers: [FIGMA('connected'), ...ACCOUNT_TOOLS] },
  { id: 'S4', servers: [FIGMA('connected'), MOBBIN('connected'), ...EVERY_TOOL], expanded: true },
  { id: 'F1', servers: [FIGMA('awaiting-sign-in'), ...QUIET_TOOLS] },
  { id: 'F2', servers: [FIGMA('connected'), MOBBIN('sign-in-failed'), ...QUIET_TOOLS] },
  { id: 'F3', servers: [FIGMA('starting'), MOBBIN('failed', { error: 'Connection closed' }), ...QUIET_TOOLS] },
  { id: 'E1', agent: 'codex', servers: [{ id: 'linear', name: 'Linear', state: 'connected' }, { id: 'sentry', name: 'Sentry', state: 'failed' }, { id: 'posthog', name: 'PostHog', state: 'needs-sign-in' }] },
  { id: 'E2', servers: [] },
  { id: 'E3', servers: MANY_TOOLS, expanded: true },
];

function DesignState({ state }: { state: (typeof DESIGN_STATES)[number] }): React.JSX.Element {
  return <ConnectorsMenu agent={state.agent ?? 'claude'} {...(state.servers === undefined ? {} : { inventory: { servers: state.servers } })} onAdd={noop} onAct={noop} defaultExpanded={state.expanded === true} {...(state.expanded ? { maxHeight: 420 } : {})} />;
}

function Notice({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const button = root.current?.querySelector<HTMLButtonElement>('button');
    if (state === 'focus') button?.focus();
    if (state === 'hover') button?.setAttribute('data-notice-hover', 'true');
  }, [state]);
  return <div ref={root} style={{ width: state === 'narrow' ? 256 : 340, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}><style>{'[data-notice-hover] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>{state === 'tips' && <TipsPill />}<ConnectorsNotice onOpen={noop} onDismiss={noop} /></div>;
}

function Permissions({ state }: { state: string }): React.JSX.Element {
  const [mode, setMode] = useState<PermissionMode>(state === 'codex' ? 'danger-full-access' : state === 'accept-edits' ? 'acceptEdits' : state === 'auto' ? 'auto' : state === 'plan' ? 'plan' : 'default');
  const permission = permissionModeControls({ mode, offered: state === 'codex' ? ['danger-full-access'] : ['default', 'acceptEdits', 'auto', 'plan'], setMode });
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (state === 'open' || state === 'no-models') root.current?.querySelector<HTMLButtonElement>('button')?.click();
    if (state === 'focus') root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    if (state === 'hover') root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.setAttribute('data-menu-hover', 'true');
  }, [state]);
  if (state !== 'open' && state !== 'no-models') return <div ref={root} style={{ width: 240 }}><style>{'[data-menu-hover] { background: var(--color-overlay-hover); }'}</style><PermissionRow control={permission} /></div>;
  const controls = composerControls({ harness: 'claude', models: state === 'no-models' ? [] : [{ value: 'opus', displayName: 'Claude Opus', supportedEffortLevels: ['low', 'high'] }], model: 'opus', effort: 'high', setModel: noop, setEffort: noop });
  return <div ref={root} style={{ width: 340, height: 260, paddingTop: 210 }}><ModelEffortMenu icon={ForwardIcon} label={controls.combinedLabel} size={18} testId="showroom-model" modelRows={controls.modelRows} isDisabled={controls.isDisabled} permission={permission} /></div>;
}

function ConnectorCalls({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const button = root.current?.querySelector<HTMLButtonElement>('button');
    if (state === 'focus') button?.focus();
    if (state === 'expanded' || state === 'auth-expanded') button?.click();
  }, [state]);
  const failure = state.startsWith('auth');
  const message = t('chat.connectors.tool.signInRequired', { connector: 'Figma' });
  const calls = failure
    ? [tool('auth', 'read', message, message, 'failed', false, { result: message, errorMessage: message })]
    : [tool('figma', 'read', 'figma', 'figma: get design context', 'completed', false, { result: 'Frame design context' }), tool('mobbin', 'search', 'mobbin', 'mobbin: search screens', 'completed', false, { result: 'Onboarding references' })];
  return <div ref={root} className="astryx-chat-layout" style={{ width: 340, padding: 12 }}><ToolCalls calls={calls} strings={CHAT_FIXTURE_STRINGS} chevronIcon={ForwardIcon} onRespond={noop} /></div>;
}

export const CONNECTORS_GALLERY: Gallery = {
  id: 'connectors', title: 'Connectors', categories: [
    { id: 'calls', title: 'Connector calls', stories: ['default', 'focus', 'expanded', 'auth', 'auth-expanded'].map((state) => ({ id: `connectors-calls-${state}`, title: state, render: () => <ConnectorCalls state={state} /> })) },
    { id: 'menu', title: 'Inventory', stories: ['default', 'expanded', 'loading', 'empty', 'unavailable', 'hover', 'focus', 'adding', 'awaiting-sign-in', 'sign-in-failed', 'needs-sign-in', 'failed', 'rows-hover', 'rows-focus', 'rows-sign-in', 'rows-sign-in-failed', 'rows-starting', 'rows-cloud', 'rows-cloud-handoff', 'rows-longest', 'rows-added', 'rows-settled'].map((state) => ({ id: `connectors-menu-${state}`, title: state, render: () => <Menu state={state} /> })).concat([{ id: 'connectors-menu-rows-cloud-return', title: 'rows-cloud-return', render: () => <CloudReturn /> }]) },
    { id: 'states', title: 'Approved design states', stories: DESIGN_STATES.map((state) => ({ id: `connectors-states-${state.id}`, title: state.id, render: () => <DesignState state={state} /> })) },
    { id: 'notice', title: 'Design tools notice', stories: ['default', 'hover', 'focus', 'narrow', 'tips'].map((state) => ({ id: `connectors-notice-${state}`, title: state, render: () => <Notice state={state} /> })) },
    { id: 'permissions', title: 'Permissions', stories: ['claude', 'accept-edits', 'auto', 'plan', 'codex', 'open', 'hover', 'focus', 'no-models'].map((state) => ({ id: `connectors-permissions-${state}`, title: state, render: () => <Permissions state={state} /> })) },
  ],
};
