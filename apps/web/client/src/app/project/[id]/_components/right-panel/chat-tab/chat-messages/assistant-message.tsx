import type { ChatMessage } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { memo } from 'react';
import { MessageContent } from './message-content';

const AssistantMessageComponent = ({ message, isStreaming }: { message: ChatMessage, isStreaming: boolean }) => {
    return (
        <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
            <MessageContent
                messageId={message.id}
                parts={message.parts}
                applied={false}
                isStream={isStreaming}
            />
        </div>
    );
};

export const AssistantMessage = memo(observer(AssistantMessageComponent));
