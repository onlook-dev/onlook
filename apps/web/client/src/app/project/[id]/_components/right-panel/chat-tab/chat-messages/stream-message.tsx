import type { ChatMessage } from '@onlook/models';

import { MessageContent } from './message-content';

export const StreamMessage = ({ message }: { message: ChatMessage }) => {
    return (
        <div className="text-small flex flex-col content-start gap-2 px-4 pt-2 text-wrap">
            <MessageContent
                messageId={message.id}
                parts={message.parts}
                applied={false}
                isStream={true}
            />
        </div>
    );
};
