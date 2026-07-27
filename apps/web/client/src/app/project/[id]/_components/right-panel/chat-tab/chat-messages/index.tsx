'use client';

import type { EditMessage } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { type ChatMessage } from '@onlook/models/chat';
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton
} from '@onlook/ui/ai-elements';
import { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { ExamplePrompts } from './example-prompts';
import { UserMessage } from './user-message';

interface ChatMessagesProps {
    messages: ChatMessage[];
    onEditMessage: EditMessage;
    onSendMessage: (content: string, type: import('@onlook/models').ChatType) => void;
    isStreaming: boolean;
    error?: Error;
}

export const ChatMessages = observer(({
    messages,
    onEditMessage,
    onSendMessage,
    isStreaming,
    error,
}: ChatMessagesProps) => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();

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
            !editorEngine.elements.selected.length && (
                <ExamplePrompts onSelectPrompt={onSendMessage} />
            )
        );
    }

    return (
        <Conversation>
            <ConversationContent className="p-0 m-0">
                {messages.map((message) => renderMessage(message))}
                {error && <ErrorMessage error={error} />}
                {isStreaming && <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.LoadingSpinner className="animate-spin" />
                    <p>Thinking ...</p>
                </div>}
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
    );
});

