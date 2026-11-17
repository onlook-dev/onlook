import { useLayoutEffect, useRef } from 'react';
import { Toast } from '@astryxdesign/core/Toast';
import { ChatPanel } from '@studio/chat-ui';
import { foldSessionState, type StudioEvent } from '@studio/events';
import { ModelEffortMenu } from '../../chat/ModelEffortMenu.js';
import { composerControls } from '../../chat/composerControls.js';
import { chatPanelProps } from '../../chat/panelProps.js';
import { failureStrings } from '../../chat/failureStrings.js';
import { modelMarkIcon, ForwardIcon } from '../../icons/glyphs.js';
import { t } from '@studio/i18n';
import { CHAT_FIXTURE_STRINGS, FIXTURE_MODELS } from '../ChatFixture.js';
import { noop, type Category } from './Showroom.js';

function AgentMenu({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const controls = composerControls({ harness: 'claude', models: state === 'empty' ? [] : FIXTURE_MODELS, model: 'sonnet', effort: undefined, setModel: noop, setEffort: noop });
  useLayoutEffect(() => {
    if (state === 'default') return;
    root.current?.querySelector<HTMLButtonElement>('button')?.click();
    const frame = requestAnimationFrame(() => {
      const action = document.querySelector<HTMLElement>('[data-testid="chat-switch-agent"]');
      if (state === 'focus') {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        action?.focus();
      }
      if (state === 'hover') action?.setAttribute('data-switch-hover', 'true');
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);
  return <div ref={root} style={{ width: 360, height: state === 'default' ? 100 : 430, padding: 'var(--spacing-4)' }}>
    <style>{'[data-switch-hover="true"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>
    <ModelEffortMenu icon={modelMarkIcon('claude')} label={controls.combinedLabel} size={18} testId="chat-model-effort" modelRows={controls.modelRows} isDisabled={controls.isDisabled}
      agentAction={{ harness: 'codex', ready: state !== 'setup', isDisabled: state === 'busy' || state === 'switching', onClick: noop }} />
  </div>;
}

function ServiceFailure({ state }: { state: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const now = Date.now();
  const events = [
    { type: 'turn.started', turnId: 'turn' },
    { type: 'message.user', turnId: 'turn', text: 'Make the notes easier to scan' },
    { type: 'session.error', code: 'api_error', apiErrorStatus: state === 'overloaded' ? 529 : state === 'unknown' ? undefined : 503, message: '' },
    { type: 'turn.ended', turnId: 'turn' },
  ].map((event, index) => ({ ...event, sessionId: 'switching', eventId: `switch-${index}`, seq: index + 1, ts: now })) as StudioEvent[];
  const folded = foldSessionState(events);
  const items = state === 'no-retry' ? folded.items.map((item) => item.kind === 'error' ? { ...item, retry: undefined } : item) : folded.items;
  useLayoutEffect(() => {
    const action = root.current?.querySelector<HTMLElement>('[data-testid="chat-error-switch-agent"]');
    if (state === 'focus') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      action?.focus();
    }
    if (state === 'hover') action?.setAttribute('data-switch-hover', 'true');
  }, [state]);
  return <div ref={root} className="astryx-chat-layout" style={{ width: 340, height: 430, border: 'var(--border-width) solid var(--color-border)' }}>
    <style>{'[data-switch-hover="true"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }'}</style>
    <ChatPanel {...chatPanelProps({
      transcript: {
        state: { ...folded, items }, connection: { status: 'ok', harness: 'codex' }, onInterrupt: noop, onRespond: noop, onCopy: noop, onRetry: noop, chevronIcon: ForwardIcon,
        strings: { ...CHAT_FIXTURE_STRINGS, failure: failureStrings(t('agent.name.codex'), t('agent.name.claude')) },
      },
      composer: { composerValue: '', onComposerChange: noop, onSend: noop, isAgentSwitching: state === 'switching' },
      notices: { onSwitchAgent: noop, failureContext: { harness: 'codex', hasBillingLink: false, now, ...(state === 'no-alternative' ? {} : { other: { ready: state !== 'setup' } }) } },
    })} />
    {state === 'refused' && <Toast type="info" body={t('chat.agentSwitch.refused')} isAutoHide={false} autoHideDuration={5000} onDismiss={noop} />}
  </div>;
}

export const AGENT_SWITCHING_CATEGORY: Category = {
  id: 'agent-switching', title: 'Switch agents', stories: [
    ...['default', 'open', 'hover', 'focus', 'busy', 'switching', 'empty', 'setup'].map((state) => ({ id: `agent-switch-menu-${state}`, title: `Model menu: ${state}`, wide: true, render: () => <AgentMenu state={state} /> })),
    ...['default', 'hover', 'focus', 'setup', 'switching', 'no-alternative', 'no-retry', 'unknown', 'overloaded', 'refused'].map((state) => ({ id: `agent-switch-service-${state}`, title: `Service error: ${state}`, wide: true, render: () => <ServiceFailure state={state} /> })),
  ],
};
