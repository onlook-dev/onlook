import type { ChatMessage } from '@onlook/models';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@onlook/ui/ai-elements';
import { cn } from '@onlook/ui/utils';
import type { ToolUIPart } from 'ai';
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
            const isLastPart = idx === parts.length - 1;
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
            } else if (part.type.startsWith('tool-')) {
                const toolPart = part as ToolUIPart;
                return (
                    <ToolCallDisplay
                        messageId={messageId}
                        isLastPart={isLastPart}
                        toolPart={toolPart}
                        key={toolPart.toolCallId}
                        isStream={isStream}
                        applied={applied}
                    />
                );
            } else if (part.type === 'reasoning') {
                return (
                    <Reasoning className={cn(
                        "px-2 m-0 items-center gap-2 text-foreground-tertiary",
                        isStream && isLastPart && "bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                    )} isStreaming={isStream}>
                        <ReasoningTrigger />
                        <ReasoningContent className="text-xs">{part.text}</ReasoningContent>
                    </Reasoning>
                )
            }
        }).filter(Boolean);

        return (
            <>
                {renderedParts}
            </>
        );
    },
);
