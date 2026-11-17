// Markup only: Bun has no DOM, so hover and selection arrive here as the props the canvas passes.

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageNodeSurface, imageReadState, type ImageNodeSurfaceProps } from './ImageNode.js';

const NAME = 'checkout-hero.png';

function markup(over: Partial<ImageNodeSurfaceProps> = {}): string {
  return renderToStaticMarkup(
    <ImageNodeSurface name={NAME} state="reading" isSelected={false} {...over} />,
  );
}

describe('which state a node with bytes in flight shows', () => {
  it('holds the reserved state until the read for its own id lands', () => {
    expect(imageReadState('one', null).state).toBe('reading');
    // A read for the previous id is not this node's answer.
    expect(imageReadState('two', { id: 'one', url: 'blob:one' }).state).toBe('reading');
  });

  it('calls only a resolved absence missing', () => {
    expect(imageReadState('one', { id: 'one', url: null }).state).toBe('missing');
    expect(imageReadState('one', { id: 'one', url: 'blob:one' })).toEqual({
      state: 'resolved',
      url: 'blob:one',
    });
  });
});

describe('what an image node draws', () => {
  it('reserves a plain box with no picture and no spinner while the bytes are read', () => {
    const html = markup();
    expect(html).toContain('data-image-state="reading"');
    expect(html).not.toContain('<img');
    expect(html).not.toContain(NAME);
  });

  it('draws the picture once the bytes resolve', () => {
    const html = markup({ state: 'resolved', url: 'blob:held' });
    expect(html).toContain('data-image-state="resolved"');
    expect(html).toContain('<img');
    expect(html).toContain('blob:held');
  });

  it('names the file when the bytes are gone, and offers no picture to break', () => {
    const html = markup({ state: 'missing' });
    expect(html).toContain('data-image-state="missing"');
    expect(html).toContain('canvas-image-missing');
    expect(html).toContain(NAME);
    expect(html).not.toContain('<img');
  });

  it('shows the stored name on hover and on selection, and neither at rest', () => {
    expect(markup({ state: 'resolved', url: 'blob:held' })).not.toContain('canvas-image-label');
    expect(markup({ state: 'resolved', url: 'blob:held', isHovered: true })).toContain(
      'canvas-image-label',
    );
    expect(markup({ state: 'resolved', url: 'blob:held', isSelected: true })).toContain(
      'canvas-image-label',
    );
  });

  it('describes the picture by its stored alt where there is one, and by its name otherwise', () => {
    expect(markup({ state: 'resolved', url: 'blob:held', alt: 'the checkout page' })).toContain(
      'alt="the checkout page"',
    );
    expect(markup({ state: 'resolved', url: 'blob:held' })).toContain(`alt="${NAME}"`);
  });
});
