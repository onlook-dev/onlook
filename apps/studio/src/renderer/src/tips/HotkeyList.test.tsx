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
