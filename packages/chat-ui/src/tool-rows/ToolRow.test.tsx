import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToolRow } from './ToolRow.js';
import type { ToolRowsStrings } from './types.js';

const STRINGS: ToolRowsStrings = { failedSuffix: ' — failed', canceledSuffix: ' — stopped', commandCount: '{count} commands', commandsVerb: { running: 'Running {target}', done: 'Ran {target}' }, overflow: '+{count} more', lineCount: '{count} lines' };
const frameLinks = { icon: () => <svg data-testid="frame-glyph" />, onActivate: () => {} };
const frameLink = { frameId: 'f1', before: 'Looked at ', name: 'Landing', after: '' };

function markup(withLinks: boolean, status: 'completed' | 'running' = 'completed'): string {
  return renderToStaticMarkup(
    <ToolRow
      verb="Looked at Landing"
      status={status}
      detail={{ kind: 'raw', text: 'Screenshot of frame f1' }}
      chevronIcon={() => <span />}
      strings={STRINGS}
      frameLink={frameLink}
      {...(withLinks ? { frameLinks } : {})}
    />,
  );
}

it('makes the frame name the row’s one control, wearing the frame’s glyph, so no button sits inside another', () => {
  const linked = markup(true);
  expect(linked).toContain('data-testid="tool-row-frame-link"');
  expect(linked).toContain('data-frame-id="f1"');
  expect(linked).toContain('data-testid="frame-glyph"');
  expect(linked.match(/<button/g)).toHaveLength(1);
});

it('draws one link while running, though the shimmer draws the sentence twice', () => {
  expect(markup(true, 'running').match(/data-testid="tool-row-frame-link"/g)).toHaveLength(1);
});

it('keeps the plain expandable row when the app gives the name nowhere to go', () => {
  const plain = markup(false);
  expect(plain).not.toContain('tool-row-frame-link');
  expect(plain).toContain('aria-expanded');
});
