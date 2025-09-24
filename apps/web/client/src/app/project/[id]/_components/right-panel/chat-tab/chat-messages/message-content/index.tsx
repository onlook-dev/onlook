import type { ToolUIPart } from 'ai';
import { observer } from 'mobx-react-lite';

import type { ChatMessage } from '@onlook/models';
import { Reasoning, ReasoningContent, ReasoningTrigger, Response } from '@onlook/ui/ai-elements';
import { cn } from '@onlook/ui/utils';

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
                return <Response key={part.text}>{part.text}</Response>;
            } else if (part.type.startsWith('tool-')) {
                const toolPart = part as ToolUIPart;
                return (
                    <ToolCallDisplay
                        messageId={messageId}
                        toolPart={toolPart}
                        key={toolPart.toolCallId}
                        isStream={isStream}
                        applied={applied}
                    />
                );
            } else if (part.type === 'reasoning') {
                const isLastPart = idx === parts.length - 1;
                return (
                    <Reasoning
                        key={part.text}
                        className={cn(
                            'text-foreground-tertiary m-0 items-center gap-2 px-2',
                            isStream &&
                                isLastPart &&
                                'animate-shimmer bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] filter',
                        )}
                        isStreaming={isStream}
                    >
                        <ReasoningTrigger />
                        <ReasoningContent className="text-xs">{part.text}</ReasoningContent>
                    </Reasoning>
                );
            }
        });

        return <>{renderedParts}</>;
    },
);
