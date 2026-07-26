import { type ChatMessage } from '@onlook/models';
import { useChat } from '../../../../_hooks/use-chat';
import { ChatInput } from '../chat-input';
import { ChatMessages } from '../chat-messages';
import { ErrorSection } from '../error';
import { StepLimitBanner } from '../step-limit-banner';

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
        hitStepLimit,
        continueAfterStepLimit,
        dismissStepLimit,
    } = useChat({
        conversationId,
        projectId,
        initialMessages,
    });

    return (
        <div className="flex flex-col h-full justify-end gap-2 pt-2">
            <ChatMessages
                messages={messages}
                isStreaming={isStreaming}
                error={error}
                onEditMessage={editMessage}
            />
            <ErrorSection isStreaming={isStreaming} onSendMessage={sendMessage} />
            <StepLimitBanner
                show={hitStepLimit}
                onContinue={() => void continueAfterStepLimit()}
                onDismiss={dismissStepLimit}
            />
            <ChatInput
                messages={messages}
                isStreaming={isStreaming}
                onStop={stop}
                onSendMessage={sendMessage}
                queuedMessages={queuedMessages}
                removeFromQueue={removeFromQueue}
            />
        </div>
    );
};
