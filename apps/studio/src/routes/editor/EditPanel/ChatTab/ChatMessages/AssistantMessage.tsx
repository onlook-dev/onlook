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
            } else if (part.type === 'tool-call') {
                return (
                    <div key={part.toolCallId} className="border-2 border-red-500">
                        tool call: {JSON.stringify(part, null, 2)}
                    </div>
                );
            } else if (part.type === 'reasoning') {
                return (
                    <div key={part.text} className="border-2 border-green-500">
                        reasoning: {JSON.stringify(part, null, 2)}
                    </div>
                );
            }
        });
    };

    return (
        <div className="px-4 py-2 text-small content-start">
            <div className="flex flex-col text-wrap gap-2">{renderMessageContent()}</div>
        </div>
    );
};

export default AssistantMessage;
