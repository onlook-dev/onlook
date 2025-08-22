import type { ToolUIPart, UIMessage } from 'ai';
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
        parts: UIMessage['parts'];
        applied: boolean;
        isStream: boolean;
    }) => {
        if (!parts) {
            return null;
        }
        // Find the index of the last tool-*** part
        const lastToolInvocationIdx = parts
            .map((part, index) => ({ type: part.type, index }))
            .filter(item => item.type.startsWith('tool-'))
            .pop()?.index ?? -1;
        console.log('lastToolInvocationIdx', lastToolInvocationIdx);
        console.log('parts', parts);
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
                return (
                    <ToolCallDisplay
                        messageId={messageId}
                        index={idx}
                        lastToolInvocationIdx={lastToolInvocationIdx}
                        toolInvocation={part as ToolUIPart}
                        key={part.toolCallId}
                        isStream={isStream}
                        applied={applied}
                    />
                );
            } else if (part.type === 'reasoning') {
                if (!isStream) {
                    return null;
                }
                return (
                    <p key={`${part.type}-${messageId}`}>Introspecting...</p>
                );
            }
        });
    },
);
