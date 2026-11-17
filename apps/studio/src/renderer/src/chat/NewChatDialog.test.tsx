import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewChatDialog } from './NewChatDialog.js';
import { t } from '@studio/i18n';

function render(isOpen: boolean): string {
  return renderToStaticMarkup(
    <NewChatDialog
      isOpen={isOpen}
      isInline
      onOpenChange={() => {}}
      onConfirm={() => Promise.resolve({ accepted: true })}
    />,
  );
}

describe('the new-chat confirm (ONL-2198)', () => {
  it('names what is lost and what survives, and promises nothing about getting it back', () => {
    const markup = render(true);

    expect(markup).toContain(t('chat.newChat.confirm.title'));
    expect(markup).toContain('forgets this conversation');
    expect(markup).toContain('untouched');
    // The only way to take back an always-allow, so the dialog has to say so (ONL-2933).
    expect(markup).toContain('requests you always allowed');
    // Nothing in this change can reach the old chat until the history surface ships (ONL-2325).
    expect(markup).not.toContain('kept');
  });

  it('carries its own cancel label rather than the library default', () => {
    expect(render(true)).toContain(t('chat.newChat.confirm.cancel'));
  });

  it('opens on the question, never on a previous attempt’s failure', () => {
    expect(render(true)).not.toContain(t('chat.newChat.failed'));
  });
});
