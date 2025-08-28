import { useChatContext } from "@/app/project/[id]/_hooks/use-chat";
import { ChatMessageRole } from "@onlook/models/chat";
import { memo, useMemo } from "react";
import { StaticMessageContent } from "./static-part";
import { StreamingPart } from "./streaming-part";
import type { UIMessage } from "ai";
import { Icons } from "@onlook/ui/icons/index";

const useStreamingParts = (streamingMessage: UIMessage | null) => {
    return useMemo(() => {
        if (!streamingMessage?.parts) {
            return { staticParts: [], streamingPart: null };
        }

        const streamingPart = streamingMessage.parts.find(
            (part) => part.type === 'reasoning' && part.state === 'streaming'
        );
        
        const staticParts = streamingMessage.parts.filter(
            (part) => part.type !== 'reasoning' || part.state !== 'streaming'
        );
        console.log('streamingPart', streamingPart);
        console.log('staticParts', staticParts);

        return { staticParts, streamingPart };
    }, [streamingMessage?.parts]);
};

export const StreamMessage = memo(() => {
    const { streamingAssistantMessage, isWaiting } = useChatContext();
    
    const isAssistantStreamMessage = useMemo(
        () => streamingAssistantMessage?.role === ChatMessageRole.ASSISTANT,
        [streamingAssistantMessage?.role],
    );
    
    const { staticParts, streamingPart } = useStreamingParts(streamingAssistantMessage);

    if (!streamingAssistantMessage || !isAssistantStreamMessage || !isWaiting) {
        return null;
    }

    return (
        <>
            {staticParts.length > 0 && (
                <StaticMessageContent
                    messageId={streamingAssistantMessage.id}
                    parts={staticParts}
                />
            )}
            
            {isWaiting && !streamingPart && <ThinkingIndicator />}
            
            {streamingPart && (
                <StreamingPart
                    streamingPart={streamingPart}
                    messageId={streamingAssistantMessage.id}
                />
            )}
        </>
    );
});

StreamMessage.displayName = 'StreamMessage';

const ThinkingIndicator = memo(() => (
    <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
        <Icons.LoadingSpinner className="animate-spin" />
        <p>Thinking ...</p>
    </div>
));

ThinkingIndicator.displayName = 'ThinkingIndicator';