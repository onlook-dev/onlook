import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons/index';
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
            <div className="flex-1 flex items-center justify-center w-full h-full text-foreground-secondary" >
                <Icons.LoadingSpinner className="animate-spin mr-2" />
                <p>Loading messages...</p>
            </div >
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
