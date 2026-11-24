import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAT_GALLERY } from './chat.js';

describe('Chat setup stories', () => {
  it('shows install output directly, matching install failures in the app', () => {
    const story = CHAT_GALLERY.categories
      .flatMap((category) => category.stories)
      .find((candidate) => candidate.id === 'chat-setup-failed');
    expect(story).toBeDefined();
    const markup = renderToStaticMarkup(story!.render());
    expect(markup).toContain('ERR_PNPM_NO_LOCKFILE');
    expect(markup).toContain('pnpm-lock.yaml is absent');
    expect(markup).toContain('data-testid="chat-setup-retry"');
    expect(markup).not.toContain('data-testid="chat-setup-output-toggle"');
  });
});
