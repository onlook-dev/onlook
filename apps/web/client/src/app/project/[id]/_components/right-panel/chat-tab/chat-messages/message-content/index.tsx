import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import type { ToolUIPart } from 'ai';
import type { ChatMessage } from '@onlook/models';
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
        parts: ChatMessage['parts'];
        applied: boolean;
        isStream: boolean;
    }) => {

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
                const isLastPart = idx === parts.length - 1;
                return (
                    <ToolCallDisplay
                        messageId={messageId}
                        index={idx}
                        isLastPart={isLastPart}
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
                            <p className={cn("text-small", isStream && "bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]")}>Reasoning</p>
                        </div>
                        <pre key={`reasoning-${idx}`} className="text-xs text-foreground-tertiary my-2 px-3 py-2 border-l-1 overflow-y-auto whitespace-pre-wrap break-all max-h-48 flex flex-col-reverse">
                            <div>{part.text}</div>
                        </pre>
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
