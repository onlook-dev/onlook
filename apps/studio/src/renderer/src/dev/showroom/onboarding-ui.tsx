import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { NoConnection } from '@studio/chat-ui';
import { CLAUDE_LOGIN_COMMAND, isSetupHarnessId, ROLE_QUESTION, type HarnessId } from '@studio/events';
import {
  CHAT_CARD_STATES,
  CHATGPT_SETUP_STATES,
  CHATGPT_TILE_STATES,
  CLAUDE_SETUP_STATES,
  CLAUDE_TILE_STATES,
  COMING_SOON,
  HarnessTile,
  SetupDialog,
  SignInCard,
  type SetupState,
} from '@studio/onboarding-ui';
import { CHATGPT_SETUP_FIXTURES, CLAUDE_SETUP_FIXTURES, CLAUDE_SETUP_VARIANTS, FIXTURE_EMAIL, claudeTile, codexTile } from '@studio/onboarding-ui/fixtures';
import { ConnectStep, ConnectStepView, type ConnectFacts } from '../../agent-setup/ConnectStep.js';
import { CARD_GLYPHS, TILE_GLYPHS } from '../../agent-setup/glyphs.js';
import { chatGptSetupState, claudeSetupState } from '../../agents/mapping.js';
import { agentSetupStrings } from '../../agent-setup/strings.js';
import type { ClaudeTurnFacts, ClaudeVerificationDetail } from '@studio/events';
import { seedAgentSetupForShowroom } from '../../agent-setup/store.js';
import { onboardingUiStrings } from '../../onboarding/uiStrings.js';
import { FoundUsStep } from '../../onboarding/FoundUsStep.js';
import { RoleStep } from '../../onboarding/RoleStep.js';
import { ImportSourceChooser } from '../../onboarding/ImportSourceChooser.js';
import { GettingStarted } from '../../cloud/GettingStarted.js';
import { LoginAside } from '../../login/LoginAside.js';
import { t } from '@studio/i18n';
import { CHAT_FIXTURE_STRINGS } from '../ChatFixture.js';
import { Panel } from './chat.js';
import { Focused, noop, type Category, type Gallery, type Story } from './Showroom.js';

const STRINGS = onboardingUiStrings();

const BROWSERS = [{ id: 'default', name: 'Safari', isDefault: true }, { id: 'chrome', name: 'Google Chrome', isDefault: false }];

function BrowserSignInStill({ host, mode }: { host: 'chat' | 'dialog'; mode: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const signedOut = CLAUDE_SETUP_FIXTURES['not-signed-in'];
  const state: SetupState = mode === 'unavailable' ? { harness: 'claude', state: 'cannot-connect', detail: '', runtimeUnavailable: true } : signedOut;
  const browsers = mode === 'single' ? BROWSERS.slice(0, 1) : BROWSERS;
  useLayoutEffect(() => {
    const actionId = host === 'chat' ? 'sign-in-action-sign-in' : 'setup-action-sign-in';
    const trigger = root.current?.querySelector<HTMLButtonElement>(`[data-testid="${actionId}"] button[aria-haspopup="menu"]`);
    const targeted = window.location.hash.split(/[/:]/).pop() === `claude-browser-${host}-${mode}`;
    if (mode === 'focus' && targeted) trigger?.focus({ preventScroll: true });
    if (mode === 'open' && targeted) trigger?.click();
  }, [host, mode]);
  return <div ref={root} data-browser-still={mode} style={{ width: host === 'chat' ? 380 : 420, paddingBottom: mode === 'open' ? 120 : 0 }}>
    <style href="browser-sign-in-stills" precedence="medium">{'[data-browser-still="hover"] button[aria-haspopup="menu"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); } [data-browser-still="focus"] button[aria-haspopup="menu"] { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }'}</style>
    {host === 'chat'
      ? <SignInCard state={state} host="chat" strings={STRINGS} glyphs={CARD_GLYPHS} browsers={browsers} onAction={noop} isBusy={mode === 'disabled'} />
      : <SetupDialog state={state} isOpen isInline onOpenChange={noop} strings={STRINGS} glyphs={CARD_GLYPHS} browsers={browsers} onAction={noop} isBusy={mode === 'disabled'} />}
  </div>;
}

const browsers: Category = {
  id: 'browsers',
  title: 'Claude sign-in and bundled runtime recovery',
  stories: [...(['chat', 'dialog'] as const).flatMap((host) => ['default', 'hover', 'focus', 'open', 'single', 'disabled', ...(host === 'dialog' ? ['unavailable'] : [])].map((mode) => ({
    id: `claude-browser-${host}-${mode}`, title: `${host} · ${mode}`, render: () => <BrowserSignInStill host={host} mode={mode} />,
  }))), { id: 'claude-runtime-chat-card', title: 'Project Chat · bundled runtime unavailable', render: () => <div style={{ width: 380 }}><NoConnection connection={{ status: 'cli_missing', harness: 'claude' }} strings={{ ...CHAT_FIXTURE_STRINGS, connectionMissingTitle: STRINGS.runtimeMissingTitle, connectionMissingBody: STRINGS.runtimeMissingBody }} /></div> }],
};


/** The board's tile width; the tile itself is flex 1 0 0 and lets the row decide. */
const TILE_WIDTH = 163;

function TileBox({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <HStack style={{ width: TILE_WIDTH, flex: '0 0 auto' }} vAlign="stretch">
      {children}
    </HStack>
  );
}

const tiles: Category = {
  id: 'tiles',
  title: 'Tiles — idle, then every setup state; the mark follows the legend',
  stories: [
    {
      id: 'onboarding-gallery-tiles-claude',
      title: 'Claude',
      note: 'red · needs you; green · connected; none · idle or informational',
      render: () => (
        <>
          {CLAUDE_TILE_STATES.map((state) => (
            <TileBox key={state}>
              <HarnessTile tile={claudeTile(state)} strings={STRINGS} glyphs={TILE_GLYPHS} onSelect={noop} testId={`onboarding-tile-claude-${state}`} />
            </TileBox>
          ))}
        </>
      ),
    },
    {
      id: 'onboarding-gallery-tiles-codex',
      title: 'ChatGPT',
      note: 'downloading carries the percent on the tile',
      render: () => (
        <>
          {CHATGPT_TILE_STATES.map((state) => (
            <TileBox key={state}>
              <HarnessTile tile={codexTile(state)} strings={STRINGS} glyphs={TILE_GLYPHS} onSelect={noop} testId={`onboarding-tile-codex-${state}`} />
            </TileBox>
          ))}
        </>
      ),
    },
    {
      id: 'onboarding-gallery-tiles-coming-soon',
      title: 'Not yet available',
      note: 'a plain card with a chip, never a disabled button',
      render: () => (
        <>
          {COMING_SOON.map((id) => (
            <TileBox key={id}>
              <HarnessTile tile={{ kind: 'coming-soon', id }} strings={STRINGS} glyphs={TILE_GLYPHS} testId={`onboarding-tile-coming-soon-${id}`} />
            </TileBox>
          ))}
        </>
      ),
    },
  ],
};

function RowStack({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <VStack gap={2} style={{ width: 528 }}>{children}</VStack>;
}

const rows: Category = {
  id: 'rows',
  title: 'Rows — the split connect screen, every state',
  stories: [
    {
      id: 'onboarding-gallery-rows-claude',
      title: 'Claude',
      render: () => (
        <RowStack>
          {CLAUDE_TILE_STATES.map((state) => (
            <HarnessTile key={state} tile={claudeTile(state)} strings={STRINGS} glyphs={TILE_GLYPHS} onSelect={noop} layout="row" testId={`onboarding-row-claude-${state}`} />
          ))}
        </RowStack>
      ),
    },
    {
      id: 'onboarding-gallery-rows-codex',
      title: 'ChatGPT',
      render: () => (
        <RowStack>
          {CHATGPT_TILE_STATES.map((state) => (
            <HarnessTile key={state} tile={codexTile(state)} strings={STRINGS} glyphs={TILE_GLYPHS} onSelect={noop} layout="row" testId={`onboarding-row-codex-${state}`} />
          ))}
        </RowStack>
      ),
    },
    {
      id: 'onboarding-gallery-rows-coming-soon',
      title: 'Not yet available',
      render: () => (
        <RowStack>
          {COMING_SOON.map((id) => (
            <HarnessTile key={id} tile={{ kind: 'coming-soon', id }} strings={STRINGS} glyphs={TILE_GLYPHS} layout="row" testId={`onboarding-row-coming-soon-${id}`} />
          ))}
        </RowStack>
      ),
    },
  ],
};

/** A window-sized box for the full-screen compositions: the shell is 100% of whatever holds it. */
function Window({ children, testId }: { children: React.ReactNode; testId: string }): React.JSX.Element {
  return (
    <VStack width={1024} height={620} style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', overflow: 'hidden' }} data-testid={testId}>
      {children}
    </VStack>
  );
}

const CONNECT_FACTS: Record<'none' | 'both', ConnectFacts> = {
  none: {
    claude: { status: 'idle', command: CLAUDE_LOGIN_COMMAND },
    claudeSettled: undefined,
    codex: { status: 'idle' },
    codexSignInAttempted: false,
    touched: { claude: false, codex: false },
  },
  both: {
    claude: { status: 'signed-in', email: FIXTURE_EMAIL, plan: 'max', command: CLAUDE_LOGIN_COMMAND },
    claudeSettled: undefined,
    codex: { status: 'ready', email: FIXTURE_EMAIL, plan: 'plus' },
    codexSignInAttempted: false,
    touched: { claude: true, codex: true },
  },
};

function ConnectScreen({ facts }: { facts: ConnectFacts }): React.JSX.Element {
  const isConnected = facts.touched.claude || facts.touched.codex;
  return <ConnectStepView facts={facts} isContinueEnabled={isConnected} onTap={noop} onContinue={noop} />;
}

/** Seeded before the step mounts, so the first render is already over the store. */
function LiveConnectStep(): React.JSX.Element {
  useState(() => {
    seedAgentSetupForShowroom({ ...CONNECT_FACTS.both, touched: { claude: false, codex: false } });
    return true;
  });
  return <ConnectStep entryPoint="onboarding" onContinue={noop} />;
}

const connect: Category = {
  id: 'connect',
  title: 'The connect screen — none connected, both connected, then live over the store',
  stories: [
    { id: 'onboarding-gallery-connect-none', title: 'none connected', note: 'inert tiles, Continue disabled', render: () => <Window testId="onboarding-connect-none"><ConnectScreen facts={CONNECT_FACTS.none} /></Window> },
    { id: 'onboarding-gallery-connect-both', title: 'both connected', note: 'green marks, Continue enabled', render: () => <Window testId="onboarding-connect-both"><ConnectScreen facts={CONNECT_FACTS.both} /></Window> },
    {
      id: 'onboarding-gallery-connect-live',
      title: 'live · primed signed-in, nothing tapped',
      note: 'the store holds both connected; no mark and no Continue until a tap, which opens the dialog',
      render: () => <Window testId="onboarding-connect-live"><LiveConnectStep /></Window>,
    },
  ],
};

function inlineDialog(state: SetupState, id: string = state.state, note?: string): Story {
  return {
    id: `onboarding-gallery-dialog-${state.harness}-${id}`,
    title: id,
    ...(note === undefined ? {} : { note }),
    render: () => (
      <SetupDialog state={state} isOpen onOpenChange={noop} onAction={noop} strings={STRINGS} glyphs={CARD_GLYPHS} isInline testId={`onboarding-dialog-${state.harness}-${id}`} />
    ),
  };
}

function ChatGptRecoveryStill({ fallback, mode }: { fallback: boolean; mode: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const action = fallback ? 'check-again' : 'sign-in';
  const state = chatGptSetupState({ status: 'signed-out', message: fallback ? 'ChatGPT sign-in was not completed in time' : 'no account is signed in' }, agentSetupStrings(), { attemptedSignIn: fallback }).state;
  useLayoutEffect(() => {
    if (mode === 'focus') root.current?.querySelector<HTMLElement>(`[data-testid="setup-action-${action}"] button, button[data-testid="setup-action-${action}"]`)?.focus({ preventScroll: true });
  }, [mode, action]);
  return <div ref={root} data-chatgpt-recovery={mode}>
    <style href="chatgpt-recovery-stills" precedence="medium">{'[data-chatgpt-recovery="hover"] [data-testid^="setup-action-"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); } [data-chatgpt-recovery="focus"] button:focus { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }'}</style>
    <SetupDialog state={state} isOpen isInline onOpenChange={noop} onAction={noop} strings={STRINGS} glyphs={CARD_GLYPHS} isBusy={mode === 'disabled'} />
  </div>;
}

const claudeVariants: Story[] = [
  inlineDialog(CLAUDE_SETUP_VARIANTS['paste-code-rejected'], 'paste-code-rejected', 'the refused code stays in the field; the detail says why'),
  inlineDialog(CLAUDE_SETUP_VARIANTS['signed-in-no-email'], 'signed-in-no-email', 'a credential with no cached profile: the bare title'),
  inlineDialog(CLAUDE_SETUP_VARIANTS['fallback-rejected'], 'fallback-rejected', 'the server turned the sign-in away'),
  {
    id: 'onboarding-gallery-dialog-claude-not-signed-in-busy',
    title: 'not-signed-in · busy',
    note: 'a detection in flight: the footer is disabled, never hidden',
    render: () => (
      <SetupDialog state={CLAUDE_SETUP_FIXTURES['not-signed-in']} isOpen onOpenChange={noop} onAction={noop} strings={STRINGS} glyphs={CARD_GLYPHS} isBusy isInline testId="onboarding-dialog-claude-not-signed-in-busy" />
    ),
  },
  {
    id: 'onboarding-gallery-dialog-claude-paste-code-empty',
    title: 'paste-code · nothing pasted',
    note: 'Done is disabled until a code is in the field',
    render: () => (
      <SetupDialog state={{ harness: 'claude', state: 'paste-code' }} isOpen onOpenChange={noop} onAction={noop} strings={STRINGS} glyphs={CARD_GLYPHS} disabledActions={['done']} isInline testId="onboarding-dialog-claude-paste-code-empty" />
    ),
  },
];

/** The one real modal: purpose, backdrop and close are provable only with the dialog element. */
function LiveDialog(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button label="Open the ChatGPT download modal" variant="secondary" onClick={() => setIsOpen(true)} data-testid="onboarding-live-dialog-open" />
      <SetupDialog state={CHATGPT_SETUP_FIXTURES.downloading} isOpen={isOpen} onOpenChange={setIsOpen} onAction={() => setIsOpen(false)} strings={STRINGS} glyphs={CARD_GLYPHS} testId="onboarding-live-dialog" />
    </>
  );
}

const dialogs: Category = {
  id: 'dialogs',
  title: 'Setup dialogs — every Claude and ChatGPT state, inline; one live',
  stories: [
    ...CLAUDE_SETUP_STATES.map((id) => inlineDialog(CLAUDE_SETUP_FIXTURES[id])),
    ...claudeVariants,
    ...CHATGPT_SETUP_STATES.map((id) => inlineDialog(CHATGPT_SETUP_FIXTURES[id])),
    ...[true, false].flatMap(fallback => ['default', 'hover', 'focus', 'disabled'].map(mode => ({
      id: `chatgpt-recovery-${fallback ? 'fallback' : 'signed-out'}-${mode}`,
      title: `ChatGPT ${fallback ? 'fallback' : 'signed out'} · ${mode}`,
      render: () => <ChatGptRecoveryStill fallback={fallback} mode={mode} />,
    }))),
    { id: 'onboarding-gallery-dialogs-live', title: 'live modal', note: 'the real Dialog: backdrop, Escape, close', render: () => <LiveDialog /> },
  ],
};

function chatStory(harness: HarnessId, label: string, id: string, state: SetupState): Story {
  return {
    id: `onboarding-gallery-chat-${harness}-${id}`,
    title: `${label} · ${id}`,
    render: () => (
      <Panel>
        <SignInCard state={state} host="chat" strings={STRINGS} glyphs={CARD_GLYPHS} onAction={noop} testId={`onboarding-chat-${harness}-${id}`} />
      </Panel>
    ),
  };
}

function chatStories(harness: HarnessId, label: string, fixtures: Record<string, SetupState>): Story[] {
  // The chat sign-in card exists for the two agents Onlook signs in for.
  if (!isSetupHarnessId(harness)) return [];
  return CHAT_CARD_STATES[harness].map((id) => chatStory(harness, label, id, fixtures[id]!));
}

const chat: Category = {
  id: 'chat',
  title: 'The sign-in card in the chat — the transcript skin (ONL-2187)',
  stories: [
    ...chatStories('claude', 'Claude', CLAUDE_SETUP_FIXTURES),
    chatStory('claude', 'Claude', 'paste-code-rejected', CLAUDE_SETUP_VARIANTS['paste-code-rejected']),
    chatStory('claude', 'Claude', 'signed-in-no-email', CLAUDE_SETUP_VARIANTS['signed-in-no-email']),
    ...chatStories('codex', 'ChatGPT', CHATGPT_SETUP_FIXTURES),
  ],
};

type FailedSheetId = 'A' | 'A2' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'G-silent' | 'chatgpt-failed';

/** A failed check as main reports it, mapped through the real sheet mapping (ONL-2903). */
function failedSheet(id: FailedSheetId): SetupState {
  const strings = agentSetupStrings();
  const claude = (detail: ClaudeVerificationDetail, turn: ClaudeTurnFacts = {}): SetupState =>
    claudeSetupState({ status: 'verification-failed', command: CLAUDE_LOGIN_COMMAND, plan: 'max', detail, turn }, strings, { otherReady: false }).state;
  const thursday = new Date();
  thursday.setDate(thursday.getDate() + ((4 - thursday.getDay() + 7) % 7 || 7));
  thursday.setHours(9, 0, 0, 0);
  switch (id) {
    case 'A':
      return claude('turn-usage-limit', { limit: { window: 'unknown' } });
    case 'A2':
      return claude('turn-usage-limit', { limit: { window: 'weekly', resetsAt: thursday.getTime() / 1000 } });
    case 'B':
      return claude('turn-rate-limited', { diagnostic: { kind: 'rate_limit', status: 429 } });
    case 'C':
      return claude('turn-billing', { diagnostic: { kind: 'billing_error' } });
    case 'D':
      return claude('turn-sign-in-rejected', { diagnostic: { kind: 'authentication_failed', status: 401 } });
    case 'E':
      return claude('turn-no-answer');
    case 'F':
      return claude('turn-service-error', { diagnostic: { kind: 'overloaded', status: 529 } });
    case 'G':
      return claude('turn-agent-error', { sentence: 'API Error: Your organization has disabled Claude Code access.' });
    case 'G-silent':
      return claude('turn-agent-error');
    case 'chatgpt-failed':
      return chatGptSetupState({ status: 'failed', message: CODEX_FAILED_MESSAGE }, strings, { otherReady: false }).state;
  }
}

const CODEX_FAILED_MESSAGE = 'Could not read codex release metadata.';

const FAILED_SHEETS: readonly { id: FailedSheetId; title: string }[] = [
  { id: 'A', title: 'A · plan limit' },
  { id: 'A2', title: 'A2 · plan limit, reset read' },
  { id: 'B', title: 'B · too many requests' },
  { id: 'C', title: 'C · billing' },
  { id: 'D', title: 'D · sign-in rejected' },
  { id: 'E', title: 'E · not answering' },
  { id: 'F', title: 'F · service error' },
  { id: 'G', title: 'G · error Onlook can’t place' },
  { id: 'G-silent', title: 'G · error with nothing said' },
  { id: 'chatgpt-failed', title: 'ChatGPT setup failed · Use Claude instead' },
];

const failedChecks: Category = {
  id: 'failed-checks',
  title: 'Account failures at setup — one sheet per cause (ONL-2903)',
  stories: FAILED_SHEETS.map(({ id, title }) => ({
    id: `setup-failed-${id}`,
    title,
    render: () => (
      <div data-testid={`setup-failed-${id}`} style={{ width: 440 }}>
        <SetupDialog state={failedSheet(id)} isOpen isInline onOpenChange={noop} strings={STRINGS} glyphs={CARD_GLYPHS} onAction={noop} disabledActions={id === 'A2' ? ['check-again'] : []} />
      </div>
    ),
  })),
};

const failedCheckAliases: Category = {
  id: 'failed-check-aliases',
  title: failedChecks.title,
  stories: failedChecks.stories.flatMap((story) => story.id === story.id.toLowerCase() ? [] : [{ ...story, id: story.id.toLowerCase() }]),
};

function FirstRunStill({ surface, state, isolated }: { surface: 'login' | 'role' | 'survey' | 'agents' | 'import'; state: string; isolated: boolean }): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = container.current;
    if (node === null) return;
    if (surface === 'survey' && state !== 'default') {
      const label = t(state === 'other' ? 'onboarding.found.other' : 'onboarding.found.friend');
      [...node.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === label)?.click();
    }
    if (state.endsWith('focus')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      const frame = requestAnimationFrame(() => { node.querySelector<HTMLElement>(state === 'email-focus' ? '[data-testid="account-continue-email"]' : 'button:not(:disabled)')?.focus(); });
      return () => cancelAnimationFrame(frame);
    }
  }, [surface, state]);
  const aside = <LoginAside />;
  return <div ref={container} data-first-run-state={state} style={isolated ? { position: 'fixed', inset: 0, zIndex: 2 } : { width: 960, height: 600 }}>
    {/* A card wears its hover on its own `::after`, where a button takes it on its ground. */}
    <style>{'[data-first-run-state="hover"] button:not(:disabled){background-image:linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))}[data-first-run-state="hover"] [data-testid="add-codebase"]::after{background-color:var(--color-overlay-hover)!important}[data-first-run-state="email-hover"] .hosted-email-sign-in{color:var(--color-text-primary)!important;filter:brightness(0.9)}'}</style>
    {surface === 'login' ? <GettingStarted aside={aside} onSignIn={noop} onCancel={noop} {...(state === 'pending' ? { busy: 'google', step: 'browser' } as const : {})} {...(state === 'email-pending' ? { busy: 'email' } as const : {})} {...(state === 'error' ? { error: 'failed' } as const : {})} />
      : surface === 'role' ? <RoleStep aside={aside} onContinue={noop} {...(state === 'selected' ? { initial: { question: ROLE_QUESTION, answer: 'designer' } } : state === 'other' ? { initial: { question: ROLE_QUESTION, answer: 'other' } } : {})} />
      : surface === 'survey' ? <FoundUsStep aside={aside} onContinue={noop} onBack={noop} />
      : surface === 'agents' ? <ConnectStepView aside={aside} facts={CONNECT_FACTS[state === 'selected' ? 'both' : 'none']} isContinueEnabled={state === 'selected'} onTap={noop} onContinue={noop} {...(state === 'selected' ? { preferred: 'codex', onMakePreferred: noop } as const : {})} />
      : state === 'switching' ? <ImportSourceChooser onPick={noop} onBack={noop} />
      : <ImportSourceChooser aside={aside} onPick={noop} onBack={noop} onCreateBlank={noop} onOpen={noop} />}
  </div>;
}

const firstRun: Category = {
  id: 'first-run',
  title: 'First-run screens and interaction states',
  stories: ([
    ['login', ['default', 'hover', 'focus', 'email-focus', 'email-hover', 'email-pending', 'pending', 'error']],
    ['role', ['default', 'selected', 'other']],
    ['survey', ['default', 'selected', 'other', 'hover', 'focus']],
    ['agents', ['default', 'selected', 'hover', 'focus']],
    /* `switching` is the same step inside a project, where only a codebase is on offer. */
    ['import', ['default', 'hover', 'focus', 'switching']],
  ] as const).flatMap(([surface, states]) => states.map((state) => ({
    id: `first-run-${surface}-${state}`, title: `${surface} · ${state}`, wide: true,
    render: (context) => <FirstRunStill surface={surface} state={state} isolated={context?.isIsolated === true} />,
  }))),
};

function ChatGptStartupStill({ failure, mode }: { failure: 'home' | 'exited' | 'crashed' | 'connection' | 'timeout'; mode: 'default' | 'hover' | 'focus' }): React.JSX.Element {
  const message = t(`onboarding.setup.codex.detail.${failure}`);
  const state = chatGptSetupState({ status: failure === 'crashed' ? 'broken' : 'failed', message }, agentSetupStrings(), { otherReady: false }).state;
  const action = failure === 'crashed' ? 'download-again' : 'try-again';
  return <div style={{ width: 440 }}><Focused selector={mode === 'default' ? undefined : `[data-testid="setup-action-${action}"]`} hover={mode === 'hover'}>
    <SetupDialog state={state} isOpen isInline onOpenChange={noop} strings={STRINGS} glyphs={CARD_GLYPHS} onAction={noop} />
  </Focused></div>;
}

const chatGptStartup: Category = {
  id: 'chatgpt-startup',
  title: 'ChatGPT startup recovery',
  stories: (['home', 'exited', 'crashed', 'connection', 'timeout'] as const).flatMap(failure => (['default', 'hover', 'focus'] as const).map(mode => ({
    id: `chatgpt-startup-${failure}-${mode}`,
    title: `${failure} · ${mode}`,
    render: () => <ChatGptStartupStill failure={failure} mode={mode} />,
  }))),
};

export const ONBOARDING_UI_GALLERY: Gallery = {
  id: 'onboarding-ui',
  title: 'Onboarding',
  subtitle: 'packages/onboarding-ui on the board’s fixtures; strings through the catalog',
  categories: [firstRun, rows, tiles, connect, dialogs, chat, browsers, failedChecks, failedCheckAliases, chatGptStartup],
};
