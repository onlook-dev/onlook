import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { zzStrings } from '@studio/chat-ui/testing';
import { chatLineFor, fieldFor, SignInCard, titleFor } from './SignInCard.js';
import {
  CHATGPT_SETUP_FIXTURES,
  CLAUDE_COMMAND,
  CLAUDE_SETUP_FIXTURES,
  CLAUDE_SETUP_VARIANTS,
  CODEX_COMMAND,
  FIXTURE_CODE,
  FIXTURE_EMAIL,
  STUB_STRINGS,
} from './fixtures.js';
import { CHATGPT_SETUP_STATES, CLAUDE_SETUP_STATES, type SetupState, type SignInCardHost } from './state.js';
import type { OnboardingUiStrings } from './strings.js';
import { detailFromTheBag, TEST_CARD_GLYPHS as GLYPHS } from './testing.js';

function render(state: SetupState, host: SignInCardHost, strings: OnboardingUiStrings): string {
  return renderToStaticMarkup(<SignInCard state={state} host={host} strings={strings} glyphs={GLYPHS} />);
}

describe('SignInCard', () => {
  test('ChatGPT shows its failure message on the fallback and after a signed-out recheck (ONL-3043)', () => {
    for (const state of [
      { harness: 'codex', state: 'fallback', command: CODEX_COMMAND, detail: 'Login timed out' },
      { harness: 'codex', state: 'not-signed-in', detail: 'Not logged in' },
    ] as const) {
      const html = render(state, 'dialog', STUB_STRINGS);
      expect(html).toContain('sign-in-detail');
      expect(html).toContain(state.detail);
    }
  });
  test('an unavailable bundled runtime gives replacement advice without a Terminal command', () => {
    const html = render({ harness: 'claude', state: 'cannot-connect', detail: '', runtimeUnavailable: true }, 'dialog', STUB_STRINGS);
    expect(html).toContain(STUB_STRINGS.runtimeMissingTitle);
    expect(html).toContain(STUB_STRINGS.runtimeMissingBody);
    expect(html).not.toContain('claude auth login');
    expect(html).not.toContain('sign-in-field');
  });
  test('Claude sign-in offers browser choices only when another browser is installed', () => {
    const props = { state: CLAUDE_SETUP_FIXTURES['not-signed-in'], host: 'chat' as const, strings: STUB_STRINGS, glyphs: GLYPHS };
    const browsers = [{ id: 'default', name: 'Safari', isDefault: true }, { id: 'chrome', name: 'Google Chrome', isDefault: false }];
    const multiple = renderToStaticMarkup(<SignInCard {...props} browsers={browsers} />);
    expect(multiple).toContain('aria-haspopup="menu"');
    const single = renderToStaticMarkup(<SignInCard {...props} browsers={browsers.slice(0, 1)} />);
    expect(single).not.toContain('aria-haspopup="menu"');
    const codex = renderToStaticMarkup(<SignInCard {...props} state={CHATGPT_SETUP_FIXTURES['not-signed-in']} browsers={browsers} />);
    expect(codex).not.toContain('aria-haspopup="menu"');
  });

  test('only paste-code carries a field, with its code and a Paste action; the fallbacks carry the command and Copy', () => {
    expect(fieldFor(CLAUDE_SETUP_FIXTURES['paste-code'])).toEqual({ text: FIXTURE_CODE, action: 'paste' });
    expect(fieldFor(CLAUDE_SETUP_FIXTURES.fallback)).toEqual({ text: CLAUDE_COMMAND, action: 'copy' });
    expect(fieldFor(CHATGPT_SETUP_FIXTURES.fallback)).toEqual({ text: CODEX_COMMAND, action: 'copy' });
    for (const id of CLAUDE_SETUP_STATES) {
      if (id !== 'paste-code' && id !== 'fallback') expect(fieldFor(CLAUDE_SETUP_FIXTURES[id]), id).toBeUndefined();
    }
    for (const id of CHATGPT_SETUP_STATES) {
      if (id !== 'fallback') expect(fieldFor(CHATGPT_SETUP_FIXTURES[id]), id).toBeUndefined();
    }
  });

  test('signed in without an email reads the bare title and the bare chat line on both Harnesses, and the email when there is one (ONL-2186)', () => {
    const codexNoEmail: SetupState = { harness: 'codex', state: 'connected', plan: 'ChatGPT' };
    for (const state of [CLAUDE_SETUP_VARIANTS['signed-in-no-email'], codexNoEmail]) {
      expect(titleFor(state, STUB_STRINGS)).toBe(STUB_STRINGS.dialogTitleNoEmail);
      expect(chatLineFor(state, STUB_STRINGS)).toBe(STUB_STRINGS.chatSignedInNoEmail);
    }
    for (const state of [CLAUDE_SETUP_FIXTURES['signed-in'], CHATGPT_SETUP_FIXTURES.connected]) {
      expect(titleFor(state, STUB_STRINGS)).toContain(FIXTURE_EMAIL);
      expect(chatLineFor(state, STUB_STRINGS)).toContain(FIXTURE_EMAIL);
    }
  });

  test('the transcript row offers a control for a check in flight and for one that could not connect (ONL-2496)', () => {
    const checking = render(CLAUDE_SETUP_FIXTURES.checking, 'chat', STUB_STRINGS);
    expect(checking).toContain('sign-in-action-cancel');
    const cannotConnect = render(CLAUDE_SETUP_FIXTURES['cannot-connect'], 'chat', STUB_STRINGS);
    expect(cannotConnect).toContain('sign-in-action-check-again');
    expect(cannotConnect).toContain('sign-in-detail');
  });

  test('a sign-in sheet reached through a failed check carries its reason; a fresh one carries none (ONL-2496)', () => {
    expect(render(CLAUDE_SETUP_VARIANTS['not-signed-in-after-turn'], 'dialog', STUB_STRINGS)).toContain('sign-in-detail');
    expect(render(CLAUDE_SETUP_FIXTURES['not-signed-in'], 'dialog', STUB_STRINGS)).not.toContain('sign-in-detail');
  });

  test('every word comes from the bag', () => {
    const zz = zzStrings(STUB_STRINGS);
    for (const id of CLAUDE_SETUP_STATES) {
      expect(render(detailFromTheBag(CLAUDE_SETUP_FIXTURES[id]), 'dialog', zz)).not.toMatch(/Sign in|Claude|Onlook|Terminal|Paste it/);
    }
    for (const variant of Object.values(CLAUDE_SETUP_VARIANTS)) {
      for (const host of ['dialog', 'chat'] as const) {
        expect(render(detailFromTheBag(variant), host, zz)).not.toMatch(/Signed in|Claude|Onlook|Terminal|Paste it/);
      }
    }
    for (const id of CHATGPT_SETUP_STATES) {
      expect(render(detailFromTheBag(CHATGPT_SETUP_FIXTURES[id]), 'dialog', zz)).not.toMatch(/Sign in|Set up the|Onlook|Terminal/);
    }
  });
});
