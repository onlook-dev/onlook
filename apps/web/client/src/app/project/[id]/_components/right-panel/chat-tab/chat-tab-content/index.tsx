import { type ChatMessage, type DomElement } from '@onlook/models';
import { useRef } from 'react';
import { useChat } from '../../../../_hooks/use-chat';
import { ChatInput } from '../chat-input';
import { type ChatMessagesHandle, ChatMessages } from '../chat-messages';
import { ErrorSection } from '../error';

interface ChatTabContentProps {
    conversationId: string;
    selectedElements: DomElement[];
    projectId: string;
    initialMessages: ChatMessage[];
}

export const ChatTabContent = ({
    conversationId,
    projectId,
    initialMessages,
    selectedElements,
}: ChatTabContentProps) => {
    const { isStreaming, sendMessage, editMessage, messages, error, stop, queuedMessages, removeFromQueue } = useChat({
        conversationId,
        projectId,
        initialMessages,
    });
    const chatMessagesRef = useRef<ChatMessagesHandle>(null);

    const handleScrollToBottom = () => {
        chatMessagesRef.current?.scrollToBottom();
    };

    return (
        <div className="flex flex-col h-full justify-end gap-2 pt-2">
            <ChatMessages
                ref={chatMessagesRef}
                selectedElements={selectedElements}
                messages={messages}
                isStreaming={isStreaming}
                error={error}
                onEditMessage={editMessage}
            />
            <ErrorSection isStreaming={isStreaming} onSendMessage={sendMessage} />
            <ChatInput
                messages={messages}
                isStreaming={isStreaming}
                onStop={stop}
                onSendMessage={sendMessage}
                onScrollToBottom={handleScrollToBottom}
                queuedMessages={queuedMessages}
                removeFromQueue={removeFromQueue}
            />
        </div>
    );
};
