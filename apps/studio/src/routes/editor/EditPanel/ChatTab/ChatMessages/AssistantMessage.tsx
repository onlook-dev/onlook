import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import MarkdownRenderer from './MarkdownRenderer';

const AssistantMessage = ({ message }: { message: AssistantChatMessageImpl }) => {
    return (
        <div className="p-4 text-small content-start overflow-auto">
            <div className="flex flex-col text-wrap gap-2">
                <MarkdownRenderer
                    messageId={message.id}
                    content={message.content}
                    applied={message.applied}
                />
            </div>
        </div>
    );
};

export default AssistantMessage;
