import { type ChatMessage } from '@onlook/models';
import { MessageContent } from './message-content';

export const StreamMessage = ({ message }: { message: ChatMessage }) => {
    return (
        <div className="px-4 pt-2 text-small content-start flex flex-col text-wrap gap-2">
            <MessageContent
                messageId={message.id}
                parts={message.parts}
                applied={false}
                isStream={true}
            />
        </div>
    );
};
