import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatPanelFrame } from './ChatPanelFrame.js';
import { t } from '@studio/i18n';

function render(props: Parameters<typeof ChatPanelFrame>[0]): string {
  return renderToStaticMarkup(<ChatPanelFrame {...props} />);
}

function buttonSlice(markup: string, testid: string): string {
  const at = markup.indexOf(`data-testid="${testid}"`);
  expect(at).toBeGreaterThan(-1);
  // From the opening tag, not the testid: an attribute the library emits earlier would be invisible.
  const open = markup.lastIndexOf('<button', at);
  return markup.slice(open, markup.indexOf('</button>', at));
}

const newChatButton = (markup: string): string => buttonSlice(markup, 'chat-new');

it('backs the chat panel with the Canvas ground instead of filtering a live Frame', () => {
  const markup = render({ children: null });
  expect(markup).not.toContain('backdrop-filter');
  expect(markup).toContain('background-color:var(--studio-ground)');
  expect(markup).toContain('background-image:linear-gradient(var(--color-background-surface), var(--color-background-surface))');
});

describe('the chat header new-chat control (ONL-2198)', () => {
  it('acts when nothing refuses it', () => {
    const button = newChatButton(render({ children: null, onNewChat: () => {} }));

    expect(button).not.toContain('aria-disabled');
    expect(button).not.toContain('cursor:default');
  });

  it('refuses mid-turn and names the Stop already on screen', () => {
    const markup = render({ children: null, newChatRefusal: t('chat.header.newBusy') });

    expect(markup).toContain(t('chat.header.newBusy'));
    // `aria-disabled`, not `disabled`: the reason has to stay reachable (ONL-2198).
    expect(newChatButton(markup)).toContain('aria-disabled="true"');
  });

  it('refuses on an already-empty chat, so nothing confirms forgetting nothing', () => {
    const markup = render({ children: null, newChatRefusal: t('chat.header.newEmpty') });

    expect(markup).toContain(t('chat.header.newEmpty'));
    expect(newChatButton(markup)).toContain('aria-disabled="true"');
  });

  it('keeps the notifications bell usable while a turn runs', () => {
    for (const props of [
      { children: null, onNewChat: () => {} },
      { children: null, newChatRefusal: t('chat.header.newBusy') },
    ]) {
      expect(buttonSlice(render(props), 'chat-notifications')).not.toContain('aria-disabled="true"');
    }
  });
});
