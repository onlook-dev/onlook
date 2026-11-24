import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { HotkeyList } from './HotkeyList.js';
import { HOTKEYS, shownHotkeys } from './hotkeys.js';
import { TIPS_RULES } from './styles.js';

it('keeps shortcut columns inside an unconstrained wrapper instead of the height-constrained scroller', () => {
  const markup = renderToStaticMarkup(<HotkeyList groups={shownHotkeys(HOTKEYS, { codeEnabled: true })} query="" />);
  expect(markup).toContain('data-testid="tips-hotkeys"><div class="tips-key-columns">');
  expect(markup).toContain('data-hotkey-row="saveCode"');
  expect(TIPS_RULES.match(/\.tips-keys \{([^}]+)\}/)?.[1]).not.toContain('columns:');
  expect(TIPS_RULES).toContain('.tips-key-columns { columns: 2;');
});

it('shows an empty search without shortcut columns', () => {
  const markup = renderToStaticMarkup(<HotkeyList groups={[]} query="unmatched" />);
  expect(markup).toContain('tips-empty');
  expect(markup).not.toContain('tips-key-columns');
});

it('compacts group spacing only when the Code shortcut is present', () => {
  expect(TIPS_RULES).toContain('.tips-key-group { break-inside: avoid; margin: 0 0 20px; padding-top: 8px; }');
  expect(TIPS_RULES).toContain(".tips-key-columns:has([data-hotkey-row='saveCode']) .tips-key-group { margin-bottom: 0; padding-top: 4px; }");
});
