import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import CodeChangeDisplay from '../CodeChangeDisplay';
import MarkdownRenderer from './MarkdownRenderer';

const AssistantMessage = ({ message }: { message: AssistantChatMessageImpl }) => {
    return (
        <div className="p-4 text-small content-start overflow-auto">
            <div className="flex flex-col text-wrap gap-2">
                {message.content.map((content) => {
                    if (content.type === 'text') {
                        return <MarkdownRenderer key={content.text} content={content.text} />;
                    } else if (content.type === 'code') {
                        return (
                            <CodeChangeDisplay
                                key={message.id}
                                content={content}
                                messageId={message.id}
                            />
                        );
                    }
                })}
            </div>
        </div>
    );
};

export default AssistantMessage;
