import { Icons } from '@onlook/ui/icons/index';
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
                return (
                    <>
                        <div className="px-2 flex items-center gap-2 text-foreground-tertiary">
                            <Icons.Lightbulb className="w-4 h-4" />
                            <p className="text-sm">Reasoning</p>
                        </div>
                        {isStream && <pre key={`reasoning-${idx}`} className="my-2 px-3 py-2 border-l-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                            {part.text}
                        </pre>}
                    </>
                );
            }
        }).filter(Boolean);

        return (
            <>
                {renderedParts}
            </>
        );
    },
);
