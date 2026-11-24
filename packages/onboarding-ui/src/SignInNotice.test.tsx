import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignInNotice } from './SignInNotice.js';
import { CLAUDE_SETUP_FIXTURES, STUB_STRINGS } from './fixtures.js';
import { TEST_CARD_GLYPHS } from './testing.js';

describe('sign-in notice actions', () => {
  test('keeps the browser sign-in above Not now and allows a long name to wrap', () => {
    const markup = renderToStaticMarkup(<SignInNotice
      state={CLAUDE_SETUP_FIXTURES['not-signed-in']} strings={STUB_STRINGS} glyphs={TEST_CARD_GLYPHS}
      browsers={[{ id: 'preview', name: 'Chromium Developer Preview', isDefault: true }, { id: 'other', name: 'Other', isDefault: false }]}
      onNotNow={() => {}}
    />);
    expect(markup).toContain('Chromium Developer Preview');
    expect(markup).toContain('white-space:normal');
    expect(markup.indexOf('data-testid="sign-in-action-sign-in"')).toBeLessThan(markup.indexOf('data-testid="chat-sign-in-not-now"'));
  });

  test('keeps cancellation before Not now while sign-in is pending', () => {
    const markup = renderToStaticMarkup(<SignInNotice state={CLAUDE_SETUP_FIXTURES['signing-in']} strings={STUB_STRINGS} glyphs={TEST_CARD_GLYPHS} onNotNow={() => {}} />);
    expect(markup.indexOf('data-testid="sign-in-action-cancel"')).toBeLessThan(markup.indexOf('data-testid="chat-sign-in-not-now"'));
  });

  test('allows long browser names to wrap when sign-in falls back', () => {
    const markup = renderToStaticMarkup(<SignInNotice
      state={CLAUDE_SETUP_FIXTURES.fallback} strings={STUB_STRINGS} glyphs={TEST_CARD_GLYPHS}
      browsers={[{ id: 'preview', name: 'Chromium Developer Preview', isDefault: true }, { id: 'other', name: 'Other', isDefault: false }]}
    />);
    expect(markup).toContain('Chromium Developer Preview');
    expect(markup).toContain('white-space:normal');
    expect(markup).toContain('data-testid="sign-in-action-check-again"');
  });
});
