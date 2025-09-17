
import { ChatMessageRole, type ChatMessage } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { useMemo } from 'react';
import { MessageContent } from './message-content';

export const StreamMessage = ({ 
    messages, 
    isStreaming,
}: {
    messages: ChatMessage[];
    isStreaming: boolean;
}) => {
    const streamMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isAssistantStreamMessage = useMemo(() =>
        streamMessage?.role === ChatMessageRole.ASSISTANT,
        [streamMessage?.role]
    );

    if (!isStreaming) {
        return null;
    }

    return (
        <>
            {streamMessage && isAssistantStreamMessage && (
                <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
                    <MessageContent
                        messageId={streamMessage.id}
                        parts={streamMessage.parts}
                        applied={false}
                        isStream={true}
                    />
                </div>
            )}
            <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                <Icons.LoadingSpinner className="animate-spin" />
                <p>Thinking ...</p>
            </div>
        </>
    );
};
