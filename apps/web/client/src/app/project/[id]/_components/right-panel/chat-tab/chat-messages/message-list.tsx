import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { ChatMessageRole, type ChatMessage } from '@onlook/models/chat';
import { assertNever } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { memo, useMemo } from 'react';
import { AssistantMessage } from './assistant-message';
import { UserMessage } from './user-message';

export const MessageList = memo(observer(() => {
    const editorEngine = useEditorEngine();
    const { messages: uiMessages, isWaiting } = useChatContext();
    const engineMessages = editorEngine.chat.conversation.current?.messages;

    // Exclude the currently streaming assistant message (rendered by <StreamMessage />)
    const messagesToRender = useMemo(() => {
        if (!engineMessages || engineMessages.length === 0) return [] as ChatMessage[];

        const lastUiMessage = uiMessages?.[uiMessages.length - 1];
        const streamingAssistantId = isWaiting && lastUiMessage?.role === 'assistant' ? lastUiMessage.id : undefined;

        if (!streamingAssistantId) return engineMessages;

        return (engineMessages).filter((m) => m.id !== streamingAssistantId);
    }, [engineMessages, uiMessages, isWaiting]);

    return messagesToRender.map((message, index) => {
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
        return <div key={`message-${message.id}-${index}`}>{messageNode}</div>;
    })
}));
