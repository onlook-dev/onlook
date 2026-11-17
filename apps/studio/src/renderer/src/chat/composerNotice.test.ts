import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatPanel } from '@studio/chat-ui';
import { emptyState, type TranscriptItem } from '@studio/events';
import { canStartSignIn, SignInNotice } from '@studio/onboarding-ui';
import { CARD_GLYPHS } from '../agent-setup/glyphs.js';
import { onboardingUiStrings } from '../onboarding/uiStrings.js';
import { CHAT_FIXTURE_STRINGS } from '../dev/ChatFixture.js';
import { ForwardIcon } from '../icons/glyphs.js';

const NOW = 1_800_000_000_000;
const PROMPT: TranscriptItem = { kind: 'user', id: 'u1', text: 'Make the Order ahead button stand out more.' };
const LIMIT: TranscriptItem = {
  kind: 'error',
  id: 'limit',
  message: '',
  code: 'rate_limited',
  limit: { window: 'session', resetsAt: NOW / 1000 + 3600 },
  retry: { text: 'Make the Order ahead button stand out more.' },
};

function panel(items: TranscriptItem[], { dismissed = [] as string[] } = {}): string {
  return renderToStaticMarkup(
    createElement(ChatPanel, {
      state: { ...emptyState, items, isStreaming: false },
      dismissedNotices: new Set(dismissed),
      onDismissNotice: () => undefined,
      failureContext: { harness: 'claude', plan: 'max', other: { ready: false }, hasBillingLink: true, now: NOW },
      onSwitchAgent: () => undefined,
      connection: { status: 'ok' },
      strings: CHAT_FIXTURE_STRINGS,
      composerValue: '',
      onComposerChange: () => undefined,
      onSend: () => undefined,
      onInterrupt: () => undefined,
      onRespond: () => undefined,
      onCopy: () => undefined,
      chevronIcon: ForwardIcon,
    }),
  );
}

function composerBox(markup: string): string {
  const at = markup.indexOf('data-testid="chat-composer-box"');
  if (at === -1) throw new Error('no composer box in the markup');
  return markup.slice(at);
}

describe('a usage limit lays its notice on the composer (ONL-2973)', () => {
  it('dims the composer and nothing above it, and leaves a line in the chat', () => {
    const markup = panel([PROMPT, LIMIT]);
    expect(composerBox(markup)).toContain('data-testid="chat-composer-scrim"');
    expect(composerBox(markup)).toContain('data-testid="chat-error-notice"');
    expect(markup.slice(0, markup.indexOf('data-testid="chat-composer-dropzone"'))).not.toContain('chat-composer-scrim');
    expect(markup).toContain('data-testid="chat-error-not-now"');
    expect(markup).toContain('data-testid="chat-error-switch-agent"');
    expect(markup).toContain('data-testid="chat-error-line-switch-agent"');
  });

  it('goes once set aside with Not now, and the line stays', () => {
    const markup = panel([PROMPT, LIMIT], { dismissed: ['limit'] });
    expect(markup).not.toContain('chat-error-notice');
    expect(markup).toContain('data-testid="chat-error-line-switch-agent"');
  });

  it('leaves the composer usable under the notice, so a wrong reading never stops a send', () => {
    expect(composerBox(panel([PROMPT, LIMIT]))).not.toContain('inert=""');
    expect(composerBox(signedOut())).not.toContain('inert=""');
  });

  it('goes once a later turn has started', () => {
    const markup = panel([PROMPT, LIMIT, { ...PROMPT, id: 'u2' }]);
    expect(markup).not.toContain('chat-error-notice');
    expect(markup).not.toContain('chat-error-line-switch-agent');
  });
});

const SIGNED_OUT = { status: 'unauthenticated', harness: 'claude' } as const;

function signedOut({ failed = true, setAside = false, lineDisabled = false } = {}): string {
  const strings = onboardingUiStrings();
  const state = { harness: 'claude', state: 'not-signed-in' } as const;
  const slot = createElement(SignInNotice, { state, strings, glyphs: CARD_GLYPHS, ...(failed ? { onNotNow: () => undefined } : {}) });
  return renderToStaticMarkup(
    createElement(ChatPanel, {
      state: { ...emptyState, items: [PROMPT], isStreaming: false, ...(failed ? { failedTurn: { turnId: 't1', code: 'unauthenticated' } } : {}) },
      signInSlot: slot,
      signInPlacement: failed ? 'transcript' : 'band',
      signInLine: { onSignIn: () => undefined, isRejected: false, isDisabled: lineDisabled },
      isSignInSetAside: setAside,
      connection: SIGNED_OUT,
      strings: CHAT_FIXTURE_STRINGS,
      composerValue: '',
      onComposerChange: () => undefined,
      onSend: () => undefined,
      onInterrupt: () => undefined,
      onRespond: () => undefined,
      onCopy: () => undefined,
      chevronIcon: ForwardIcon,
    }),
  );
}

const beforeComposer = (markup: string): string => markup.slice(0, markup.indexOf('data-testid="chat-composer-dropzone"'));

describe('a signed-out turn asks for sign-in on the composer (ONL-2973)', () => {
  it('lays the sign-in over the composer alone, with Not now, and leaves a line where the turn stopped', () => {
    const markup = signedOut();
    expect(composerBox(markup)).toContain('data-testid="chat-composer-scrim"');
    expect(composerBox(markup)).toContain('data-testid="chat-sign-in-card"');
    expect(composerBox(markup)).toContain('data-testid="chat-sign-in-not-now"');
    expect(beforeComposer(markup)).toContain('data-testid="chat-error-line-sign-in"');
    expect(beforeComposer(markup)).not.toContain('chat-sign-in-card');
  });

  it('after Not now keeps only the line, and the composer stays signed out', () => {
    const markup = signedOut({ setAside: true });
    expect(markup).not.toContain('chat-sign-in-card');
    expect(markup).not.toContain('chat-composer-scrim');
    expect(beforeComposer(markup)).toContain('data-testid="chat-error-line-sign-in"');
  });

  it('signed out with no failed turn has no Not now and no line', () => {
    const markup = signedOut({ failed: false });
    expect(composerBox(markup)).toContain('data-testid="chat-sign-in-card"');
    expect(markup).not.toContain('chat-sign-in-not-now');
    expect(markup).not.toContain('chat-error-line-sign-in');
  });

});

describe('where a sign-in can start again (ONL-2973)', () => {
  it('signed out, and after a sign-in that fell back to the Terminal; not while one runs or once in', () => {
    const command = 'claude auth login';
    expect(canStartSignIn({ harness: 'claude', state: 'not-signed-in' })).toBe(true);
    expect(canStartSignIn({ harness: 'claude', state: 'fallback', command })).toBe(true);
    expect(canStartSignIn({ harness: 'claude', state: 'signing-in' })).toBe(false);
    expect(canStartSignIn({ harness: 'claude', state: 'checking' })).toBe(false);
    expect(canStartSignIn({ harness: 'claude', state: 'signed-in', plan: 'Max' })).toBe(false);
  });
});

describe('a sign-in that fell back to the Terminal has a way back (ONL-2973)', () => {
  const fallback = { harness: 'claude', state: 'fallback', command: 'claude auth login', detail: 'The sign-in stopped before it finished.' } as const;

  it('offers Check again and Sign in on the notice', () => {
    const strings = onboardingUiStrings();
    const notice = renderToStaticMarkup(createElement(SignInNotice, { state: fallback, strings, glyphs: CARD_GLYPHS, onNotNow: () => undefined }));
    expect(notice).toContain('data-testid="sign-in-action-check-again"');
    expect(notice).toContain('data-testid="sign-in-action-sign-in"');
    expect(notice).not.toContain('chat-sign-in-not-now');
  });
});

describe('a sign-in line that cannot act looks it (ONL-2973)', () => {
  const lineButton = (markup: string): string => {
    const tag = /<button[^>]*data-testid="chat-error-line-sign-in"[^>]*>/.exec(markup)?.[0];
    if (tag === undefined) throw new Error('no sign-in line in the markup');
    return tag;
  };

  it('drops the link underline when disabled and keeps it when it can act', () => {
    expect(lineButton(signedOut({ setAside: true }))).toContain('text-decoration:underline');
    const disabled = lineButton(signedOut({ setAside: true, lineDisabled: true }));
    expect(disabled).toContain('disabled=""');
    expect(disabled).not.toContain('text-decoration:underline');
  });
});
