import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyState, PROJECT_SETUP_REPAIR_PROMPT, SETUP_REPAIR_CONTEXT_OPENING, SUGGEST_NEXT_TASKS_TOOL, type TranscriptItem } from '@studio/events';
import { VStack } from '@astryxdesign/core/Layout';
import { ChatPanel, type ChatPanelProps } from './ChatPanel.js';
import type { ChatStrings } from './strings.js';
import { TOOL_LINE_IDS, type ToolLineStrings } from './tool-rows/lines.js';

const strings = {
  responseCopyLabel: 'Copy',
  errorRetryAction: 'Retry',
  responseDuration: '{seconds}s',
  responseDurationLong: '{minutes}m {seconds}s',
  composerPlaceholder: 'Ask',
  composerPlaceholderQuestion: 'Answer',
  newMessages: 'New messages',
  scrollToBottom: 'Scroll to bottom',
  questionSheet: { next: 'Next', send: 'Send', dismiss: 'Dismiss', goToQuestion: 'Question {n}', step: '{at} of {total}', ownWords: 'Own words', dismissedOne: 'Question dismissed', dismissedMany: 'Questions dismissed' },
} as ChatStrings;

function render(items: TranscriptItem[], isStreaming = false, notificationSlot?: React.ReactNode): string {
  return renderToStaticMarkup(<ChatPanel state={{ ...emptyState, items, isStreaming }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}} chevronIcon={() => <span />} {...(notificationSlot ? { notificationSlot } : {})} />);
}

describe('chat scroll control wiring', () => {
  /* A server render always follows the bottom, so isVisible is false here and the glyph cannot be
     observed: ChatScrollButton.test.tsx carries the streaming cases (ONL-2578). */
  it('keeps the scroll action mounted for a nonempty chat', () => {
    const html = render([{ kind: 'user', id: 'scroll-user', text: 'Earlier message' }]);
    expect(html).toContain('data-testid="chat-scroll-button"');
    expect(html).toContain('aria-label="Scroll to bottom"');
    expect(html).toContain('data-visible="false"');
  });

  it('omits the control for an empty chat', () => {
    expect(render([])).not.toContain('data-testid="chat-scroll-button"');
  });
});

describe('chat message actions', () => {
  const items: TranscriptItem[] = [
    { kind: 'user', id: 'user-one', text: 'First prompt', context: 'first frame' },
    { kind: 'assistant-text', id: 'reply-one', text: 'First reply', isStreaming: false, durationMs: 1000 },
    { kind: 'user', id: 'user-two', text: 'Second prompt' },
    { kind: 'assistant-text', id: 'reply-two', text: '```js\nconst value = 42;\n```', isStreaming: false },
  ];

  it('keeps user hover Retry and response copy without a bottom-of-turn Retry', () => {
    const markup = render(items);
    expect(markup.match(/data-testid="chat-user-actions"/g)).toHaveLength(2);
    expect(markup.match(/data-testid="chat-user-retry"/g)).toHaveLength(2);
    expect(markup).not.toContain('data-testid="chat-response-retry"');
    expect(markup.match(/data-testid="chat-response-meta"[\s\S]*?data-testid="chat-response-copy"/g)).toHaveLength(2);
    expect(markup.match(/data-testid="chat-response-meta"/g)).toHaveLength(2);
    expect(markup).toContain('1s');
    expect(markup).toContain('const');
    expect(markup).not.toContain('<fieldset disabled=""');
  });

  it('leaves Studio’s own opening prompt without actions, so its words are never re-sent as the designer’s', () => {
    const markup = render([
      { kind: 'user', id: 'studio', origin: 'studio', text: 'Set the project up' },
      { kind: 'assistant-text', id: 'reply', text: 'Ready', isStreaming: false },
    ]);
    expect(markup).toContain('Set the project up');
    expect(markup).not.toContain('data-testid="chat-user-actions"');
    expect(markup).not.toContain('data-testid="chat-response-retry"');
  });

  it('disables user, response, and raw-code actions while the turn runs', () => {
    const markup = render(items, true);
    for (const testId of ['chat-user-retry', 'chat-response-copy']) {
      const matches = [...markup.matchAll(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`, 'g'))];
      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) expect(match[0]).toContain('disabled');
    }
    expect(markup).toContain('<fieldset disabled=""');
  });

  it('uses the host Resume glyph for an interrupted turn', () => {
    const markup = renderToStaticMarkup(<ChatPanel state={{ ...emptyState, interrupted: true }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onResume={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} composerSlots={{ resumeIcon: <span data-testid="host-play-icon" /> }} />);
    expect(markup).toContain('data-testid="host-play-icon"');
    expect(markup).not.toContain('M5 3.5 12 8l-7 4.5Z');
  });
});

function tagOf(markup: string, testId: string): string {
  const at = markup.indexOf(`data-testid="${testId}"`);
  expect(at, testId).toBeGreaterThan(-1);
  return markup.slice(markup.lastIndexOf('<', at), markup.indexOf('>', at) + 1);
}

function classesOf(markup: string, testId: string): string[] {
  return (/ class="([^"]*)"/u.exec(tagOf(markup, testId))?.[1] ?? '').split(' ').filter(Boolean);
}

describe('service failure switching (ONL-2958, ONL-2612)', () => {
  const failureStrings: ChatStrings = {
    ...strings,
    failure: {
      limitTitle: 'Usage limit', limitSession: 'Resets {when}', limitUntil: 'Until {when}', limitWeekly: 'Weekly limit {when}', limitUnknown: 'Reset time unavailable.', limitSwitch: 'Try the other agent', retryAt: 'Retry {when}',
      tooManyTitle: 'Too many requests', tooManyBody: 'Try again', tooManyStatus: 'Status {status}', billingTitle: 'Billing', billingBody: 'Check billing', billingOpen: 'Open billing',
      keyTitle: 'Key rejected', keyBody: 'Check your key', serviceTitle: 'Service unavailable', serviceStatus: 'Status {status}', serviceBody: 'Try again', crashTitle: 'Agent stopped', crashBody: 'Try again',
      failedTitle: 'Agent failed', failedBody: 'Try again', useOther: 'Use ChatGPT', formatWhen: (at) => String(at),
      line: {
        overloaded: 'overloaded {status}', serviceStatus: 'service {status}', service: 'service', stoppedStatus: 'stopped {status}', stopped: 'stopped',
        lostOverloaded: 'lost {status}', lostStatus: 'lost {status}', lost: 'lost', partOverloaded: 'part {status} {file}', partStatus: 'part {status} {file}', part: 'part {file}',
        landedFile: 'landed {file}', landedChange: 'landed', continueHint: 'continue hint', retryHint: 'retry hint',
        cutOff: 'cut', continue: 'continue', stoppedHere: 'here {reason}', notNow: 'not now',
        crashReason: 'crash reason', crashRetry: 'crash retry', failedReason: 'failed reason', failedRetry: 'failed retry',
        signedOut: 'signed out', signInRejected: 'rejected', signedOutDetail: 'signed out detail', signIn: 'Sign in',
        noticeBilling: 'short billing', noticeLimitSession: 'short {when}', noticeLimitUntil: 'short {when}', noticeLimitWeekly: 'short {when}', noticeLimitUnknown: 'short unknown', noticeSwitch: 'short switch',
        tooMany: 'short wait', tooManyStatus: 'short {status}',
      },
    },
  };
  const failed = {
    text: 'Make the hero warmer',
    attachments: [{ id: 'image-1', name: 'hero.png', mediaType: 'image/png' as const }],
    context: 'Model-only context',
  };
  const error: TranscriptItem = { kind: 'error', id: 'service-error', code: 'api_error', apiErrorStatus: 503, message: 'Unavailable', retry: failed };

  function renderFailure(overrides: Partial<ChatPanelProps> = {}): string {
    return renderToStaticMarkup(<ChatPanel state={{ ...emptyState, items: [error] }} connection={{ status: 'ok', harness: 'claude' }}
      strings={failureStrings} composerValue="My edited draft" onComposerChange={() => {}} onSend={() => {}}
      onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}}
      onSwitchAgent={() => {}} failureContext={{ harness: 'claude', other: { ready: true }, hasBillingLink: false, now: 0 }}
      chevronIcon={() => <span />} {...overrides} />);
  }

  it('places sign-in above the composer without covering the input', () => {
    const markup = renderFailure({ connection: { status: 'unauthenticated', harness: 'claude' }, signInSlot: <div>Sign in</div> });
    expect(markup).toContain('data-testid="chat-sign-in-slot"');
    expect(markup.indexOf('data-testid="chat-sign-in-slot"')).toBeLessThan(markup.indexOf('data-testid="chat-composer-box"'));
    expect(markup).not.toContain('data-testid="chat-composer-scrim"');
    expect(markup).toContain('data-testid="chat-composer"');
  });

  it('removes the sign-in notice when it is set aside', () => {
    const markup = renderFailure({ connection: { status: 'unauthenticated', harness: 'claude' }, signInSlot: <div>Sign in</div>, isSignInSetAside: true });
    expect(markup).not.toContain('data-testid="chat-sign-in-slot"');
    expect(markup).toContain('data-testid="chat-composer"');
  });

  it('renders the alternative before Retry', () => {
    const markup = renderFailure();
    expect(markup).toContain('Use ChatGPT');
    expect(markup.indexOf('data-testid="chat-error-switch-agent"')).toBeLessThan(markup.indexOf('data-testid="chat-error-retry"'));
    expect(tagOf(markup, 'chat-error-switch-agent')).not.toContain('disabled=""');
    expect(tagOf(markup, 'chat-error-retry')).not.toContain('disabled=""');
  });

  it.each([
    { ready: true, streaming: true, switching: false },
    { ready: false, streaming: true, switching: false },
    { ready: true, streaming: false, switching: true },
    { ready: false, streaming: false, switching: true },
  ])('disables both actions while busy: %j', ({ ready, streaming, switching }) => {
    const markup = renderFailure({
      state: { ...emptyState, items: [error], isStreaming: streaming },
      isAgentSwitching: switching,
      failureContext: { harness: 'claude', other: { ready }, hasBillingLink: false, now: 0 },
    });
    expect(markup).toContain('Use ChatGPT');
    expect(tagOf(markup, 'chat-error-switch-agent')).toContain('disabled=""');
    expect(tagOf(markup, 'chat-error-retry')).toContain('disabled=""');
  });

  it('reads Use for an agent still to set up, and stays actionable when idle', () => {
    const markup = renderFailure({ failureContext: { harness: 'claude', other: { ready: false }, hasBillingLink: false, now: 0 } });
    expect(markup).toContain('Use ChatGPT');
    expect(markup).not.toContain('Set up ChatGPT');
    expect(tagOf(markup, 'chat-error-switch-agent')).not.toContain('disabled=""');
  });

  it('keeps Retry when no alternative or switch callback exists', () => {
    const noAlternative = renderFailure({ failureContext: { harness: 'claude', hasBillingLink: false, now: 0 } });
    const noCallback = renderFailure({ onSwitchAgent: undefined });
    for (const markup of [noAlternative, noCallback]) {
      expect(markup).not.toContain('data-testid="chat-error-switch-agent"');
      expect(markup).toContain('data-testid="chat-error-retry"');
    }
  });

  it('can offer the alternative without a failed prompt to refill', () => {
    const markup = renderFailure({ state: { ...emptyState, items: [{ ...error, retry: undefined }] } });
    expect(markup).toContain('data-testid="chat-error-switch-agent"');
    expect(markup).not.toContain('data-testid="chat-error-retry"');
  });

  it.each([false, true])('blocks an explicit send until switching finishes: %s', (isAgentSwitching) => {
    const markup = renderFailure({ isAgentSwitching });
    expect(tagOf(markup, 'chat-send').includes('disabled')).toBe(isAgentSwitching);
  });

  it('takes the layer over the chat away while a limit notice holds the composer (ONL-2812)', () => {
    const overChat = { overChat: <span data-testid="over-chat-probe" /> };
    const limited: TranscriptItem = { kind: 'error', id: 'limit', message: '', code: 'rate_limited', limit: { window: 'session', resetsAt: 7_200 }, retry: failed };
    const held = renderFailure({ state: { ...emptyState, items: [limited] }, composerSlots: overChat });
    expect(held).toContain('data-testid="chat-error-notice"');
    expect(held).not.toContain('over-chat-probe');
    expect(renderFailure({ state: { ...emptyState, items: [limited] }, composerSlots: overChat, dismissedNotices: new Set(['limit']) })).toContain('over-chat-probe');
  });

  it('tells the row above the composer while a limit notice holds it (ONL-2812)', () => {
    const limited: TranscriptItem = { kind: 'error', id: 'limit', message: '', code: 'rate_limited', limit: { window: 'session', resetsAt: 7_200 }, retry: failed };
    const aboveComposer = { aboveComposer: ({ isComposerHeld }: { isComposerHeld: boolean }) => <span data-testid={isComposerHeld ? 'held-probe' : 'free-probe'} /> };
    expect(renderFailure({ state: { ...emptyState, items: [limited] }, composerSlots: aboveComposer })).toContain('held-probe');
    expect(renderFailure({ state: { ...emptyState, items: [limited] }, composerSlots: aboveComposer, dismissedNotices: new Set(['limit']) })).toContain('free-probe');
  });
});

describe('the setup row after a transcript (ONL-2499)', () => {
  const items: TranscriptItem[] = [
    { kind: 'user', id: 'u1', text: 'Set this project up' },
    { kind: 'assistant-text', id: 'a1', text: 'I saved the setup script and Studio verified it.', isStreaming: false },
  ];

  function withSetup(): string {
    return renderToStaticMarkup(<ChatPanel state={{ ...emptyState, items }} connection={{ status: 'ok' }}
      strings={strings} setup={{ line: 'Starting', repo: 'acme', phase: 'starting' }} composerValue=""
      onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}}
      onCopy={() => {}} chevronIcon={() => <span />} />);
  }

  it('asks for the transcript\'s inline step, not the resting block\'s', () => {
    const row = classesOf(withSetup(), 'chat-setup-row');
    const probe = (step: 3 | 4): string[] =>
      classesOf(renderToStaticMarkup(<VStack paddingInline={step} data-testid="probe" />), 'probe');
    expect(probe(3).every((name) => row.includes(name))).toBe(true);
    expect(probe(4).every((name) => row.includes(name))).toBe(false);
  });

  it('keeps the resting block\'s own inset, which is alone in an empty panel', () => {
    const resting = renderToStaticMarkup(<ChatPanel state={emptyState} connection={{ status: 'ok' }}
      strings={strings} setup={{ line: 'Starting', repo: 'acme', phase: 'starting' }} composerValue=""
      onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}}
      onCopy={() => {}} chevronIcon={() => <span />} />);
    const row = classesOf(resting, 'chat-resting');
    const probe = classesOf(renderToStaticMarkup(<VStack padding={4} data-testid="probe" />), 'probe');
    expect(probe.every((name) => row.includes(name))).toBe(true);
  });
});

describe('a tapped next task (ONL-2899)', () => {
  const offered: TranscriptItem[] = [
    { kind: 'user', id: 'u1', text: 'Make the headline warmer' },
    { kind: 'assistant-text', id: 'a1', text: 'Done.', isStreaming: false },
    { kind: 'tools', id: 'g1', calls: [{ toolCallId: 's1', name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest next tasks', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { tasks: ['Show the page on mobile', 'Tighten the menu'] } }] },
  ];
  const invitation = <span data-testid="invitation-probe" />;

  it('draws the tap as no bubble or actions in the transcript', () => {
    const markup = render([...offered, { kind: 'user', id: 'u2', text: 'Show the page on mobile', origin: 'suggestion' }]);
    expect(markup).not.toContain('data-origin="suggestion"');
    expect(markup.match(/data-testid="chat-user-actions"/g)).toHaveLength(1);
  });

  it('holds the notifications invitation while its card is open, and lets it show after a later turn', () => {
    expect(render(offered, false, invitation)).not.toContain('invitation-probe');
    expect(render([...offered, { kind: 'user', id: 'u2', text: 'Make it blue' }, { kind: 'assistant-text', id: 'a2', text: 'Done.', isStreaming: false }], false, invitation)).toContain('invitation-probe');
  });

  it('draws the selectable next-tasks card (ONL-2977)', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel state={{ ...emptyState, items: offered }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} nextTaskPicks={{ s1: { index: 1 } }} />,
    );
    expect([...markup.matchAll(/data-task-state="(\w+)"/g)].map((match) => match[1]!)).toEqual(['dimmed', 'picked']);
  });
});

describe('a confirmed next task pins while the agent works on it (ONL-2901)', () => {
  const offer = (id: string, titles: string[]): TranscriptItem => ({
    kind: 'tools',
    id,
    calls: [{ toolCallId: `call-${id}`, name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest next tasks', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { tasks: titles.map((title) => ({ title, line: `What ${title} changes` })) } }],
  });
  const firstTap: TranscriptItem[] = [
    { kind: 'user', id: 'u1', text: 'Remix the hero' },
    { kind: 'assistant-text', id: 'a1', text: 'Remixed.', isStreaming: false },
    offer('g1', ['Push the remix further', 'Try a dark hero']),
    { kind: 'user', id: 'u2', text: 'Push the remix further', origin: 'suggestion' },
  ];
  const secondTap: TranscriptItem[] = [
    ...firstTap,
    { kind: 'assistant-text', id: 'a2', text: 'Pushed.', isStreaming: false },
    offer('g2', ['Add a footer', 'Show it on mobile']),
    { kind: 'user', id: 'u3', text: 'Show it on mobile', origin: 'suggestion' },
  ];
  const lineStrings = { ...strings, errorTitle: 'Failed', errorCutOffTitle: 'Cut off', failure: { line: { cutOff: 'Cut off.' } } } as ChatStrings;
  const drawn = (items: TranscriptItem[]): string => renderToStaticMarkup(
    <ChatPanel state={{ ...emptyState, items: [...items, { kind: 'assistant-text', id: 'working', text: 'Working on it', isStreaming: true }], isStreaming: true }} connection={{ status: 'ok' }} strings={lineStrings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} />,
  );
  /** The rows `useStickyUserMessage` chooses among, in transcript order, each read for what it would show pinned. */
  const pinRows = (markup: string): string[] => {
    const opens = [...markup.matchAll(/<[^>]*(?:data-role="user"|data-chat-pin="[^"]*")[^>]*>/g)];
    return opens.map((open, index) => {
      const body = markup.slice(open.index, opens[index + 1]?.index ?? markup.length);
      if (open[0].includes('data-chat-pin="next-task"')) return `card: ${[...body.matchAll(/data-testid="next-task-title"[^>]*>.*?>([^<]+)</g)].map((match) => match[1]).join(' | ')}`;
      if (open[0].includes('chat-suggestion-pin')) return 'hidden row';
      return 'prompt';
    });
  };

  it('pins the chosen card itself, after the prompt before it, with no hidden row to pin', () => {
    const markup = drawn(firstTap);
    expect(pinRows(markup)).toEqual(['prompt', 'card: Push the remix further']);
    expect(markup.match(/data-testid="next-task-title"/g)).toHaveLength(1);
  });

  it('gives each confirmed card its own pin, the latest last', () => {
    expect(pinRows(drawn(secondTap))).toEqual(['prompt', 'card: Push the remix further', 'card: Show it on mobile']);
  });

  it('draws a resent tap as the card it repeats, and pins that one last', () => {
    const resent: TranscriptItem[] = [
      ...firstTap,
      { kind: 'error', id: 'err', message: 'fetch failed', retry: { text: 'Push the remix further', origin: 'suggestion' } },
      { kind: 'user', id: 'u2-resent', text: 'Push the remix further', origin: 'suggestion' },
    ];
    expect(pinRows(drawn(resent))).toEqual(['prompt', 'card: Push the remix further', 'card: Push the remix further']);
  });

  it('draws a tapped row no card holds as its own words, never as nothing', () => {
    const unmatched: TranscriptItem[] = [...firstTap.slice(0, 3), { kind: 'user', id: 'u2', text: 'A task no card offered', origin: 'suggestion' }];
    const markup = drawn(unmatched);
    expect(pinRows(markup)).toEqual(['prompt', 'hidden row']);
    expect(markup).toContain('A task no card offered');
  });

  it('moves the offering reply’s footer under the chosen card, outside the pin', () => {
    const timed = firstTap.map((item) => (item.id === 'a1' ? { ...item, durationMs: 21_400 } : item));
    const markup = drawn(timed);
    const pin = markup.indexOf('data-chat-pin="next-task"');
    const footerRow = markup.indexOf('data-testid="chat-next-task-footer"');
    expect(markup.match(/data-testid="chat-response-meta"/g)).toHaveLength(1);
    expect(footerRow).toBeGreaterThan(markup.indexOf('data-testid="next-task-title"'));
    expect(markup.slice(footerRow)).toContain('21.4s');
    expect(markup.slice(pin, footerRow)).not.toContain('data-testid="chat-response-meta"');
  });

});

describe('the turn’s footer (ONL-2977)', () => {
  const finished: TranscriptItem[] = [
    { kind: 'user', id: 'u1', text: 'Make the headline warmer' },
    { kind: 'assistant-text', id: 'a1', text: 'Done.', isStreaming: false, durationMs: 18_400 },
    { kind: 'tools', id: 'g1', calls: [{ toolCallId: 's1', name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest next tasks', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { tasks: ['Show the page on mobile', 'Tighten the menu'] } }] },
  ];
  const drawn = (items: TranscriptItem[], options: { isStreaming?: boolean } = {}): string => renderToStaticMarkup(
    <ChatPanel state={{ ...emptyState, items, isStreaming: options.isStreaming ?? false, ...(options.isStreaming ? { turnStartedAt: Date.now() } : {}) }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} nextTaskPicks={{ s1: { index: 1 } }} />,
  );
  const meta = (markup: string): string => markup.match(/<div[^>]*data-testid="chat-response-meta"[^>]*>/)?.[0] ?? '';

  it('keeps the completed turn’s timer visible without hover (ONL-3088)', () => {
    expect(meta(drawn(finished))).not.toContain('data-reveal="hover"');
    expect(drawn(finished)).toContain('18.4s');
  });

  it('holds the duration and copy together, below the next-tasks card', () => {
    const markup = drawn(finished);
    const footer = markup.indexOf('data-testid="chat-response-meta"');
    expect(footer).toBeGreaterThan(markup.lastIndexOf('data-testid="next-task"'));
    expect(markup.slice(footer)).toContain('18.4s');
    expect(markup.slice(footer)).toContain('data-testid="chat-response-copy"');
  });

  it('leaves the running turn’s timer always visible', () => {
    const markup = drawn([finished[0]!, { kind: 'assistant-text', id: 'a1', text: 'Working', isStreaming: true }], { isStreaming: true });
    expect(markup).toContain('data-testid="chat-turn-timer"');
    expect(markup).not.toContain('data-reveal');
  });
});

describe('Studio’s setup prompt (ONL-2913)', () => {
  const setupStrings = {
    ...strings,
    setupRunning: 'Setting up',
    setupEnded: 'Set up',
    setupSteps: { label: 'Setup steps', done: 'Running', steps: { find: 'Find', install: 'Install', start: 'Start', canvas: 'Canvas' } },
  } as ChatStrings;
  const glyphs = { pending: <i />, running: <i />, done: <i />, failed: <i /> };
  const renderSetup = (isStreaming: boolean, extra: Partial<React.ComponentProps<typeof ChatPanel>> = {}): string =>
    renderToStaticMarkup(
      <ChatPanel state={{ ...emptyState, items: [{ kind: 'user', id: 'studio', origin: 'studio', text: 'First call get_project_setup.' }], isStreaming }} connection={{ status: 'ok' }} strings={setupStrings} setupRepo="lemonade" setupStepGlyphs={glyphs} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} {...extra} />,
    );

  it('marks the running setup row for the pin only when asked to (ONL-2961)', () => {
    expect(renderSetup(true, { pinsRunningSetup: true })).toContain('data-chat-pin="setup"');
    expect(renderSetup(true)).not.toContain('data-chat-pin');
  });

  it('pins the checklist with the running setup row, and leaves it in the conversation once the turn ends (ONL-2960)', () => {
    const pinBody = (markup: string): string => {
      const start = markup.lastIndexOf('<div', markup.indexOf('data-chat-pin="setup"'));
      let depth = 0;
      for (const tag of markup.slice(start).matchAll(/<div\b|<\/div>/g)) {
        depth += tag[0] === '</div>' ? -1 : 1;
        if (depth === 0) return markup.slice(start, start + tag.index + tag[0].length);
      }
      return '';
    };
    expect(pinBody(renderSetup(true, { pinsRunningSetup: true }))).toContain('data-testid="setup-steps"');
    const ended = renderSetup(false, { pinsRunningSetup: true });
    expect(ended).toContain('data-testid="setup-steps"');
    expect(ended).not.toContain('data-chat-pin');
  });

  it('lets the setup row go from the pin once its turn has ended (ONL-2961)', () => {
    expect(renderSetup(false, { pinsRunningSetup: true })).not.toContain('data-chat-pin');
  });

  it('ends a failed setup on the failed step’s line rather than as set up (ONL-2961)', () => {
    const markup = renderSetup(false, { setupFailedLine: { promptId: 'studio', line: 'Couldn’t start' } });
    expect(markup).toContain('Couldn’t start');
    expect(markup).not.toContain('>Set up<');
  });

  it('draws the checklist before the agent has called anything, in place of the prompt’s text', () => {
    const markup = renderSetup(true);
    expect(markup).toContain('data-testid="setup-steps"');
    expect(markup).toContain('data-running="true"');
    expect(markup).not.toContain('First call get_project_setup.');
  });

  it('stops naming the setup as running once its turn has ended', () => {
    expect(renderSetup(false)).not.toContain('data-running="true"');
  });

  const renderRow = (row: TranscriptItem): string =>
    renderToStaticMarkup(
      <ChatPanel state={{ ...emptyState, items: [row], isStreaming: true }} connection={{ status: 'ok' }} strings={setupStrings} setupRepo="lemonade" setupStepGlyphs={glyphs} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}} chevronIcon={() => <span />} />,
    );

  it('draws the repair ask as the person’s own message, with no setup line and nothing to re-send (ONL-2961)', () => {
    const markup = renderRow({ kind: 'user', id: 'ask', origin: 'studio', text: 'My app didn’t start. Can you help?', context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n{}` });
    expect(markup).toContain('My app didn’t start. Can you help?');
    expect(markup).toContain('data-role="user"');
    expect(markup).toContain('data-origin="studio"');
    expect(markup).not.toContain('Setting up');
    expect(markup).not.toContain(SETUP_REPAIR_CONTEXT_OPENING);
    expect(markup).not.toContain('data-testid="chat-user-actions"');
  });

  it('keeps a saved repair row from before ONL-2961 behind the setup line, never showing its instruction', () => {
    const markup = renderRow({ kind: 'user', id: 'ask', origin: 'studio', text: PROJECT_SETUP_REPAIR_PROMPT });
    expect(markup).toContain('Setting up');
    expect(markup).not.toContain(PROJECT_SETUP_REPAIR_PROMPT.slice(0, 30));
  });
});

describe('thinking around a tool line that draws nothing (ONL-2960)', () => {
  const toolLines = Object.fromEntries(TOOL_LINE_IDS.map((id) => [id, { running: id, done: id }])) as ToolLineStrings;
  const working = (id: string): TranscriptItem => ({
    kind: 'tools',
    id,
    calls: [{ toolCallId: `${id}-call`, name: 'mcp__studio__frame_working', kind: 'other', title: 'frame_working', status: 'completed', displayStatus: 'completed', startedAt: 0, input: {} }],
  });
  const thought = (id: string, text: string): TranscriptItem => ({ kind: 'assistant-thinking', id, text, isStreaming: false });

  it('draws the blocks on either side as one thinking row', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel state={{ ...emptyState, items: [thought('t1', 'Reading the header.'), working('w1'), thought('t2', 'Now the footer.'), working('w2'), thought('t3', '')], isStreaming: true, turnStartedAt: Date.now() }} connection={{ status: 'ok' }} strings={{ ...strings, toolLines }} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}} chevronIcon={() => <span />} />,
    );
    expect(markup.match(/data-kind="thinking"/g)).toHaveLength(1);
  });
});

describe('the turn footer shows once, at the end of the turn (ONL-2960)', () => {
  const reply = (id: string, text: string): TranscriptItem => ({ kind: 'assistant-text', id, text, isStreaming: false, durationMs: 70_700 });
  const items: TranscriptItem[] = [
    { kind: 'user', id: 'setup', text: 'Set up my app', origin: 'studio' },
    reply('a1', 'The lab runs in a browser frame.'),
    { kind: 'tools', id: 't1', calls: [] },
    reply('a2', 'Skipping install scripts.'),
    { kind: 'tools', id: 't2', calls: [] },
    reply('a3', 'Your app is running.'),
  ];
  const panel = (isStreaming: boolean): string =>
    renderToStaticMarkup(
      <ChatPanel state={{ ...emptyState, items, isStreaming }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}} chevronIcon={() => <span />} />,
    );

  it('draws one footer under the turn’s last reply, not under each reply between its tool runs', () => {
    const markup = panel(false);
    expect(markup.match(/data-testid="chat-response-meta"/g)).toHaveLength(1);
    expect(markup.indexOf('data-testid="chat-response-meta"')).toBeGreaterThan(markup.indexOf('Your app is running.'));
  });

  it('draws none while the turn is still running', () => {
    expect(panel(true)).not.toContain('data-testid="chat-response-meta"');
  });
});

describe('a finished thought draws no line (ONL-2960)', () => {
  const thought = (id: string, isStreaming: boolean): TranscriptItem => ({ kind: 'assistant-thinking', id, text: '', isStreaming });
  const panel = (items: TranscriptItem[], isStreaming: boolean): string =>
    renderToStaticMarkup(
      <ChatPanel state={{ ...emptyState, items, isStreaming }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}} chevronIcon={() => <span />} />,
    );
  const prompt: TranscriptItem = { kind: 'user', id: 'p', text: 'Make it blue' };
  const done: TranscriptItem = { kind: 'assistant-text', id: 'a', text: 'Done.', isStreaming: false };

  it('leaves no row once the thought is done and the reply has come', () => {
    expect(panel([prompt, thought('t', false), done], false)).not.toContain('data-kind="thinking"');
  });

  it('shows the thinking row while the agent is thinking', () => {
    expect(panel([prompt, thought('t', true)], true)).toContain('data-kind="thinking"');
  });
});

describe('a dismissed question (ONL-2901)', () => {
  const toolLines = Object.fromEntries(TOOL_LINE_IDS.map((id) => [id, { running: id, done: id }])) as ToolLineStrings;
  const any = new Proxy({}, { get: () => 'x' });
  const verbs = new Proxy({}, { get: () => ({ running: 'x', done: 'x' }) });
  const questions = [{ question: 'Which font?', header: 'Font', options: [{ label: 'Serif', description: '' }, { label: 'Sans', description: '' }] }];
  const items: TranscriptItem[] = [{
    kind: 'tools',
    id: 'ask',
    calls: [{ toolCallId: 'q1', name: 'AskUserQuestion', kind: 'other', title: 'AskUserQuestion', status: 'canceled', displayStatus: 'canceled', startedAt: 0, errorMessage: 'Canceled', dismissedQuestions: questions }],
  }];
  const draw = (withLines: boolean): string => renderToStaticMarkup(
    <ChatPanel state={{ ...emptyState, items }} connection={{ status: 'ok' }} strings={{ ...strings, toolVerbs: verbs, toolRows: any, ...(withLines ? { toolLines } : {}) } as ChatStrings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} onRetry={() => {}} chevronIcon={() => <span />} />,
  );

  it('leaves its dismissed line and no canceled row, with tool lines on and off', () => {
    for (const withLines of [true, false]) {
      const markup = draw(withLines);
      expect(markup).toContain('data-testid="question-dismissed"');
      expect(markup).not.toContain('data-testid="tool-row"');
    }
  });
});

describe('the layer over the chat (ONL-2812)', () => {
  const probe = <span data-testid="over-chat-probe" />;
  const draw = (state: Partial<ChatPanelProps['state']>): string => renderToStaticMarkup(
    <ChatPanel state={{ ...emptyState, ...state }} connection={{ status: 'ok' }} strings={strings} composerValue="" onComposerChange={() => {}} onSend={() => {}} onInterrupt={() => {}} onRespond={() => {}} onCopy={() => {}} chevronIcon={() => <span />} composerSlots={{ overChat: probe }} />,
  );
  const asked = { toolCallId: 'q1', name: 'AskUserQuestion', kind: 'other' as const, title: 'AskUserQuestion', status: 'pending' as const, displayStatus: 'awaiting_approval' as const, startedAt: 0, permission: { requestId: 'r1', options: [], questions: [{ question: 'Which font?', header: 'Font', options: [{ label: 'Serif', description: '' }, { label: 'Sans', description: '' }] }] } };
  const offered: TranscriptItem[] = [
    { kind: 'user', id: 'u1', text: 'Make the headline warmer' },
    { kind: 'tools', id: 'g1', calls: [{ toolCallId: 's1', name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest next tasks', status: 'completed', displayStatus: 'completed', startedAt: 0, input: { tasks: ['Show the page on mobile', 'Tighten the menu'] } }] },
  ];

  it('stands over an idle chat', () => {
    expect(draw({})).toContain('over-chat-probe');
    expect(draw({ items: [{ kind: 'user', id: 'u1', text: 'Make it warmer' }], isStreaming: true })).toContain('over-chat-probe');
  });

  it('gives way while a question waits for an answer', () => {
    expect(draw({ items: [{ kind: 'tools', id: 'ask', calls: [asked] }], isStreaming: true, awaitingApproval: [asked] })).not.toContain('over-chat-probe');
  });

  it('gives way while next tasks can be tapped, and returns once they are answered by a later turn', () => {
    expect(draw({ items: offered })).not.toContain('over-chat-probe');
    expect(draw({ items: [...offered, { kind: 'user', id: 'u2', text: 'Make it blue' }, { kind: 'assistant-text', id: 'a2', text: 'Done.', isStreaming: false }] })).toContain('over-chat-probe');
  });
});
