import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageThumbnail } from './ImageThumbnail.js';

// No DOM runner here, so only the mount state renders; the resolved and gone
// tiles are the showroom's `images` category (ONL-2485).
function mounted(): string {
  return renderToStaticMarkup(
    <ImageThumbnail
      image={{ id: 'img-1', mediaType: 'image/png', width: 8, height: 8 }}
      resolve={() => new Promise<string | null>(() => undefined)}
      alt="An image in the conversation"
      unavailableLabel="Image unavailable"
    />,
  );
}

describe('an image tile that has not resolved', () => {
  it('renders the loading tile', () => {
    expect(mounted()).toContain('data-testid="chat-image-loading"');
  });

  it('says nothing — no label, no role, no text until the bytes land', () => {
    const html = mounted();
    expect(html).not.toContain('Image unavailable');
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain('aria-label');
  });
});
