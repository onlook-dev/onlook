import type { ReasoningPart } from "@ai-sdk/provider-utils";

export const ReasoningBlock = ({
    messageId, idx, part, applied, isStream
}: {
    messageId: string, idx: number, part: ReasoningPart, applied: boolean, isStream: boolean
}) => {
    return (
        <pre key={`reasoning-${idx}-${part.text}`} className=" prose prose-invert text-small my-2 px-3 py-2 border-l-1 max-h-32 overflow-y-auto">
            {part.text}
        </pre>
    );
};