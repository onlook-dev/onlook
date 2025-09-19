import { type ChatMessage } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { useChat } from '../../../../_hooks/use-chat';
import { ChatInput } from '../chat-input';
import { ChatMessages } from '../chat-messages';
import { ErrorSection } from '../error';

interface ChatTabContentProps {
    conversationId: string;
    projectId: string;
    initialMessages: ChatMessage[];
    isLoadingMessages: boolean;
}

export const ChatTabContent = ({
    conversationId,
    projectId,
    initialMessages,
    isLoadingMessages,
}: ChatTabContentProps) => {
    const { isStreaming, sendMessage, editMessage, messages, error, stop, suggestions } = useChat({
        conversationId,
        projectId,
        initialMessages,
    });

    return (
        <div className="flex flex-col h-full justify-end gap-2 pt-2">
            <div className="h-full flex-1 overflow-y-auto">
                {isLoadingMessages ? (
                    <div className="flex-1 flex items-center justify-center w-full h-full text-foreground-secondary">
                        <Icons.LoadingSpinner className="animate-spin mr-2" />
                        <p>Loading messages...</p>
                    </div>
                ) : (<ChatMessages
                    messages={messages}
                    isStreaming={isStreaming}
                    error={error}
                    onEditMessage={editMessage}
                />)}
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
};
