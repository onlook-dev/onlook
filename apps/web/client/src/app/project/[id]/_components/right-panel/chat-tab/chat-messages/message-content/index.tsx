import type { ToolUIPart, UIMessage } from 'ai';
import { MarkdownRenderer } from '../markdown';
import { ReasoningBlock } from './reasoning';
import { ToolCallDisplay } from './tool-call-display';

export const MessageContent = ({
    messageId,
    parts,
    applied,
    isStream,
}: {
    messageId: string;
    parts: UIMessage['parts'];
    applied: boolean;
    isStream: boolean;
}) => {
    return parts.map((part, idx) => {
        if (part.type === 'text') {
            return (
                <MarkdownRenderer
                    messageId={messageId}
                    type="text"
                    key={part.text}
                    content={part.text}
                    applied={applied}
                    isStream={isStream}
                />
            );
        } else if (part.type.startsWith('tool-')) {
            const toolPart = part as ToolUIPart;
            return (
                <ToolCallDisplay
                    messageId={messageId}
                    index={idx}
                    lastToolInvocationIdx={parts.length - 1}
                    toolInvocation={toolPart}
                    key={toolPart.toolCallId}
                    isStream={isStream}
                    applied={applied}
                />
            );
        } else if (part.type === 'reasoning') {
            return (
                <ReasoningBlock
                    idx={idx}
                    part={part}
                    isStream={isStream}
                />
            );
        }
    })
};
