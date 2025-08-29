import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { ChatMessageRole } from '@onlook/models/chat';
import { memo, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { Icons } from '@onlook/ui/icons/index';
import { ReasoningDisplay } from './message-content/reasoning-display';
import { MessageContent } from './message-content';

const useStreamingParts = (streamingMessage: UIMessage | null) => {
    return useMemo(() => {
        if (!streamingMessage?.parts) {
            return { staticParts: [], streamingPart: null };
        }

        const streamingPart = streamingMessage.parts.find(
            (part) => part.type === 'reasoning' && part.state === 'streaming',
        );

        const staticParts = streamingMessage.parts.filter(
            (part) => part.type !== 'reasoning' || part.state !== 'streaming',
        );

        return { staticParts, streamingPart };
    }, [streamingMessage?.parts]);
};

export const StreamMessage = memo(() => {
    const { messages: uiMessages, isWaiting } = useChatContext();

    const lastAssistantMessage = useMemo(
        () => uiMessages.findLast((m) => m.role === ChatMessageRole.ASSISTANT) ?? null,
        [uiMessages],
    );

    const { staticParts, streamingPart } = useStreamingParts(lastAssistantMessage);

    if (!lastAssistantMessage || !isWaiting) {
        return null;
    }

    return (
        <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
            {staticParts.length > 0 && (
                <MessageContent
                    messageId={lastAssistantMessage.id}
                    parts={staticParts}
                    applied={false}
                    isStream={false}
                />
            )}

            {isWaiting && !streamingPart && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.LoadingSpinner className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}

            {streamingPart && streamingPart.type === 'reasoning' && 'text' in streamingPart && (
                <ReasoningDisplay
                    messageId={lastAssistantMessage.id}
                    reasoning={streamingPart.text}
                    applied={false}
                    isStream={true}
                />
            )}
        </div>
    );
});

StreamMessage.displayName = 'StreamMessage';