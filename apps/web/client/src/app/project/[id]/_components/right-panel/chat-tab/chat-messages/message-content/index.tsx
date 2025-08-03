import type { AskToolSet, BuildToolSet } from '@onlook/ai';
import type { ToolUIPart, UIMessage } from 'ai';
import { observer } from 'mobx-react-lite';
import { MarkdownRenderer } from '../markdown-renderer';
import { ToolCallDisplay } from './tool-call-display';

export const MessageContent = observer(
    ({
        messageId,
        parts,
        isStream,
    }: {
        messageId: string;
        parts: UIMessage['parts'];
        isStream: boolean;
    }) => {
        if (!parts) {
            return null;
        }
        // Find the index of the last tool-invocation part
        const lastToolInvocationIdx = parts.findLastIndex(p => p.type.startsWith('tool-'));
        return parts.map((part, idx) => {
            if (part.type === 'text') {
                return (
                    <MarkdownRenderer
                        messageId={messageId}
                        key={part.text}
                        content={part.text}
                        isStream={isStream}
                    />
                );
            } else if (part.type.startsWith('tool-')) {
                const toolPart = part as ToolUIPart<BuildToolSet | AskToolSet>;
                return (
                    <ToolCallDisplay
                        messageId={messageId}
                        index={idx}
                        lastToolInvocationIdx={lastToolInvocationIdx}
                        toolPart={toolPart}
                        key={toolPart.toolCallId}
                        isStream={isStream}
                    />
                );
            } else if (part.type === 'reasoning') {
                return (
                    <div key={part.text} className="border-2 border-green-500">
                        reasoning: {part.text}
                    </div>
                );
            }
        });
    },
);
