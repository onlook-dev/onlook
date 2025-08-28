
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
import { MessageRenderer } from './message-renderer';
import { StreamMessage } from './stream-message';
import { UserMessage } from './user-message';

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const conversation = editorEngine.chat.conversation.current;

    const renderMessage = useCallback((message: ChatMessage) => {
        let messageNode;
        switch (message.role) {
            case ChatMessageRole.ASSISTANT:
                messageNode = <AssistantMessage message={message} />;
                break;
            case ChatMessageRole.USER:
                messageNode = <UserMessage message={message} />;
                break;
            default:
                assertNever(message);
        }
        return messageNode;
    }, []);

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-row items-center justify-center text-foreground-tertiary/80 h-full gap-2">
                <Icons.LoadingSpinner className="animate-spin" />
                <p className="text-regularPlus">Loading conversation...</p>
            </div>
        );
    }

    return (
        <MessageRenderer>
            {(messagesToRender: ChatMessage[], contentKey: string) => {
                if (!messagesToRender || messagesToRender.length === 0) {
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
                    <ChatMessageList contentKey={contentKey}>
                        {messagesToRender.map((message: ChatMessage) => (
                            <div key={`message-${message.id}`}>
                                {renderMessage(message)}
                            </div>
                        ))}
                        <StreamMessage />
                        <ErrorMessage />
                    </ChatMessageList>
                );
            }}
        </MessageRenderer>
    );
});
