import { useEffect, useRef } from 'react';
import { ChatPanel, type FailureContext } from '@studio/chat-ui';
import { foldSessionState, type HarnessId, type ProviderNotice, type StudioEvent, type RateLimitWindow } from '@studio/events';
import { SignInCard } from '@studio/onboarding-ui';
import { CHAT_FIXTURE_STRINGS } from '../ChatFixture.js';
import { CARD_GLYPHS } from '../../agent-setup/glyphs.js';
import { claudeSetupState } from '../../agents/mapping.js';
import { setupStrings } from '../../agent-setup/SetupDialogHost.js';
import { chatPanelProps } from '../../chat/panelProps.js';
import { failureStrings } from '../../chat/failureStrings.js';
import { planLimits } from '../../chat/limitCopy.js';
import { t } from '@studio/i18n';
import { ForwardIcon } from '../../icons/glyphs.js';
import type { Gallery } from './Showroom.js';
import { ERROR_FAMILY_CATEGORY } from './errorFamily.js';

function resetToday(): Date {
  const reset = new Date();
  reset.setHours(16, 10, 0, 0);
  if (reset.getTime() <= Date.now()) reset.setDate(reset.getDate() + 1);
  return reset;
}

function stamp(events: readonly Record<string, unknown>[], now: number): StudioEvent[] {
  return events.map((event, index) => ({ ...event, sessionId: 'limit-fixture', eventId: `limit-${index}`, seq: index + 1, ts: now })) as StudioEvent[];
}

function chatStrings(harness: HarnessId) {
  const agent = t(harness === 'codex' ? 'agent.name.codex' : 'agent.name.claude');
  const other = t(harness === 'codex' ? 'agent.name.claude' : 'agent.name.codex');
  return { ...CHAT_FIXTURE_STRINGS, errorRetryAction: t('chat.error.retry'), noticeStopAndResend: t('chat.notice.stopAndResend'), failure: failureStrings(agent, other) };
}

function LimitScenario({ variant, harness = 'claude', interaction, expired = false }: {
  variant: 'session' | 'weekly' | 'credits' | 'unknown';
  harness?: HarnessId;
  interaction?: 'focus' | 'open';
  expired?: boolean;
}): React.JSX.Element {
  const now = Date.now();
  const reset = resetToday();
  const windows: RateLimitWindow[] = [
    { kind: harness === 'claude' ? 'five_hour' : 'primary', windowDurationMins: 300, usedPercent: variant === 'session' ? 100 : 32, status: variant === 'session' ? 'rejected' : 'allowed', resetsAt: reset.getTime() / 1000 },
    { kind: harness === 'claude' ? 'seven_day' : 'secondary', windowDurationMins: 10080, usedPercent: variant === 'weekly' ? 100 : 30, status: variant === 'weekly' ? 'rejected' : 'allowed', resetsAt: reset.getTime() / 1000 + 86400 * 3 },
    { kind: 'seven_day_opus', resetsAt: reset.getTime() / 1000 + 86400 * 3 },
  ];
  if (expired) windows.forEach((window) => { window.resetsAt = now / 1000 - 1; });
  const state = foldSessionState(stamp([
    { type: 'usage.limits', windows },
    { type: 'turn.started', turnId: 't1' },
    { type: 'message.user', turnId: 't1', text: 'Build the landing page' },
    { type: 'turn.ended', turnId: 't1' },
    { type: 'session.error', code: variant === 'credits' ? 'billing_error' : 'rate_limited', message: variant === 'credits' ? 'API Error: 402' : 'You have reached a usage limit. Try again later.' },
  ], now));
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ring = container.current?.querySelector<HTMLButtonElement>('[data-testid="chat-usage-meter"]');
    if (interaction === 'focus') ring?.focus();
    if (interaction === 'open') ring?.click();
  }, [interaction]);
  return (
    <div ref={container} data-testid={`limit-scenario-${variant}`} className="astryx-chat-layout" style={{ width: 400, height: 480, border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }}>
      <ChatPanel {...chatPanelProps({
        transcript: {
          state, connection: { status: 'ok', harness },
          onInterrupt: () => undefined, onRespond: () => undefined, onCopy: () => undefined,
          chevronIcon: ForwardIcon, onRetry: () => undefined,
          strings: chatStrings(harness),
        },
        composer: {
          composerValue: '', onComposerChange: () => undefined, onSend: () => undefined,
          usage: { items: state.items, limits: planLimits(state.limits ?? []) },
        },
      })} />
    </div>
  );
}

type FailureId =
  | 'limit-reset'
  | 'limit-weekly'
  | 'limit-no-reset'
  | 'claude-credits-required'
  | 'claude-credits-reset'
  | 'claude-credits-weekly'
  | 'billing'
  | 'sign-in-rejected'
  | 'not-answering'
  | 'service'
  | 'crash'
  | 'limit-set-up-other'
  | 'key-rejected'
  | 'codex-limit'
  | 'codex-usage-unknown'
  | 'codex-usage-weekly'
  | 'codex-rate-limit'
  | 'codex-billing'
  | 'codex-failed';

interface FailureFixture {
  harness: HarnessId;
  other?: { ready: boolean };
  plan?: string;
  windows?: RateLimitWindow[];
  error?: Record<string, unknown>;
  partway?: boolean;
  silentFor?: number;
  signIn?: boolean;
}

function failureFixture(id: FailureId): FailureFixture {
  const reset = resetToday().getTime() / 1000;
  const session: RateLimitWindow = { kind: 'five_hour', windowDurationMins: 300, usedPercent: 100, status: 'rejected', resetsAt: reset };
  switch (id) {
    case 'limit-reset':
      return { harness: 'claude', other: { ready: true }, windows: [session], error: { code: 'rate_limited', message: '' } };
    case 'limit-weekly':
      return { harness: 'claude', other: { ready: true }, windows: [{ kind: 'seven_day', windowDurationMins: 10080, usedPercent: 100, status: 'rejected', resetsAt: reset + 86400 * 2 }], error: { code: 'rate_limited', message: '' } };
    case 'limit-no-reset':
      return { harness: 'claude', other: { ready: true }, error: { code: 'api_error', apiErrorStatus: 429, message: 'API Error: 429' } };
    case 'claude-credits-required':
    case 'claude-credits-reset':
    case 'claude-credits-weekly':
      return { harness: 'claude', other: { ready: true }, windows: id === 'claude-credits-required' ? [] : [{ ...session, ...(id === 'claude-credits-weekly' ? { kind: 'seven_day', windowDurationMins: 10080 } : {}) }], error: { code: 'api_error', apiErrorStatus: 429, message: 'Usage credits are required for long context requests' } };
    case 'billing':
      return { harness: 'claude', plan: 'pro', error: { code: 'billing_error', message: 'API Error: 402' } };
    case 'sign-in-rejected':
      return { harness: 'claude', plan: 'max', signIn: true, error: { code: 'credential_rejected', message: 'API Error: 401' } };
    case 'not-answering':
      return { harness: 'claude', partway: true, silentFor: 40 };
    case 'service':
      return { harness: 'claude', partway: true, error: { code: 'api_error', apiErrorStatus: 529, message: 'API Error: 529' } };
    case 'crash':
      return { harness: 'codex', partway: true, error: { code: 'spawn_failed', message: '' } };
    case 'limit-set-up-other':
      return { harness: 'claude', other: { ready: false }, windows: [session], error: { code: 'rate_limited', message: '' } };
    case 'key-rejected':
      return { harness: 'claude', plan: 'api-key', error: { code: 'credential_rejected', message: 'API Error: 401' } };
    case 'codex-limit':
      return { harness: 'codex', other: { ready: true }, windows: [{ kind: 'primary', windowDurationMins: 300, usedPercent: 100, status: 'rejected', resetsAt: reset }], error: { code: 'rate_limited', message: '' } };
    case 'codex-usage-unknown':
      return { harness: 'codex', other: { ready: true }, error: { code: 'usage_limit_exceeded', message: 'You have hit your usage limit. Check your ChatGPT plan to continue using Codex.' } };
    case 'codex-usage-weekly':
      return { harness: 'codex', other: { ready: true }, windows: [{ kind: 'secondary', windowDurationMins: 10080, usedPercent: 100, resetsAt: reset + 86400 * 2 }], error: { code: 'usage_limit_exceeded', message: 'You have hit your usage limit.' } };
    case 'codex-rate-limit':
      return { harness: 'codex', other: { ready: true }, error: { code: 'rate_limited', message: 'Rate limit reached.' } };
    case 'codex-billing':
      return { harness: 'codex', error: { code: 'billing_error', message: 'insufficient_quota' } };
    case 'codex-failed':
      return { harness: 'codex', other: { ready: true }, error: { code: 'unknown', message: '' } };
  }
}

/** Every account failure the transcript can show, through the real fold and row selector (ONL-2903). */
function FailureScenario({ id }: { id: FailureId }): React.JSX.Element {
  const fixture = failureFixture(id);
  const now = Date.now();
  const events: Record<string, unknown>[] = [
    ...(fixture.windows === undefined ? [] : [{ type: 'usage.limits', windows: fixture.windows }]),
    { type: 'turn.started', turnId: 't1' },
    { type: 'message.user', turnId: 't1', text: 'Make the hero headline warmer' },
    ...(fixture.partway
      ? [
          { type: 'tool.start', toolCallId: 'c1', name: 'Read', kind: 'read', title: 'Read', target: 'src/app/page.tsx', input: { file_path: 'src/app/page.tsx' }, status: 'running' },
          { type: 'tool.end', toolCallId: 'c1', status: 'completed', result: '' },
        ]
      : []),
    ...(fixture.error === undefined ? [] : [{ type: 'session.error', ...fixture.error }, { type: 'turn.ended', turnId: 't1' }]),
  ];
  const folded = foldSessionState(stamp(events, now));
  const state = fixture.silentFor === undefined ? folded : { ...folded, isStreaming: true, silentSince: now - fixture.silentFor * 1000 };
  const agent = t(fixture.harness === 'codex' ? 'agent.name.codex' : 'agent.name.claude');
  const notice: ProviderNotice | undefined = fixture.silentFor === undefined
    ? undefined
    : { state: 'silent', text: t('chat.notice.silent', { agent, seconds: fixture.silentFor }), seconds: fixture.silentFor };
  const context: FailureContext = {
    harness: fixture.harness,
    ...(fixture.plan === undefined ? {} : { plan: fixture.plan }),
    ...(fixture.other === undefined ? {} : { other: fixture.other }),
    hasBillingLink: true,
    now,
  };
  const signInState = claudeSetupState(
    { status: 'verification-failed', detail: 'turn-sign-in-rejected', command: '', plan: 'max', turn: { diagnostic: { kind: 'authentication_failed', status: 401 } } },
    setupStrings().setup,
  ).state;
  return (
    <div data-testid={`failure-scenario-${id}`} className="astryx-chat-layout" style={{ width: 308, height: 612, border: 'var(--border-width) solid var(--color-border)', overflow: 'hidden' }}>
      <ChatPanel {...chatPanelProps({
        transcript: {
          state, connection: fixture.signIn ? { status: 'unauthenticated', harness: 'claude' } : { status: 'ok', harness: fixture.harness },
          onInterrupt: () => undefined, onRespond: () => undefined, onCopy: () => undefined,
          chevronIcon: ForwardIcon, onRetry: () => undefined,
          strings: chatStrings(fixture.harness),
        },
        composer: { composerValue: '', onComposerChange: () => undefined, onSend: () => undefined },
        notices: {
          failureContext: context,
          onSwitchAgent: () => undefined,
          onOpenBilling: () => undefined,
          onStopAndResend: () => undefined,
          notice,
          ...(fixture.signIn
            ? { signIn: { slot: <SignInCard state={signInState} host="chat" strings={setupStrings().ui} glyphs={CARD_GLYPHS} testId="chat-sign-in-card" />, placement: 'transcript' as const } }
            : {}),
        },
      })} />
    </div>
  );
}

const FAILURES: readonly { id: FailureId; title: string }[] = [
  { id: 'limit-reset', title: 'Plan limit, reset known' },
  { id: 'limit-weekly', title: 'Weekly limit' },
  { id: 'limit-no-reset', title: 'Limit, no reset given (HTTP 429)' },
  { id: 'claude-credits-required', title: 'Claude 429, provider reason' },
  { id: 'claude-credits-reset', title: 'Claude 429, reason and reset' },
  { id: 'claude-credits-weekly', title: 'Claude 429, reason and weekly reset' },
  { id: 'billing', title: 'Billing' },
  { id: 'sign-in-rejected', title: 'Sign-in rejected (subscription)' },
  { id: 'not-answering', title: 'Not answering' },
  { id: 'service', title: 'Service error (HTTP 529)' },
  { id: 'crash', title: 'ChatGPT crash' },
  { id: 'limit-set-up-other', title: 'Plan limit, ChatGPT not set up' },
  { id: 'key-rejected', title: 'API key refused' },
  { id: 'codex-limit', title: 'ChatGPT limit, Claude ready' },
  { id: 'codex-usage-unknown', title: 'ChatGPT plan used up, reset unknown' },
  { id: 'codex-usage-weekly', title: 'ChatGPT weekly plan used up' },
  { id: 'codex-rate-limit', title: 'ChatGPT short rate limit' },
  { id: 'codex-billing', title: 'ChatGPT billing' },
  { id: 'codex-failed', title: 'ChatGPT failed with no error' },
];

export const LIMITS_GALLERY: Gallery = {
  id: 'limits', title: 'Usage limits',
  categories: [{ id: 'cards', title: 'The ended turn and plan usage', stories: [
    ...(['credits', 'session', 'weekly', 'unknown'] as const).map((variant) => ({ id: `limits-${variant}`, title: variant, render: () => <LimitScenario variant={variant} /> })),
    { id: 'limits-codex', title: 'ChatGPT session limit', render: () => <LimitScenario variant="session" harness="codex" /> },
    { id: 'limits-focus', title: 'Usage ring focused', render: () => <LimitScenario variant="session" interaction="focus" /> },
    { id: 'limits-open', title: 'Plan usage open', render: () => <LimitScenario variant="session" interaction="open" /> },
    { id: 'limits-expired', title: 'Expired plan windows', render: () => <LimitScenario variant="session" interaction="focus" expired /> },
  ] }, { id: 'failures', title: 'Account failures in the chat', stories: FAILURES.map(({ id, title }) => ({ id: `failure-${id}`, title, render: () => <FailureScenario id={id} /> })) }, ERROR_FAMILY_CATEGORY],
};
