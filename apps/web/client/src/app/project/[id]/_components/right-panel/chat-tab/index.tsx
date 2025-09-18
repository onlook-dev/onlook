import { api } from '@/trpc/react';
import { ChatTabContent } from './chat-tab-content';

interface ChatTabProps {
    conversationId: string;
    projectId: string;
}

export const ChatTab = ({ conversationId, projectId }: ChatTabProps) => {
    const { data: initialMessages, isLoading } = api.chat.message.getAll.useQuery(
        { conversationId: conversationId },
        { enabled: !!conversationId },
    );

    if (!initialMessages || isLoading) {
        return null;
    }

    return (
        <ChatTabContent
            // Used to force re-render the use-chat hook when the conversationId changes
            key={conversationId}
            conversationId={conversationId}
            projectId={projectId}
            initialMessages={initialMessages}
        />
    );
};
