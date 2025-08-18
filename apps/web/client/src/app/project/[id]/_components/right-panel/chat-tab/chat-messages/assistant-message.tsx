import type { AssistantChatMessage } from '@onlook/models';
import { MessageContent } from './message-content';

export const AssistantMessage = ({ message }: { message: AssistantChatMessage }) => {
    return (
        <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
            <MessageContent
                messageId={message.id}
                parts={message.content.parts}
                applied={false}
                isStream={false}
            />
        </div>
    );
};
