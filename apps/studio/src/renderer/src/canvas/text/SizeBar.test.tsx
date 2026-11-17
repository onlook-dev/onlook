// Markup only: Bun has no DOM, so the shown size arrives as a prop. Whether the popover
// actually takes a press is an app and showroom question (ONL-2486).

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANVAS_TEXT_SIZES } from '@studio/events';
import { CANVAS_OVERLAY_SELECTOR } from './placement.js';
import { TextSizeBarSurface } from './SizeBar.js';

function markup(size: Parameters<typeof TextSizeBarSurface>[0]['size']): string {
  return renderToStaticMarkup(<TextSizeBarSurface size={size} onPick={() => undefined} />);
}

/** `[data-canvas-overlay]` → `data-canvas-overlay`, the attribute the markup carries. */
const OVERLAY_ATTRIBUTE = CANVAS_OVERLAY_SELECTOR.slice(1, -1);

describe('what the text size bar draws', () => {
  it('marks itself as one of the canvas’s own overlays, so a press on it never commits the caret', () => {
    expect(markup('medium')).toContain(OVERLAY_ATTRIBUTE);
  });

  it('offers a control for every size the document knows', () => {
    const html = markup('medium');
    for (const size of CANVAS_TEXT_SIZES) expect(html, size).toContain(`data-size="${size}"`);
  });

  it('presses the size the selection shares', () => {
    expect(markup('large')).toContain('aria-pressed="true"');
  });

  it('presses none when the selection holds more than one size', () => {
    expect(markup(null)).not.toContain('aria-pressed="true"');
  });
});
