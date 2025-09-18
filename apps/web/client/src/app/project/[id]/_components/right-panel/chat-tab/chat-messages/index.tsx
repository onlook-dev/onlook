import type { EditMessage } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { type ChatMessage } from '@onlook/models/chat';
import { ChatMessageList } from '@onlook/ui/chat/chat-message-list';
import { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { StreamMessage } from './stream-message';
import { UserMessage } from './user-message';

interface ChatMessagesProps {
    messages: ChatMessage[];
    onEditMessage: EditMessage;
    isStreaming: boolean;
    error?: Error;
}

export const ChatMessages = observer(
    ({ messages: baseMessages, onEditMessage, isStreaming, error }: ChatMessagesProps) => {
        const editorEngine = useEditorEngine();
        const t = useTranslations();

        const { messages, streamedMessage } = useMemo(() => {
            console.log('baseMessages', baseMessages.length, isStreaming);
            if (isStreaming) {
                return {
                    messages: baseMessages.slice(0, -1),
                    streamedMessage: baseMessages[baseMessages.length - 1],
                };
            }
            return {
                messages: baseMessages,
                streamedMessage: null,
            };
        }, [baseMessages, isStreaming]);

        const renderMessage = useCallback(
            (message: ChatMessage, index: number) => {
                let messageNode;
                switch (message.role) {
                    case 'assistant':
                        messageNode = <AssistantMessage key={message.id} message={message} />;
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
                return <div key={`message-${message.id}-${index}`}>{messageNode}</div>;
            },
            [onEditMessage],
        );

        if (!messages || messages.length === 0) {
            return (
                !editorEngine.elements.selected.length && (
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
            <ChatMessageList
                contentKey={`${messages.map((m) => m.id).join('|')}${isStreaming ? `|${messages?.[messages.length - 1]?.id ?? ''}` : ''}`}
            >
                {messages.map((message, index) => renderMessage(message, index))}
                {streamedMessage && <StreamMessage message={streamedMessage} />}
                {error && <ErrorMessage error={error} />}
            </ChatMessageList>
        );
    },
);
