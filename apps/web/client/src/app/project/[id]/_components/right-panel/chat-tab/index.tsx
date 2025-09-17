import { api } from '@/trpc/react';
import { ChatTabContent } from './chat-tab-content';

interface ChatTabProps {
    conversationId: string;
    projectId: string;
}

export const ChatTab = ({ conversationId, projectId }: ChatTabProps) => {
    const { data: initialMessages } = api.chat.message.getAll.useQuery(
        { conversationId: conversationId },
        { enabled: !!conversationId },
    );

    if (!initialMessages) {
        return null;
    }

    return (
        <ChatTabContent
            conversationId={conversationId}
            projectId={projectId}
            initialMessages={initialMessages}
        />
    );
};
