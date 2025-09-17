import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
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

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const { messages: uiMessages, isWaiting } = useChatContext();
    const conversation = editorEngine.chat.conversation.current;
    const engineMessages = editorEngine.chat.conversation.current?.messages;

    const renderMessage = useCallback((message: ChatMessage, index: number) => {
        let messageNode;
        switch (message.role) {
            case 'assistant':
                messageNode = <AssistantMessage message={message} />;
                break;
            case 'user':
                messageNode = <UserMessage message={message} />;
                break;
            case 'system':
                messageNode = null;
                break;
            default:
                assertNever(message.role);
        }
        return <div key={`message-${message.id}-${index}`}>{messageNode}</div>;
    }, []);

    // Exclude the currently streaming assistant message (rendered by <StreamMessage />)
    const messagesToRender = useMemo(() => {
        if (!engineMessages || engineMessages.length === 0) return [] as ChatMessage[];

        const lastUiMessage = uiMessages?.[uiMessages.length - 1];
        const streamingAssistantId = isWaiting && lastUiMessage?.role === 'assistant' ? lastUiMessage.id : undefined;

        if (!streamingAssistantId) return engineMessages;

        return (engineMessages).filter((m) => m.id !== streamingAssistantId);
    }, [engineMessages, uiMessages, isWaiting]);

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-row items-center justify-center text-foreground-tertiary/80 h-full gap-2">
                <Icons.LoadingSpinner className="animate-spin" />
                <p className="text-regularPlus">Loading conversation...</p>
            </div>
        );
    }

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
        <ChatMessageList contentKey={`${messagesToRender.map((m) => m.id).join('|')}${isWaiting ? `|${uiMessages?.[uiMessages.length - 1]?.id ?? ''}` : ''}`}>
            {messagesToRender.map((message, index) => renderMessage(message, index))}
            <StreamMessage />
            <ErrorMessage />
        </ChatMessageList>
    );
});
