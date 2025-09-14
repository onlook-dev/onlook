import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { Icons } from '@onlook/ui/icons';
import { MessageContent } from './message-content';

export const StreamMessage = () => {
    const { streamingMessage, isWaiting } = useChatContext();

    if (!isWaiting || !streamingMessage) {
        return null;
    }
    return (
        <>
            <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
                <MessageContent
                    messageId={streamingMessage.id}
                    parts={streamingMessage.parts}
                    applied={false}
                    isStream={true}
                />
            </div>
            <div className="flex w-full h-full flex-row items-center gap-2 px-4 my-2 text-small content-start text-foreground-secondary">
                <Icons.LoadingSpinner className="animate-spin" />
                <p>Thinking ...</p>
            </div>
        </>
    );
};
