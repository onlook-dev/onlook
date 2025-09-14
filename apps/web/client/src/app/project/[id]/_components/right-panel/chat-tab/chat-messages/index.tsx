import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { ChatMessageList } from '@onlook/ui/chat/chat-message-list';
import { Icons } from '@onlook/ui/icons';
import { assertNever } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { StreamMessage } from './stream-message';
import { UserMessage } from './user-message';

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const conversation = editorEngine.chat.conversation.current;
    const { streamingMessage } = useChatContext();
    if (!conversation) {
        return (
            <div className="flex-1 flex flex-row items-center justify-center text-foreground-tertiary/80 h-full gap-2">
                <Icons.LoadingSpinner className="animate-spin" />
                <p className="text-regularPlus">Loading conversation...</p>
            </div>
        );
    }

    return (
        <ChatMessageList contentKey={streamingMessage?.parts?.join('') ?? ''}>
            <RenderedChatMessages />
            <StreamMessage />
            <ErrorMessage />
        </ChatMessageList>
    );
});

export const RenderedChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const { streamingMessage, isWaiting } = useChatContext();
    const engineMessages = editorEngine.chat.conversation.current?.messages;
    const messagesToRender = useMemo(() => isWaiting ?
        engineMessages?.filter((m) => m.id !== streamingMessage?.id) :
        engineMessages,
        [engineMessages, isWaiting, streamingMessage]);

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

    return messagesToRender.map((message, index) => {
        let messageNode;
        switch (message.role) {
            case 'assistant':
                messageNode = <AssistantMessage message={message} />;
                break;
            case 'user':
                messageNode = <UserMessage message={message} />;
                break;
            case 'system':
                messageNode = null
                break;
            default:
                assertNever(message.role);
        }
        return <div key={`message-${message.id}-${index}`}>{messageNode}</div>;
    })
});