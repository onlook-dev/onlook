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
        // Find the index of the last tool-invocation part
        const lastToolInvocationIdx = parts.map(p => p.type).lastIndexOf('tool-invocation');
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
            } else if (part.type === 'tool-invocation') {
                return (
                    <ToolCallDisplay
                        messageId={messageId}
                        index={idx}
                        lastToolInvocationIdx={lastToolInvocationIdx}
                        toolInvocationData={part.toolInvocation}
                        key={part.toolInvocation.toolCallId}
                        isStream={isStream}
                        applied={applied}
                    />
                );
            } else if (part.type === 'reasoning') {
                if (!isStream) {
                    return null;
                }
                return (
                    <p>Introspecting...</p>
                );
            }
        });
    },
);
