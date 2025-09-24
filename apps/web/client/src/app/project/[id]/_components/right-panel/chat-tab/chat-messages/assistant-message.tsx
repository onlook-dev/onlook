import type { ChatMessage } from '@onlook/models';

import { MessageContent } from './message-content';

export const AssistantMessage = ({
    message,
    isStreaming,
}: {
    message: ChatMessage;
    isStreaming: boolean;
}) => {
    return (
        <div className="text-small flex flex-col content-start gap-2 px-4 py-2 text-wrap">
            <MessageContent
                messageId={message.id}
                parts={message.parts}
                applied={false}
                isStream={isStreaming}
            />
        </div>
    );
};
