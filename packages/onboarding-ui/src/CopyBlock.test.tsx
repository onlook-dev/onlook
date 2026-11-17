import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopyBlock } from './CopyBlock.js';
import { noop } from './testing.js';

const props = { text: 'xcode-select --install', copyLabel: 'Copy', copiedLabel: 'Copied', copyGlyph: 'P', copiedGlyph: 'K' };

describe('CopyBlock', () => {
  test('draws the line, its copy control and nothing else when there is nowhere to take it', () => {
    const html = renderToStaticMarkup(<CopyBlock {...props} onCopy={noop} />);
    expect(html).toContain('xcode-select --install');
    expect(html).toContain('copy-block-copy');
    expect(html).not.toContain('copy-block-action');
    expect(html).not.toContain('copy-block-copied');
  });

  test('each place to take it gets its own action', () => {
    const html = renderToStaticMarkup(
      <CopyBlock {...props} onCopy={noop} actions={[
        { id: 'codex', label: 'Open ChatGPT', onPress: noop },
        { id: 'claude', label: 'Open Claude', copiesFirst: true, onPress: noop },
      ]} />,
    );
    expect(html).toContain('copy-block-action-codex');
    expect(html).toContain('copy-block-action-claude');
    expect(html).toContain('Open Claude');
  });
});
