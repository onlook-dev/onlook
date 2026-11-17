import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatPanel } from '@studio/chat-ui';
import { emptyState, type PromptAttachment } from '@studio/events';
import { CHAT_FIXTURE_STRINGS } from '../dev/ChatFixture.js';
import { ForwardIcon } from '../icons/glyphs.js';

function composerMarkup(interrupted: boolean, streaming: boolean, text = '', restoring = false, attachments: PromptAttachment[] = []): string {
  return renderToStaticMarkup(<ChatPanel state={{ ...emptyState, interrupted, isStreaming: streaming }} connection={{ status: 'ok' }} strings={CHAT_FIXTURE_STRINGS} composerValue={text} isComposerRestoring={restoring} composerAttachments={attachments} hasComposerPayload={attachments.length > 0} onComposerChange={() => undefined} onSend={() => undefined} onResume={() => undefined} onInterrupt={() => undefined} onRespond={() => undefined} onCopy={() => undefined} chevronIcon={ForwardIcon} />);
}

test('the stopped composer button exposes Resume, not the library Send label', () => {
  const markup = composerMarkup(true, false);
  expect(markup).toContain('aria-label="Resume"');
  expect(markup).not.toContain('aria-label="Send"');
});

test('typing, normal completion and streaming expose the matching action name', () => {
  expect(composerMarkup(true, false, 'Use a grid')).toContain('aria-label="Send"');
  expect(composerMarkup(false, false)).toContain('aria-label="Send"');
  expect(composerMarkup(true, true)).toContain('aria-label="Stop"');
});

test('an empty stopped composer sends its queued skill or document instead of resuming', () => {
  const attachments: PromptAttachment[] = [
    { kind: 'skill', name: 'design-review', description: 'Review the design.', agent: 'claude' },
    { kind: 'file', id: 'design-notes', name: 'notes.txt', mediaType: 'text/plain', originalSize: 42 },
  ];
  for (const attachment of attachments) {
    const markup = composerMarkup(true, false, '', false, [attachment]);
    expect(markup).toContain('aria-label="Send"');
    expect(markup).not.toContain('aria-label="Resume"');
    expect(markup.match(/<button[^>]*data-testid="chat-send"[^>]*>/)?.[0]).not.toContain('disabled');
  }
});

test('restoring recalled attachments blocks Resume and Send but leaves Stop available', () => {
  for (const text of ['', 'Use a grid']) {
    const action = composerMarkup(true, false, text, true).match(/<button[^>]*data-testid="chat-send"[^>]*>/)?.[0];
    expect(action).toContain('disabled');
    const settled = composerMarkup(true, false, text, false).match(/<button[^>]*data-testid="chat-send"[^>]*>/)?.[0];
    expect(settled).not.toContain('disabled');
  }
  const stop = composerMarkup(true, true, '', true).match(/<button[^>]*data-testid="chat-send"[^>]*>/)?.[0];
  expect(stop).not.toContain('disabled');
});
