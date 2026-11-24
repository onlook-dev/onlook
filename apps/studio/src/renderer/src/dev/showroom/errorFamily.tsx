import { useState } from 'react';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack } from '@astryxdesign/core/Layout';
import { ChatPanel, type ChatStrings } from '@studio/chat-ui';
import { CLAUDE_LOGIN_COMMAND, emptyState, SUGGEST_NEXT_TASKS_TOOL, type AgentConnection, type HarnessId, type SessionState, type ToolCallView, type TranscriptItem } from '@studio/events';
import { canStartSignIn, SignInNotice, type SetupState } from '@studio/onboarding-ui';
import { CARD_GLYPHS } from '../../agent-setup/glyphs.js';
import { failureStrings } from '../../chat/failureStrings.js';
import { onboardingUiStrings } from '../../onboarding/uiStrings.js';
import { CHAT_FIXTURE_STRINGS, FIXTURE_MODELS, tool } from '../ChatFixture.js';
import { ChatPanelFrame } from '../../chat/ChatPanelFrame.js';
import { composerControls, permissionModeControls } from '../../chat/composerControls.js';
import { chatPanelProps, modelMenuFooter } from '../../chat/panelProps.js';
import { providerNotice, RETRY_NOTICE_MS } from '../../chat/providerNotice.js';
import { t } from '@studio/i18n';
import { CopyIcon, ElementPickerIcon, ForwardIcon, PlusIcon, ReloadIcon, SendArrowIcon } from '../../icons/glyphs.js';
import { REGION } from '../../layout.js';
import { MENU_SURFACE } from '../../menu/surface.js';
import { noop, type Gallery } from './Showroom.js';

type Moment =
  | 'retrying' | 'retry-cleared' | 'gave-up' | 'stopped-partway' | 'cards-then-529' | 'usage-limit' | 'usage-limit-not-now' | 'weekly-limit' | 'billing'
  | 'limit-unknown' | 'codex-limit' | 'weekly-no-switch' | 'too-many' | 'failed-silent' | 'key-refused' | 'cut-off' | 'crash' | 'crash-later'
  | 'sign-in' | 'sign-in-not-now' | 'signing-in' | 'sign-in-paste-code' | 'sign-in-cannot-connect' | 'sign-in-fallback' | 'sign-in-no-turn';

const SIGN_IN: Partial<Record<Moment, SetupState>> = {
  'sign-in': { harness: 'claude', state: 'not-signed-in' },
  'sign-in-not-now': { harness: 'claude', state: 'not-signed-in' },
  'signing-in': { harness: 'claude', state: 'signing-in' },
  'sign-in-paste-code': { harness: 'claude', state: 'paste-code' },
  'sign-in-cannot-connect': { harness: 'claude', state: 'cannot-connect', detail: 'API Error: Connection error.' },
  'sign-in-fallback': { harness: 'claude', state: 'fallback', command: CLAUDE_LOGIN_COMMAND, detail: t('onboarding.setup.claude.detail.exited') },
  'sign-in-no-turn': { harness: 'claude', state: 'not-signed-in' },
};

const ASK = 'Make the Order ahead button stand out more.';
const STRINGS: ChatStrings = { ...CHAT_FIXTURE_STRINGS, composerPlaceholder: t('chat.composer.placeholder') };
const MODELS = composerControls({ harness: 'claude', models: FIXTURE_MODELS, model: 'opus', effort: 'medium', setModel: noop, setEffort: noop });
const MODE = permissionModeControls({ mode: 'auto', offered: ['default', 'acceptEdits', 'auto'], setMode: noop });

const read = (id: string, file: string): ToolCallView => tool(id, 'read', 'Read', file, 'completed');
const edit = (id: string, file: string): ToolCallView => tool(id, 'edit', 'Edit', file, 'completed');
const offer: ToolCallView = { ...tool('n1', 'other', SUGGEST_NEXT_TASKS_TOOL, '', 'completed'), name: SUGGEST_NEXT_TASKS_TOOL, input: { tasks: ['Rewrite the subhead to match', 'Show the page on mobile', 'Try two versions of the hero'] } };
const overloaded = (id: string): TranscriptItem => ({ kind: 'error', id, message: 'API Error: 529', code: 'api_error', apiErrorStatus: 529, retry: { text: ASK } });

const COLOUR = { question: 'Which brown should the button use?', header: 'Colour', multiSelect: false, options: [{ label: 'Crust', description: '' }, { label: 'Espresso', description: '' }] };
const ANSWERED: ToolCallView = { ...tool('q1', 'other', 'AskUserQuestion', '', 'completed'), answeredQuestions: { questions: [COLOUR], answers: { [COLOUR.question]: 'Crust' } } };
const limited = (now: number, window: 'session' | 'weekly'): TranscriptItem => ({
  kind: 'error', id: 'x1', message: '', code: 'rate_limited', limit: { window, resetsAt: Math.floor(now / 1000) + (window === 'session' ? 2 * 3600 + 14 * 60 : 3 * 86_400) }, retry: { text: ASK },
});

const ASKED: TranscriptItem = { kind: 'user', id: 'u1', text: ASK };
const AUTH_ITEMS: TranscriptItem[] = [
  { kind: 'user', id: 'u1', text: 'Make the headline warmer.' },
  { kind: 'tools', id: 't0', calls: [read('q1', 'Hero.tsx'), edit('q2', 'Hero.tsx')] },
  { kind: 'assistant-text', id: 'a0', text: 'The headline now reads **Bread worth waking up for**.', isStreaming: false, durationMs: 14_200 },
  { kind: 'user', id: 'u2', text: 'Swap the hero photo for the one in /public/storefront.jpg.' },
  { kind: 'assistant-text', id: 'a1', text: 'I’ll find where the hero image is set and point it at the new file.', isStreaming: false },
  { kind: 'tools', id: 't1', calls: [tool('g1', 'search', 'Grep', 'hero.*\\.jpg', 'completed'), read('r1', 'Hero.tsx')] },
];
const crashed: TranscriptItem = { kind: 'error', id: 'x1', message: '', code: 'spawn_failed', retry: { text: ASK } };
const READS: TranscriptItem = { kind: 'tools', id: 't1', calls: [read('r1', 'OrderButton.tsx'), read('r2', 'tokens.css')] };
const EDITED: TranscriptItem = { kind: 'tools', id: 't1', calls: [read('r1', 'OrderButton.tsx'), read('r2', 'tokens.css'), edit('e1', 'OrderButton.tsx')] };

function moment(which: Moment, now: number): SessionState {
  const ended = (items: TranscriptItem[]): SessionState => ({ ...emptyState, items, isStreaming: false });
  switch (which) {
    case 'retrying':
      return { ...emptyState, items: [ASKED, READS], isStreaming: true, turnStartedAt: now - 27_000, retrying: { attempt: 3, status: 529 }, retryingSince: now - RETRY_NOTICE_MS - 5_000 };
    case 'retry-cleared':
      return { ...emptyState, items: [ASKED, READS], isStreaming: true, turnStartedAt: now - 41_000 };
    case 'gave-up':
      return ended([ASKED, READS, overloaded('x1')]);
    case 'stopped-partway':
      return ended([ASKED, EDITED, overloaded('x1')]);
    case 'cards-then-529':
      return ended([
          ASKED,
          { kind: 'tools', id: 't1', calls: [read('r1', 'OrderButton.tsx'), read('r2', 'tokens.css'), edit('e1', 'OrderButton.tsx')] },
          { kind: 'assistant-text', id: 'a1', text: 'The Order ahead button is now solid crust brown with white type, so it’s the first thing you see on Home.', isStreaming: false, durationMs: 23_700 },
          { kind: 'tools', id: 't2', calls: [offer] },
          overloaded('x1'),
        ]);
    case 'usage-limit':
    case 'usage-limit-not-now':
      return ended([
        ASKED,
        { kind: 'tools', id: 't1', calls: [read('r1', 'OrderButton.tsx'), ANSWERED] },
        { kind: 'tools', id: 't2', calls: [edit('e1', 'OrderButton.tsx'), tool('c1', 'other', 'mcp__studio__capture_frame', 'capture_frame', 'completed')] },
        limited(now, 'session'),
      ]);
    case 'weekly-limit':
      return ended([ASKED, READS, limited(now, 'weekly')]);
    case 'billing':
      return ended([ASKED, READS, { kind: 'error', id: 'x1', message: '', code: 'billing_error', retry: { text: ASK } }]);
    case 'limit-unknown':
      return ended([ASKED, READS, { kind: 'error', id: 'x1', message: '', code: 'usage_limit_exceeded', retry: { text: ASK } }]);
    case 'codex-limit':
      return { ...ended([ASKED, READS, limited(now, 'session')]), harnessId: 'codex' };
    case 'weekly-no-switch':
      return ended([ASKED, READS, limited(now, 'weekly')]);
    case 'too-many':
      return ended([ASKED, READS, { kind: 'error', id: 'x1', message: 'API Error: 429', code: 'api_error', apiErrorStatus: 429, retry: { text: ASK } }]);
    case 'failed-silent':
      return ended([ASKED, READS, { kind: 'error', id: 'x1', message: '', code: 'unknown', retry: { text: ASK } }]);
    case 'key-refused':
      return ended([ASKED, READS, { kind: 'error', id: 'x1', message: '', code: 'credential_rejected', retry: { text: ASK } }]);
    case 'cut-off':
      return ended([ASKED, READS, { kind: 'error', id: 'x1', message: 'The connection closed before the reply finished.', code: 'unknown', retry: { text: ASK } }]);
    case 'crash':
      return ended([ASKED, READS, crashed]);
    case 'crash-later':
      return ended([ASKED, READS, crashed, { kind: 'user', id: 'u2', text: 'Try the hero next.' }, { kind: 'assistant-text', id: 'a2', text: 'The hero now leads with the bread photo.', isStreaming: false, durationMs: 9_400 }]);
    case 'sign-in-no-turn':
      return ended(AUTH_ITEMS.slice(0, 3));
    case 'sign-in':
    case 'sign-in-not-now':
    case 'signing-in':
    case 'sign-in-paste-code':
    case 'sign-in-cannot-connect':
    case 'sign-in-fallback':
      return { ...ended(AUTH_ITEMS), failedTurn: { turnId: 'turn-2', code: 'unauthenticated' } };
  }
}

function ComposerActions(): React.JSX.Element {
  return (
    <HStack gap={0.5} vAlign="center">
      <IconButton label={t('chat.element.pick')} icon={<Icon icon={ElementPickerIcon} color="inherit" style={{ width: 18, height: 18 }} />} variant="ghost" size="md" onClick={noop} />
      <DropdownMenu
        hasChevron={false}
        placement="above"
        style={MENU_SURFACE}
        button={{ label: t('chat.composer.add'), variant: 'ghost', size: 'md', isIconOnly: true, icon: <Icon icon={PlusIcon} color="inherit" style={{ width: 18, height: 18 }} /> }}
      >
        <DropdownMenuItem label={t('chat.composer.addFiles')} onClick={noop} />
      </DropdownMenu>
    </HStack>
  );
}

/** The Right Rail as ChatRegion composes it, on one moment of a failing turn (ONL-2973). */
function ErrorFamilyRail({ which, width = REGION.end, hasBrowserChoices = false, isBusy = false }: { which: Moment; width?: number; hasBrowserChoices?: boolean; isBusy?: boolean }): React.JSX.Element {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set(which === 'usage-limit-not-now' ? ['x1'] : []));
  const [isSetAside, setSetAside] = useState(which === 'sign-in-not-now');
  const now = Date.now();
  const state = moment(which, now);
  const harness: HarnessId = state.harnessId ?? 'claude';
  const strings: ChatStrings = harness === 'codex' ? { ...STRINGS, failure: failureStrings(t('agent.name.codex'), t('agent.name.claude')) } : STRINGS;
  const notice = providerNotice(state, now, t(harness === 'codex' ? 'agent.name.codex' : 'agent.name.claude'));
  const signIn = SIGN_IN[which];
  const failedTurn = state.failedTurn !== undefined;
  const connection: AgentConnection = signIn === undefined ? { status: 'ok', harness } : { status: 'unauthenticated', harness: 'claude' };
  const ui = onboardingUiStrings();
  const signInSlot = signIn === undefined ? undefined
    : <SignInNotice state={signIn} strings={ui} glyphs={CARD_GLYPHS} onAction={noop} isBusy={isBusy} {...(hasBrowserChoices ? { browsers: [{ id: 'preview', name: 'Chromium Developer Preview', isDefault: true }, { id: 'safari', name: 'Safari', isDefault: false }] } : {})} {...(failedTurn ? { onNotNow: () => setSetAside(true) } : {})} />;
  const pending = signIn?.state === 'signing-in' ? t('onboarding.setup.claude.signingIn.title') : undefined;
  return (
    <div
      data-testid="error-family-rail"
      style={{ width, height: 640, display: 'flex', background: 'var(--studio-ground)', position: 'relative' }}
    >
      <ChatPanelFrame harness={harness} onNewChat={noop}>
        <ChatPanel {...chatPanelProps({
          transcript: {
            state,
            connection,
            strings,
            onInterrupt: noop,
            onRespond: noop,
            onCopy: noop,
            onRetry: noop,
            onContinue: noop,
            onNextTask: noop,
            chevronIcon: ForwardIcon,
            copyIcon: <Icon icon={CopyIcon} size="sm" color="inherit" />,
            retryIcon: <Icon icon={ReloadIcon} size="sm" color="inherit" />,
          },
          composer: {
            composerValue: '',
            onComposerChange: noop,
            onSend: noop,
            permission: { control: MODE },
            usage: { items: state.items },
            composerSlots: {
              footer: modelMenuFooter({ harness, controls: { ...MODELS, isDisabled: false } }),
              actions: <ComposerActions />,
              sendIcon: <Icon icon={SendArrowIcon} />,
            },
          },
          notices: {
            notice,
            signIn: { slot: signInSlot, placement: failedTurn ? 'transcript' : 'band' },
            signInLine: signIn !== undefined && failedTurn ? { onSignIn: noop, isRejected: false, isDisabled: !canStartSignIn(signIn), ...(pending === undefined ? {} : { pending }) } : undefined,
            isSignInSetAside: isSetAside && signIn !== undefined && (signIn.state === 'not-signed-in' || signIn.state === 'signing-in'),
            onSwitchAgent: noop,
            onOpenBilling: noop,
            onStopAndResend: noop,
            dismissedNotices: dismissed,
            onDismissNotice: (id) => setDismissed((was) => new Set(was).add(id)),
            failureContext: { harness, plan: which === 'key-refused' ? 'api-key' : 'max', ...(which === 'weekly-no-switch' ? {} : { other: { ready: which === 'codex-limit' } }), hasBillingLink: true, now },
          },
        })} />
      </ChatPanelFrame>
    </div>
  );
}

const MOMENTS: readonly { id: Moment; title: string }[] = [
  { id: 'retrying', title: 'Retrying (529)' },
  { id: 'retry-cleared', title: 'Retry cleared, clock back' },
  { id: 'gave-up', title: 'Retries gave up' },
  { id: 'stopped-partway', title: 'Stopped partway' },
  { id: 'cards-then-529', title: 'Next steps, then a 529' },
  { id: 'usage-limit', title: 'Usage limit' },
  { id: 'usage-limit-not-now', title: 'Usage limit, after Not now' },
  { id: 'weekly-limit', title: 'Weekly limit' },
  { id: 'billing', title: 'Billing' },
  { id: 'limit-unknown', title: 'Usage limit, no reset time' },
  { id: 'codex-limit', title: 'ChatGPT usage limit' },
  { id: 'weekly-no-switch', title: 'Weekly limit, no other agent' },
  { id: 'too-many', title: 'Too many requests (429)' },
  { id: 'failed-silent', title: 'Ended with no reason' },
  { id: 'key-refused', title: 'API key refused' },
  { id: 'cut-off', title: 'Reply cut off' },
  { id: 'crash', title: 'Claude stopped unexpectedly' },
  { id: 'crash-later', title: 'Crash, then a later turn' },
  { id: 'sign-in', title: 'Signed out mid-turn' },
  { id: 'sign-in-not-now', title: 'Signed out, after Not now' },
  { id: 'signing-in', title: 'Signing in' },
  { id: 'sign-in-paste-code', title: 'Signing in, paste the code' },
  { id: 'sign-in-cannot-connect', title: 'Signing in, Claude unreachable' },
  { id: 'sign-in-fallback', title: 'Sign-in fell back to the Terminal' },
  { id: 'sign-in-no-turn', title: 'Signed out, no failed turn' },
];

export const ERROR_FAMILY_CATEGORY: Gallery['categories'][number] = {
  id: 'error-family',
  title: 'A failing turn, as one line',
  stories: [
    ...MOMENTS.map(({ id, title }) => ({ id: `error-family-${id}`, title, render: () => <ErrorFamilyRail which={id} /> })),
    ...[320, 480, 800].flatMap((width) => [
      { id: `error-family-sign-in-${width}`, title: `Sign-in with browser choices at ${width}px`, render: () => <ErrorFamilyRail which="sign-in" width={width} hasBrowserChoices /> },
      ...(['signing-in', 'sign-in-paste-code', 'sign-in-cannot-connect', 'sign-in-fallback', 'sign-in-not-now'] as const).map((which) => ({ id: `error-family-${which}-${width}`, title: `${which} at ${width}px`, render: () => <ErrorFamilyRail which={which} width={width} hasBrowserChoices /> })),
    ]),
    { id: 'error-family-sign-in-busy-320', title: 'Sign-in busy with browser choices', render: () => <ErrorFamilyRail which="sign-in" width={320} hasBrowserChoices isBusy /> },
  ],
};
