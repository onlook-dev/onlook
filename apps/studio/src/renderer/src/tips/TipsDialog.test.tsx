import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TipsDialogView } from './TipsDialog.js';

it('renders concurrent Code-on and Code-off dialogs independently', () => {
  const markup = renderToStaticMarkup(<>{[false, true, true, false].map((codeEnabled, index) => (
    <TipsDialogView
      key={index}
      isOpen
      isInline
      codeEnabled={codeEnabled}
      view="hotkeys"
      tab="featured"
      query=""
      detail={null}
      onClose={() => {}}
      onView={() => {}}
      onTab={() => {}}
      onQuery={() => {}}
      onDetail={() => {}}
      onChoose={() => {}}
    />
  ))}</>);
  const dialogs = markup.split('data-testid="tips-hotkeys"').slice(1);
  expect(dialogs.map((dialog) => dialog.includes('data-hotkey-row="saveCode"'))).toEqual([false, true, true, false]);
});
