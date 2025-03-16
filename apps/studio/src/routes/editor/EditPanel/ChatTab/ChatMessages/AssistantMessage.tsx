import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import MarkdownRenderer from './MarkdownRenderer';

// TODO: Handle each part of the message differently
const AssistantMessage = ({ message }: { message: AssistantChatMessageImpl }) => {
    const renderMessageContent = () => {
        if (typeof message.content === 'string') {
            return <MarkdownRenderer content={message.content} applied={message.applied} />;
        }
        return message.content.map((part) => {
            if (part.type === 'text') {
                return (
                    <MarkdownRenderer
                        key={part.text}
                        content={part.text}
                        applied={message.applied}
                    />
                );
            }

            // TODO: Handle tool calls
        });
    };

    return (
        <div className="p-4 text-small content-start">
            <div className="flex flex-col text-wrap gap-2">{renderMessageContent()}</div>
        </div>
    );
};

export default AssistantMessage;
