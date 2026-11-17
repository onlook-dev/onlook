import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Icon } from '@astryxdesign/core/Icon';
import { Button } from '@astryxdesign/core/Button';
import { Toast } from '@astryxdesign/core/Toast';
import { ChatPanel } from '@studio/chat-ui';
import { emptyState, DEFAULT_NOTIFICATIONS } from '@studio/events';
import { SignInCard } from '@studio/onboarding-ui';
import { CHAT_FIXTURE_STRINGS as strings } from '../ChatFixture.js';
import { NotificationInvitation, NotificationSettingsRow } from '../../notifications/NotificationSurfaces.js';
import { InviteTipCard } from '../../notifications/InviteTip.js';
import { DefaultAgentRow, SettingsSection } from '../../settings/rows.js';
import { claudeBillingLabel } from '../../agents/mapping.js';
import { agentSetupStrings } from '../../agent-setup/strings.js';
import { CARD_GLYPHS } from '../../agent-setup/glyphs.js';
import { onboardingUiStrings } from '../../onboarding/uiStrings.js';
import { ForwardIcon, PlayGlyph, SendArrowIcon } from '../../icons/glyphs.js';
import { chatPanelProps } from '../../chat/panelProps.js';
import { noop, type Gallery } from './Showroom.js';
import { NewChatDialog } from '../../chat/NewChatDialog.js';
import { SkillSuggestions, type SkillCatalog } from '../../chat/SkillSuggestions.js';
import { matchSkills } from '../../chat/skillMatch.js';
import { AGENT_SWITCHING_CATEGORY } from './agent-switching.js';
import { REASONING_MENU_CATEGORY } from './reasoning-menu.js';

const SKILLS = [
  { name: 'bayesian', description: 'Reason through uncertainty.', agent: 'codex' as const },
  { name: 'corporate-raider', description: 'Review the business strategy.', agent: 'codex' as const },
  { name: 'diagram-design', description: 'Draw a clear diagram.', agent: 'codex' as const },
];

function Skills({ mode }: { mode: string }): React.JSX.Element {
  const catalog: SkillCatalog = mode === 'loading' ? 'unheard' : mode === 'unavailable' ? 'unavailable' : 'heard';
  const skills = mode === 'empty' || catalog !== 'heard' ? [] : SKILLS;
  return <div style={{ width: 340 }}><SkillSuggestions matches={matchSkills(mode === 'filtered' ? 'di' : mode === 'no-match' ? 'zzz' : '', 'codex', skills)} highlighted={mode === 'selected' ? 1 : 0} catalog={catalog} hasSkills={skills.length > 0} listId={`skills-${mode}`} onChoose={noop} onHover={noop} /></div>;
}


function DismissedInvitation(): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [invitation, setInvitation] = useState<'pending' | 'dismissed'>('pending');
  useLayoutEffect(() => { root.current?.querySelector<HTMLElement>('[data-testid="notification-dismiss"]')?.click(); }, []);
  return <div ref={root} style={{ width: 340 }}><NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation }} onAction={(action) => { if (action.kind === 'dismiss') setInvitation('dismissed'); }} /></div>;
}

function ControlState({ state, target, children }: { state: 'hover' | 'focus' | 'open'; target: string; children: ReactNode }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const found = root.current?.querySelector<HTMLElement>(target);
    const control = found?.matches('button,input') ? found : found?.querySelector<HTMLElement>('button,input') ?? found;
    if (!control) return;
    control.setAttribute('data-staged-control', state);
    if (state === 'focus') control.focus();
    if (state === 'open') control.click();
  }, [state, target]);
  return <div ref={root}><style>{`
    [data-staged-control="hover"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }
    [data-staged-control="focus"] { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset, 3px); }
  `}</style>{children}</div>;
}

function Composer({ mode }: { mode: string }): React.JSX.Element {
  const [value, setValue] = useState(mode === 'typed' ? 'Use more whitespace.' : '');
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (mode === 'focus') root.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
  }, [mode]);
  return <div ref={root} className="astryx-chat-layout" style={{ width: 380, height: mode === 'resumed' ? 320 : 210 }}><ChatPanel {...chatPanelProps({
    transcript: { state: { ...emptyState, interrupted: mode !== 'finished', isStreaming: mode === 'running', ...(mode === 'resumed' ? { items: [{ kind: 'user' as const, id: 'resumed', text: 'continue', origin: 'studio' as const }] } : {}) }, connection: { status: 'ok' }, strings, onResume: noop, onInterrupt: noop, onRespond: noop, onCopy: noop, chevronIcon: ForwardIcon },
    composer: { composerValue: value, isComposerRestoring: mode === 'restoring', onComposerChange: setValue, onSend: noop, composerSlots: { sendIcon: <Icon icon={SendArrowIcon} size="sm" />, resumeIcon: <Icon icon={PlayGlyph} size="sm" /> } },
  })} /></div>;
}

export const CHAT_CONTROLS_GALLERY: Gallery = {
  id: 'chat-controls', title: 'Project Chat controls', categories: [AGENT_SWITCHING_CATEGORY, REASONING_MENU_CATEGORY,
    { id: 'skills', title: 'Slash-menu skill names', stories: ['default', 'filtered', 'selected', 'no-match', 'empty', 'loading', 'unavailable'].map((mode) => ({ id: `controls-skills-${mode}`, title: mode, render: () => <Skills mode={mode} /> })) },
    ...['resume', 'typed', 'finished', 'running', 'focus', 'resumed', 'restoring'].map((mode) => ({ id: `composer-${mode}`, title: `Composer · ${mode}`, stories: [{ id: `controls-composer-${mode}`, title: mode, render: () => <Composer mode={mode} /> }] })),
    ...['max', 'api-key', 'bedrock', 'custom-endpoint'].map((plan) => ({ id: `billing-${plan}`, title: 'Claude billing', stories: [{ id: `controls-billing-${plan}`, title: plan, render: () => <VStack gap={5} style={{ width: 510 }}><SignInCard state={{ harness: 'claude', state: 'signed-in', plan: claudeBillingLabel(plan, agentSetupStrings()) }} host="dialog" strings={onboardingUiStrings()} glyphs={CARD_GLYPHS} /><SettingsSection label="Default agent"><DefaultAgentRow value="claude" readiness={{ claude: 'ready', codex: 'ready' }} onChange={noop} onSetUp={noop} billingLabel={claudeBillingLabel(plan, agentSetupStrings())} /></SettingsSection></VStack> }] })),
    ...['pending', 'dismissed', 'saving', 'error'].map((mode) => ({ id: `invitation-${mode}`, title: 'Notification invitation', stories: [{ id: `controls-invitation-${mode}`, title: mode, render: () => mode === 'dismissed' ? <DismissedInvitation /> : <div style={{ width: 340 }}><NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'pending' }} onAction={noop} isSaving={mode === 'saving'} {...(mode === 'error' ? { error: 'Could not save this setting. Try again.' } : {})} /></div> }] })),
    ...['pending', 'saving', 'error'].map((mode) => ({ id: `invite-tip-${mode}`, title: 'Notification invite · Left Rail tip', stories: [{ id: `controls-invite-tip-${mode}`, title: mode, render: () => <div style={{ width: 280 }}><InviteTipCard onAction={noop} isSaving={mode === 'saving'} {...(mode === 'error' ? { error: 'Could not save this setting. Try again.' } : {})} /></div> }] })),
    { id: 'invitation-saved', title: 'Notification invitation · saved dismissal', stories: [{ id: 'controls-invitation-saved', title: 'Hidden in a new chat', render: () => <NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'dismissed' }} onAction={noop} /> }] },
    ...['off', 'on', 'unconfirmed', 'failed', 'saving'].map((mode) => ({ id: `notifications-${mode}`, title: 'Notification settings', stories: [{ id: `controls-notifications-${mode}`, title: mode, render: () => <VStack style={{ width: 510 }}><SettingsSection label="Notifications"><NotificationSettingsRow preference={{ ...DEFAULT_NOTIFICATIONS, enabled: mode !== 'off', delivery: mode === 'failed' ? 'failed' : mode === 'unconfirmed' ? 'unconfirmed' : 'delivered' }} onAction={noop} isSaving={mode === 'saving'} /></SettingsSection></VStack> }] })),
    ...(['hover', 'focus'] as const).flatMap((state) => [
      { id: `composer-${state}-button`, title: `Composer button · ${state}`, stories: [{ id: `controls-composer-${state}-button`, title: state, render: () => <ControlState state={state} target='[data-testid="chat-send"]'><Composer mode="resume" /></ControlState> }] },
      { id: `invitation-${state}`, title: `Notification invitation · ${state}`, stories: [{ id: `controls-invitation-${state}`, title: state, render: () => <ControlState state={state} target='[data-testid="notification-enable"]'><div style={{ width: 340 }}><NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'pending' }} onAction={noop} /></div></ControlState> }] },
      { id: `notifications-${state}`, title: `Notification settings · ${state}`, stories: [{ id: `controls-notifications-${state}`, title: state, render: () => <ControlState state={state} target='[data-testid="notification-system-settings"]'><VStack style={{ width: 510 }}><SettingsSection label="Notifications"><NotificationSettingsRow preference={{ ...DEFAULT_NOTIFICATIONS, enabled: true, delivery: 'unconfirmed' }} onAction={noop} /></SettingsSection></VStack></ControlState> }] },
    ]),
    { id: 'new-chat', title: 'New chat confirm', stories: [{ id: 'controls-new-chat', title: 'default', render: () => <div style={{ width: 460 }}><NewChatDialog isOpen isInline onOpenChange={noop} onConfirm={() => Promise.resolve({ accepted: true })} /></div> }] },
    { id: 'billing-menu', title: 'Claude billing · menu', stories: [{ id: 'controls-billing-menu', title: 'open', render: () => <ControlState state="open" target='[data-testid="settings-agent-selector"]'><VStack style={{ width: 510 }}><SettingsSection label="Default agent"><DefaultAgentRow value="claude" readiness={{ claude: 'ready', codex: 'ready' }} onChange={noop} onSetUp={noop} billingLabel={claudeBillingLabel('max', agentSetupStrings())} /></SettingsSection></VStack></ControlState> }] },
    ...(['default', 'hover', 'focus'] as const).map((state) => ({ id: `toast-${state}`, title: `Background toast · ${state}`, stories: [{ id: `controls-toast-${state}`, title: state, render: () => {
      const toast = <Toast type="info" body="Project A finished" isAutoHide={false} autoHideDuration={5000} onDismiss={noop} endContent={<Button label="Open" variant="ghost" size="sm" data-testid="notification-toast-open" onClick={noop} />} />;
      return state === 'default' ? toast : <ControlState state={state} target='[data-testid="notification-toast-open"]'>{toast}</ControlState>;
    } }] })),
  ],
};
