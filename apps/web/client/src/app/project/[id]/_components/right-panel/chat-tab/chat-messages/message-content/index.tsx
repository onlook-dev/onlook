import type { UIMessage } from 'ai';
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
                        toolInvocation={{
                            type: part.type,
                            toolName: part.toolName,
                            toolCallId: part.toolCallId,
                            state: part.state,
                            input: part.input,
                            output: (part as any).output,
                        } as any}
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
                    <p>{part.text ?? 'Introspecting...'}</p>
                );
            }
        });
    },
);
