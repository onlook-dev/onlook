import { Icons } from '@onlook/ui/icons/index';

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
        return (
            <div className="text-foreground-secondary flex h-full w-full flex-1 items-center justify-center">
                <Icons.LoadingSpinner className="mr-2 animate-spin" />
                <p>Loading messages...</p>
            </div>
        );
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
