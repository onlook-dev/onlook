import { type ChatMessage } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { useMemo } from 'react';
import { MessageContent } from './message-content';

export const StreamMessage = ({ message }: { message: ChatMessage }) => {
    const isAssistantStreamMessage = useMemo(() => message?.role === 'assistant', [message?.role]);

    return (
        <>
            {message && isAssistantStreamMessage && (
                <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
                    <MessageContent
                        messageId={message.id}
                        parts={message.parts}
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
