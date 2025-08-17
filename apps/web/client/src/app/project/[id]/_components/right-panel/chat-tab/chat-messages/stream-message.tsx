import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { ChatMessageRole } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { MessageContent } from './message-content';

export const StreamMessage = () => {
    const { messages, isWaiting } = useChatContext();
    const streamMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isAssistantStreamMessage = streamMessage?.role === ChatMessageRole.ASSISTANT;

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
            {isWaiting && (
                <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                    <Icons.LoadingSpinner className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
        </>
    );
};
