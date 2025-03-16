import type { AssistantContent } from 'ai';
import { observer } from 'mobx-react-lite';
import MarkdownRenderer from '../MarkdownRenderer';

export const MessageContent = observer(
    ({
        messageId,
        content,
        applied,
        isStream,
    }: {
        messageId: string;
        content: AssistantContent;
        applied: boolean;
        isStream: boolean;
    }) => {
        if (typeof content === 'string') {
            return (
                <MarkdownRenderer
                    messageId={messageId}
                    content={content}
                    applied={applied}
                    isStream={isStream}
                />
            );
        }
        return content.map((part) => {
            if (part.type === 'text') {
                return (
                    <MarkdownRenderer
                        messageId={messageId}
                        key={part.text}
                        content={part.text}
                        applied={applied}
                        isStream={isStream}
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
    },
);
