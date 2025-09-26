'use client';

import { api } from '@/trpc/react';
import { type ChatMessage } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { memo } from 'react';
import { useChat } from '../../../../_hooks/use-chat';
import { ChatInput } from '../chat-input';
import { ChatMessages } from '../chat-messages';
import { ErrorSection } from '../error';

interface ChatConversationProps {
    conversationId: string;
    projectId: string;
    isActive: boolean;
}

export const ChatConversation = memo(({
    conversationId,
    projectId,
    isActive,
}: ChatConversationProps) => {
    const { data: initialMessages, isLoading } = api.chat.message.getAll.useQuery(
        { conversationId },
        { enabled: !!conversationId }
    );

    const { isStreaming, sendMessage, editMessage, messages, error, stop, suggestions } = useChat({
        conversationId,
        projectId,
        initialMessages: initialMessages || [],
    });

    if (isLoading) {
        return (
            <div className={`flex flex-col h-full justify-center items-center ${!isActive ? 'hidden' : ''}`}>
                <Icons.LoadingSpinner className="animate-spin mr-2" />
                <p>Loading messages...</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full justify-end gap-2 pt-2 ${!isActive ? 'hidden' : ''}`}>
            <div className="h-full flex-1 overflow-y-auto">
                <ChatMessages
                    messages={messages}
                    isStreaming={isStreaming}
                    error={error}
                    onEditMessage={editMessage}
                />
            </div>
            <ErrorSection isStreaming={isStreaming} onSendMessage={sendMessage} />
            <ChatInput
                messages={messages}
                suggestions={suggestions}
                isStreaming={isStreaming}
                onStop={stop}
                onSendMessage={sendMessage}
            />
        </div>
    );
});
