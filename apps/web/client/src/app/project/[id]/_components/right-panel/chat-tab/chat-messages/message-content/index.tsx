import type { ToolUIPart, UIMessage } from 'ai';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
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
        // Find the index of the last tool-*** part
        const lastToolInvocationIdx = useMemo(() =>
            parts?.map((part, index) => ({ type: part.type, index }))
                .filter(item => item.type.startsWith('tool-'))
                .pop()?.index ?? -1,
            [parts]
        );

        if (!parts.length) {
            return null;
        }

        const renderedParts = parts.map((part, idx) => {
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
                        lastToolInvocationIdx={lastToolInvocationIdx}
                        toolInvocation={toolPart}
                        key={toolPart.toolCallId}
                        isStream={isStream}
                        applied={applied}
                    />
                );
            } else if (part.type === 'reasoning') {
                return null
            }
        }).filter(Boolean);
        return (
            <>
                {renderedParts}
            </>
        );
    },
);
