import type { Message } from 'ai';
import { observer } from 'mobx-react-lite';
import { MarkdownRenderer } from '../markdown-renderer';
import { ToolCallDisplay } from './tool-call-display';

export const MessageContent = observer(
    ({
        messageId,
        parts,
        applied,
        isStream,
    }: {
        messageId: string;
        parts: Message['parts'];
        applied: boolean;
        isStream: boolean;
    }) => {
        if (!parts) {
            return null;
        }
        return parts.map((part) => {
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
            } else if (part.type === 'tool-invocation') {
                return (
                    <ToolCallDisplay
                        key={part.toolInvocation.toolCallId}
                        toolInvocation={part.toolInvocation}
                        isStream={isStream}
                    />
                );
            } else if (part.type === 'reasoning') {
                return (
                    <div key={part.reasoning} className="border-2 border-green-500">
                        reasoning: {JSON.stringify(part, null, 2)}
                    </div>
                );
            }
        });
    },
);
