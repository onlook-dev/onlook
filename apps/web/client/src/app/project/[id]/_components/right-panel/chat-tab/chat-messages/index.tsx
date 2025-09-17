import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { ChatMessageRole, type ChatMessage } from '@onlook/models/chat';
import { ChatMessageList } from '@onlook/ui/chat/chat-message-list';
import { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { UserMessage } from './user-message';
import { StreamMessage } from './stream-message';

interface ChatMessagesProps {
    messages: ChatMessage[];
    onEditMessage: (messageId: string, newContent: string) => Promise<void>;
    isStreaming: boolean;
    error?: Error;
}

export const ChatMessages = observer(({ messages, onEditMessage, isStreaming, error }: ChatMessagesProps) => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();

    const renderMessage = useCallback((message: ChatMessage, index: number) => {
        let messageNode;
        switch (message.role) {
            case ChatMessageRole.ASSISTANT:
                messageNode = <AssistantMessage message={message} />;
                break;
            case ChatMessageRole.USER:
                messageNode = <UserMessage onEditMessage={onEditMessage} message={message} />;
                break;
            default:
                assertNever(message);
        }
        return <div key={`message-${message.id}-${index}`}>{messageNode}</div>;
    }, [onEditMessage]);

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
        <ChatMessageList contentKey={`${messages.map((m) => m.id).join('|')}${isStreaming ? `|${messages?.[messages.length - 1]?.id ?? ''}` : ''}`}>
            {messages.map((message, index) => renderMessage(message, index))}
            <StreamMessage messages={messages} isStreaming={isStreaming} />
            {error && <ErrorMessage error={error} />}
        </ChatMessageList>
    );
});
