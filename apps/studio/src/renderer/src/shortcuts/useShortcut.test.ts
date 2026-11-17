import { describe, expect, it } from 'bun:test';
import type { ModalQuery } from './isModalOpen.js';
import { parseHotkey } from './matchHotkey.js';
import { SHORTCUTS } from './registry.js';
import { shouldFireShortcut } from './useShortcut.js';

const noModal: ModalQuery = { querySelector: () => null };
const withModal: ModalQuery = { querySelector: (selector) => (selector === ':modal' ? {} : null) };

describe('shouldFireShortcut', () => {
  const mode = parseHotkey(SHORTCUTS['canvas.mode-design'].keys);
  const chrome = parseHotkey(SHORTCUTS['ui.toggle-chrome'].keys);

  it('stands down behind a modal and fires again once it closes', () => {
    const event = { key: 'd', target: null };
    const context = { allowRepeat: false, suppressInEditable: true };

    expect(shouldFireShortcut(event, mode, { ...context, doc: withModal })).toBe(false);
    expect(shouldFireShortcut(event, mode, { ...context, doc: noModal })).toBe(true);
  });

  it('stands down behind a modal even where editable focus is not suppressed', () => {
    const event = { key: '.', metaKey: true, target: null };
    const context = { allowRepeat: false, suppressInEditable: false };

    expect(shouldFireShortcut(event, chrome, { ...context, doc: withModal })).toBe(false);
    expect(shouldFireShortcut(event, chrome, { ...context, doc: noModal })).toBe(true);
  });

  it('keeps the earlier bails', () => {
    const context = { allowRepeat: false, suppressInEditable: true, doc: noModal };

    expect(shouldFireShortcut({ key: 'd', repeat: true }, mode, context)).toBe(false);
    expect(shouldFireShortcut({ key: 'd', isComposing: true }, mode, context)).toBe(false);
    expect(shouldFireShortcut({ key: 'x' }, mode, context)).toBe(false);
    expect(
      shouldFireShortcut({ key: 'd', repeat: true }, mode, { ...context, allowRepeat: true }),
    ).toBe(true);
  });

  it('never reaches Escape, which a dialog dismisses through the escape stack', () => {
    const keys = Object.values(SHORTCUTS).map((entry) => parseHotkey(entry.keys).key);
    expect(keys).not.toContain('escape');
  });

  // `isInteractiveTarget` narrows on `instanceof HTMLElement`, which bun's runtime does not define.
  it('still suppresses a caret-bearing target, and only where the entry asks for it', () => {
    class FakeElement {
      tagName = 'TEXTAREA';
      getAttribute = (): string | null => null;
      isContentEditable = false;
      parentElement = null;
    }
    (globalThis as { HTMLElement?: unknown }).HTMLElement = FakeElement;
    const caret = { key: 'd', target: new FakeElement() as unknown as EventTarget };

    expect(
      shouldFireShortcut(caret, mode, { allowRepeat: false, suppressInEditable: true, doc: noModal }),
    ).toBe(false);
    expect(
      shouldFireShortcut(caret, mode, { allowRepeat: false, suppressInEditable: false, doc: noModal }),
    ).toBe(true);
  });
});
