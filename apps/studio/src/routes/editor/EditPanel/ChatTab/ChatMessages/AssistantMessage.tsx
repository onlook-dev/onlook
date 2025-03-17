import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import { MessageContent } from './MessageContent';

export const AssistantMessage = ({ message }: { message: AssistantChatMessageImpl }) => {
    return (
        <div className="px-4 py-2 text-small content-start">
            <div className="flex flex-col text-wrap gap-2">
                <MessageContent
                    messageId={message.id}
                    content={message.content}
                    applied={message.applied}
                    isStream={false}
                />
            </div>
        </div>
    );
};
