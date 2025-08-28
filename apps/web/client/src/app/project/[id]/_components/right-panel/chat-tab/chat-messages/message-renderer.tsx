import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { type ChatMessage } from '@onlook/models/chat';
import { observer } from 'mobx-react-lite';
import { memo, useMemo } from 'react';

interface MessageRendererProps {
    children: (messagesToRender: ChatMessage[], contentKey: string) => React.ReactNode;
}

const MessageRendererComponent = observer(({ children }: MessageRendererProps) => {
    const editorEngine = useEditorEngine();
    const { messages: uiMessages, isWaiting } = useChatContext();
    const engineMessages = editorEngine.chat.conversation.current?.messages;

    const messagesToRender = useMemo(() => {
        if (!engineMessages || engineMessages.length === 0) return [] as ChatMessage[];

        if (!isWaiting) return engineMessages;

        const lastUiMessage = uiMessages?.[uiMessages.length - 1];
        console.log('lastUiMessage', lastUiMessage);
        const streamingAssistantId = lastUiMessage?.role === 'assistant' ? lastUiMessage.id : undefined;

        if (!streamingAssistantId) return engineMessages;

        return engineMessages.filter((m) => m.id !== streamingAssistantId);
    }, [
        engineMessages, 
        isWaiting,
        uiMessages?.[uiMessages?.length - 1]?.id
    ]);

    const contentKey = useMemo(() => {
        const messageIds = messagesToRender.map((m) => m.id).join('|');
        return isWaiting ? `${messageIds}|streaming` : messageIds;
    }, [messagesToRender, isWaiting]);

    return <>{children(messagesToRender, contentKey)}</>;
});

export const MessageRenderer = memo(MessageRendererComponent);

MessageRenderer.displayName = 'MessageRenderer';
