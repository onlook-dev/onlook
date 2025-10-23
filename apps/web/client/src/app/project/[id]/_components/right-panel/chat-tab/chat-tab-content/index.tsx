import type { ChatMessage } from '@onlook/models';
import { Button } from '@onlook/ui/button';

import { useChat } from '../../../../_hooks/use-chat';
import { ChatInput } from '../chat-input';
import { ChatMessages } from '../chat-messages';

interface ChatTabContentProps {
    conversationId: string;
    projectId: string;
    initialMessages: ChatMessage[];
}

export const ChatTabContent = ({
    conversationId,
    projectId,
    initialMessages,
}: ChatTabContentProps) => {
    const {
        isStreaming,
        sendMessage,
        editMessage,
        messages,
        error,
        stop,
        queuedMessages,
        removeFromQueue,
    } = useChat({
        conversationId,
        projectId,
        initialMessages,
    });

    // TEMP: Log re-renders
    if (typeof window !== 'undefined' && (window as any).__ONLOOK_PERF_LOG) {
        console.log('[RENDER] ChatTabContent', performance.now());
    }

    if (isStreaming) {
        return <Button onClick={stop}>Stop Response</Button>;
    }

    return (
        <div className="flex h-full flex-col justify-end gap-2 pt-2">
            {!isStreaming && (
                <ChatMessages
                    messages={messages}
                    isStreaming={isStreaming}
                    error={error}
                    onEditMessage={editMessage}
                />
            )}
            {/* TEMP: Remove ErrorSection to test performance */}
            {/* <ErrorSection isStreaming={isStreaming} onSendMessage={sendMessage} /> */}
            {/* TEMP: Remove ChatInput to test performance */}
            <ChatInput
                messages={[]}
                isStreaming={isStreaming}
                onStop={stop}
                onSendMessage={sendMessage}
                queuedMessages={queuedMessages}
                removeFromQueue={removeFromQueue}
            />
        </div>
    );
};
