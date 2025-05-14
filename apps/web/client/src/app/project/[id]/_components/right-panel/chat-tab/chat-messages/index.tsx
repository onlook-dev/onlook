import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import type { AssistantChatMessageImpl } from '@/components/store/editor/chat/message/assistant';
import type { UserChatMessageImpl } from '@/components/store/editor/chat/message/user';
import { ChatMessageRole } from '@onlook/models/chat';
import { ChatMessageList } from '@onlook/ui/chat/chat-message-list';
import { Icons } from '@onlook/ui/icons/index';
import { assertNever } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { AssistantMessage } from './assistant-message';
import { ErrorMessage } from './error-message';
import { StreamMessage } from './stream-message';
import { UserMessage } from './user-message';

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const { messages: uiMessages } = useChatContext();
    const messages = editorEngine.chat.conversation.current?.messages;

    const renderMessage = (message: AssistantChatMessageImpl | UserChatMessageImpl) => {
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
        return <div key={`message-${message.id}`}>{messageNode}</div>;
    };

    if (!messages || messages.length === 0) {
        return (
            !editorEngine.elements.selected.length && (
                <div className="flex-1 flex flex-col items-center justify-center text-foreground-tertiary/80 h-full">
                    <Icons.EmptyState className="size-32" />
                    <p className="text-center text-regularPlus text-balance max-w-[300px]">
                        {t('editor.panels.edit.tabs.chat.emptyState')}
                    </p>
                </div>
            )
        );
    }

    return (
        <ChatMessageList contentKey={uiMessages?.map((message) => message.content).join('|') ?? ''}>
            {messages?.map((message) => renderMessage(message))}
            <StreamMessage />
            <ErrorMessage />
        </ChatMessageList>
    );
});
