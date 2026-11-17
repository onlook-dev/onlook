import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import { NodeResizeHandles } from '../NodeResizeHandles.js';
import { TextNodeSurface } from './TextNode.js';

describe('text wrapping markup (ONL-2521)', () => {
  for (const wrapWidth of [240, 720]) {
    it(`draws the authored ${wrapWidth}px width without scaling the font or constraining height`, () => {
      const html = renderToStaticMarkup(<TextNodeSurface
        text="The same words" size="medium" isSelected isEditing={false} wrapWidth={wrapWidth} zoom={0.5}
      />);
      expect(html).toContain(`width:${wrapWidth}px`);
      expect(html).not.toContain('max-width:480px');
      expect(html).toContain('font-size:28px');
      expect(html).toContain('white-space:pre-wrap');
      expect(html).not.toContain('overflow:hidden');
    });
  }

  it('retains intrinsic legacy layout until a width is authored', () => {
    const html = renderToStaticMarkup(<TextNodeSurface
      text="Legacy words" size="medium" isSelected={false} isEditing={false}
    />);
    expect(html).toContain('width:max-content');
    expect(html).toContain('max-width:480px');
  });

  it('exposes the four real corner grab targets, without edge controls', () => {
    const html = renderToStaticMarkup(<ReactFlowProvider><NodeResizeHandles
      id="t" testId="canvas-text-resize-handle" scale={2} cornersOnly
      bounds={{ minWidth: 1, minHeight: 1, maxWidth: Infinity, maxHeight: Infinity }}
    /></ReactFlowProvider>);
    for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      expect(html).toContain(`data-position="${position}"`);
    }
    for (const position of ['top', 'right', 'bottom', 'left']) {
      expect(html).not.toContain(`data-position="${position}"`);
    }
    expect(html.match(/data-testid="canvas-text-resize-handle"/g)).toHaveLength(4);
  });
});
