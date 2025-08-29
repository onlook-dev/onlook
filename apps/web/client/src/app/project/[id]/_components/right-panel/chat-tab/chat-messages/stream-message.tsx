import { ChatMessageRole } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { useMemo } from 'react';
import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { MessageContent } from './message-content';
import { ReasoningDisplay } from './message-content/reasoning-display';
import type { TextUIPart } from 'ai';

export const StreamMessage = () => {
    const { messages, isWaiting } = useChatContext();
    const streamMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    const isAssistantStreamMessage = useMemo(
        () => streamMessage?.role === ChatMessageRole.ASSISTANT,
        [streamMessage?.role],
    );

    const streamReasoningPart =
        streamMessage?.parts?.find(
            (part) =>
                part.type === 'reasoning' &&
                part.state === 'streaming' &&   
                'text' in part
        ) ?? null;

    const shouldShowIntrospecting = isWaiting && streamReasoningPart;

    return (
        <>
            {streamMessage && isAssistantStreamMessage && streamMessage.parts && isWaiting && (
                <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
                    <MessageContent
                        messageId={streamMessage.id}
                        parts={streamMessage.parts}
                        applied={false}
                        isStream={true}
                    />
                </div>
            )}
            {isWaiting && !shouldShowIntrospecting && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.LoadingSpinner className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {shouldShowIntrospecting && streamMessage && streamReasoningPart && (
                <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
                    <ReasoningDisplay
                        messageId={streamMessage.id}
                        reasoning={(streamReasoningPart as TextUIPart).text}
                        applied={false}
                        isStream={true}
                    />
                </div>
            )}
        </>
    );
};
