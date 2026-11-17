import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatScrollButton } from './ChatScrollButton.js';

function render(isStreaming: boolean, isVisible = true, label?: string): string {
  return renderToStaticMarkup(<ChatScrollButton isStreaming={isStreaming} isVisible={isVisible} label={label} actionLabel="Scroll to bottom" onClick={() => {}} />);
}

describe('chat scroll indicator', () => {
  test('shows exactly three decorative dots while streaming away from the bottom', () => {
    const html = render(true);
    expect(html.match(/class="chat-scroll-dot"/g)).toHaveLength(3);
    expect(html).toContain('class="chat-scroll-dots" aria-hidden="true"');
    expect(html).not.toContain('data-testid="chat-scroll-chevron"');
    expect(html).toContain('aria-label="Scroll to bottom"');
  });

  test('restores the chevron when streaming ends', () => {
    const html = render(false);
    expect(html).toContain('data-testid="chat-scroll-chevron"');
    expect(html).not.toContain('class="chat-scroll-dot"');
  });

  test.each([false, true])('the hidden control cannot animate or receive focus while streaming=%s', (streaming) => {
    const html = render(streaming, false);
    expect(html).toContain('data-visible="false"');
    expect(html).toContain('inert=""');
    expect(html).not.toContain('class="chat-scroll-dot"');
  });

  test('keeps the streaming pill at the dots, with the news in its name only', () => {
    const html = render(true, true, 'New messages');
    expect(html).toMatch(/<button[^>]*aria-label="New messages"[\s\S]*?class="chat-scroll-dots"[\s\S]*?<\/button>/);
    expect(html).not.toMatch(/>[^<]*New messages/);
    expect(html).toContain('data-expanded="false"');
  });

  test('spells out the news once the response ends', () => {
    const html = render(false, true, 'New messages');
    expect(html).toContain('data-expanded="true"');
    expect(html).toMatch(/>[^<]*New messages/);
    expect(html).toContain('data-testid="chat-scroll-chevron"');
    expect(html).not.toContain('aria-label="Scroll to bottom"');
  });

  test('names the collapsed pill after the action it performs', () => {
    const html = render(true);
    expect(html).toContain('aria-label="Scroll to bottom"');
    expect(html).not.toContain('>Scroll to bottom<');
  });
});
