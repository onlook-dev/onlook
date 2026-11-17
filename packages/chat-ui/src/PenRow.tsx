import type { ReactNode } from 'react';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { ChatMessage, ChatMessageBubble } from '@astryxdesign/core/Chat';
import { penLabel, type PenView } from '@studio/events';
import type { ChatPenStrings } from './strings.js';

/** Each act carries the id it saw; main refuses a retired one (ONL-2294). */
export interface PenActions {
  onTake: (penId: number) => void;
  onDiscard: (penId: number) => void;
}

const PEN_REVEAL = `
.chat-pen { --studio-submitted-attachments-fade: transparent; }
.chat-pen .astryx-chat-message-bubble {
  position: relative;
  background: transparent !important;
  box-shadow: inset 0 0 0 0.5px var(--color-border);
  color: var(--color-text-disabled);
}
.chat-pen .chat-pen-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.chat-pen .chat-pen-actions { opacity: 0; }
.chat-pen:hover .chat-pen-actions, .chat-pen:focus-within .chat-pen-actions { opacity: 1; }
`;

/** The outline and grey ink are what keep it from reading as already sent (ONL-2294). */
export function PenRow({
  pen,
  strings,
  actions,
  icons,
  isLive,
  needsAttention,
  attachments,
}: {
  pen: PenView;
  strings: ChatPenStrings;
  actions: PenActions;
  icons: { edit: ReactNode; discard: ReactNode };
  isLive: boolean;
  needsAttention: boolean;
  attachments?: ReactNode;
}): ReactNode {
  const label = penLabel({
    isLive,
    needsAttention,
    ...(pen.verdict ? { verdict: pen.verdict } : {}),
  });
  return (
    <ChatMessage
      sender="user"
      data-testid="chat-pen"
      data-pen-label={label}
      className="chat-pen"
    >
      <style href="chat-pen-reveal" precedence="medium">
        {PEN_REVEAL}
      </style>
      <ChatMessageBubble>
        {/* `output` carries the status role implicitly: the sentence changes under a reader with no other cue (ONL-2519). */}
        <output className="chat-pen-status">{strings.labels[label]}</output>
        <VStack gap={2} style={{ minWidth: 0 }}>
          {attachments}
          <span style={{ whiteSpace: 'pre-wrap' }} data-testid="chat-pen-text">
            {pen.text === ''
              ? strings.attachmentsOnly(pen.attachments?.length ?? 0)
              : pen.text}
          </span>
        </VStack>
        <HStack
          gap={0}
          vAlign="center"
          className="chat-pen-actions"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            borderRadius: 'var(--radius-element)',
            background: 'var(--color-background-surface)',
          }}
        >
          <IconButton
            label={strings.takeLabel}
            tooltip={strings.takeLabel}
            icon={icons.edit}
            variant="ghost"
            size="sm"
            onClick={() => actions.onTake(pen.penId)}
            data-testid="chat-pen-take"
          />
          <IconButton
            label={strings.discardLabel}
            tooltip={strings.discardLabel}
            icon={icons.discard}
            variant="ghost"
            size="sm"
            onClick={() => actions.onDiscard(pen.penId)}
            data-testid="chat-pen-discard"
          />
        </HStack>
      </ChatMessageBubble>
    </ChatMessage>
  );
}
