'use client';

import type { EditMessage } from '@/app/project/[id]/_hooks/use-chat';
import { transKeys } from '@/i18n/keys';
import type { DomElement } from '@onlook/models';
import { type ChatMessage } from '@onlook/models/chat';
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton
} from '@onlook/ui/ai-elements';
import { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';
import { useTranslations } from 'next-intl';
import { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { UserMessage } from './user-message';

interface ChatMessagesProps {
    messages: ChatMessage[];
    selectedElements: DomElement[];
    onEditMessage: EditMessage;
    isStreaming: boolean;
    error?: Error;
}

export interface ChatMessagesHandle {
    scrollToBottom: () => void;
}

export const ChatMessages = forwardRef<ChatMessagesHandle, ChatMessagesProps>(({ selectedElements, messages, onEditMessage, isStreaming, error }, ref) => {
    const t = useTranslations();

    const ScrollController = () => {
        const { scrollToBottom } = useStickToBottomContext();

        useImperativeHandle(ref, () => ({
            scrollToBottom,
        }), [scrollToBottom]);

        return null;
    };

    const renderMessage = useCallback(
        (message: ChatMessage) => {
            let messageNode;
            switch (message.role) {
                case 'assistant':
                    messageNode = <AssistantMessage key={message.id} message={message} isStreaming={isStreaming} />;
                    break;
                case 'user':
                    messageNode = (
                        <UserMessage
                            key={message.id}
                            onEditMessage={onEditMessage}
                            message={message}
                        />
                    );
                    break;
                case 'system':
                    messageNode = null;
                    break;
                default:
                    assertNever(message.role);
            }
            return <div key={message.id} className="my-2">{messageNode}</div>;
        },
        [onEditMessage, isStreaming],
    );

    if (!messages || messages.length === 0) {
        return (
            !selectedElements.length && (
                <div className="flex-1 flex flex-col items-center justify-center text-foreground-tertiary/80 h-full">
                    <Icons.EmptyState className="size-32" />
                    <p className="text-center text-regularPlus text-balance max-w-[300px]">
                        {t(transKeys.editor.panels.edit.tabs.chat.emptyState)}
                    </p>
                </div>
            )
        );
    }

    return (
        <Conversation className="h-full w-full flex-1">
            <ConversationContent className="p-0 m-0">
                {messages.map((message) => renderMessage(message))}
                {error && <ErrorMessage error={error} />}
                {isStreaming && <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.LoadingSpinner className="animate-spin" />
                    <p>Thinking ...</p>
                </div>}
            </ConversationContent>
            <ConversationScrollButton />
            <ScrollController />
        </Conversation>
    );
});

