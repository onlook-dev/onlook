import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { zzStrings } from '@studio/chat-ui/testing';
import { isActionDisabled, SetupDialog } from './SetupDialog.js';
import { CLAUDE_SETUP_FIXTURES, STUB_STRINGS } from './fixtures.js';
import { CLAUDE_SETUP_STATES } from './state.js';
import { detailFromTheBag, TEST_CARD_GLYPHS as GLYPHS, noop } from './testing.js';

describe('SetupDialog', () => {
  test('an action failure is readable inside the dialog without hiding its retry', () => {
    const html = renderToStaticMarkup(<SetupDialog state={CLAUDE_SETUP_FIXTURES.fallback} isOpen isInline onOpenChange={noop} actionError="Open a terminal app to finish signing in." strings={STUB_STRINGS} glyphs={GLYPHS} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Open a terminal app to finish signing in.');
    expect(html).toContain('setup-action-open-terminal');
  });
  test('runtime replacement advice closes the sheet instead of offering a dead retry', () => {
    const html = renderToStaticMarkup(<SetupDialog state={{ harness: 'claude', state: 'cannot-connect', detail: '', runtimeUnavailable: true }} isOpen isInline onOpenChange={noop} strings={STUB_STRINGS} glyphs={GLYPHS} />);
    expect(html).toContain('setup-action-done');
    expect(html).not.toContain('setup-action-check-again');
    expect(html).not.toContain('setup-action-open-terminal');
  });
  test('the Claude footer exposes the browser menu and disables it during a check', () => {
    const props = { state: CLAUDE_SETUP_FIXTURES['not-signed-in'], isOpen: true, onOpenChange: noop, strings: STUB_STRINGS, glyphs: GLYPHS, isInline: true };
    const browsers = [{ id: 'default', name: 'Safari', isDefault: true }, { id: 'chrome', name: 'Google Chrome', isDefault: false }];
    expect(renderToStaticMarkup(<SetupDialog {...props} browsers={browsers} />)).toContain('aria-haspopup="menu"');
    expect(renderToStaticMarkup(<SetupDialog {...props} browsers={browsers} isBusy />)).toContain('disabled=""');
  });
  test('a listed footer action is disabled and its neighbour is not (ONL-2186)', () => {
    expect(isActionDisabled('done', undefined, false)).toBe(false);
    expect(isActionDisabled('done', ['done'], false)).toBe(true);
    expect(isActionDisabled('cancel', ['done'], false)).toBe(false);
  });

  test('busy disables every action but Cancel, so an in-flight sheet still offers its one control (ONL-2496)', () => {
    for (const action of ['open-page-again', 'sign-in', 'check-again', 'use-other-agent', 'done'] as const) {
      expect(isActionDisabled(action, undefined, true), action).toBe(true);
    }
    expect(isActionDisabled('cancel', undefined, true)).toBe(false);
    expect(isActionDisabled('cancel', ['cancel'], true)).toBe(true);
  });

  test('every word comes from the bag', () => {
    const zz = zzStrings(STUB_STRINGS);
    for (const id of CLAUDE_SETUP_STATES) {
      const html = renderToStaticMarkup(<SetupDialog state={detailFromTheBag(CLAUDE_SETUP_FIXTURES[id])} isOpen onOpenChange={noop} strings={zz} glyphs={GLYPHS} isInline />);
      expect(html).not.toMatch(/Set up|Claude|Done|Cancel/);
    }
  });
});
