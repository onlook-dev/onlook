'use client';

import { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

import type { ChatMessage } from '@onlook/models/chat';
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from '@onlook/ui/ai-elements';
import { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';

import type { EditMessage } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { UserMessage } from './user-message';

interface ChatMessagesProps {
    messages: ChatMessage[];
    onEditMessage: EditMessage;
    isStreaming: boolean;
    error?: Error;
}

export const ChatMessages = observer(
    ({ messages, onEditMessage, isStreaming, error }: ChatMessagesProps) => {
        const editorEngine = useEditorEngine();
        const t = useTranslations();

        const renderMessage = useCallback(
            (message: ChatMessage, index: number) => {
                let messageNode;
                switch (message.role) {
                    case 'assistant':
                        messageNode = (
                            <AssistantMessage
                                key={message.id}
                                message={message}
                                isStreaming={isStreaming}
                            />
                        );
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
                return (
                    <div key={`message-${message.id}-${index}`} className="my-2">
                        {messageNode}
                    </div>
                );
            },
            [onEditMessage],
        );

        if (!messages || messages.length === 0) {
            return (
                !editorEngine.elements.selected.length && (
                    <div className="text-foreground-tertiary/80 flex h-full flex-1 flex-col items-center justify-center">
                        <Icons.EmptyState className="size-32" />
                        <p className="text-regularPlus max-w-[300px] text-center text-balance">
                            {t(transKeys.editor.panels.edit.tabs.chat.emptyState)}
                        </p>
                    </div>
                )
            );
        }

        return (
            <Conversation className="h-full w-full">
                <ConversationContent className="m-0 p-0">
                    {messages.map((message, index) => renderMessage(message, index))}
                    {error && <ErrorMessage error={error} />}
                    {isStreaming && (
                        <div className="text-small text-foreground-secondary my-2 flex h-full w-full flex-row content-start items-center gap-2 px-4">
                            <Icons.LoadingSpinner className="animate-spin" />
                            <p>Thinking ...</p>
                        </div>
                    )}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>
        );
    },
);
