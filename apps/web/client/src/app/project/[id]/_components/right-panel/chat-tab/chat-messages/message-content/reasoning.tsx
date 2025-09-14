import type { ReasoningPart } from "@ai-sdk/provider-utils";
import { Icons } from "@onlook/ui/icons/index";

export const ReasoningBlock = ({
    idx, part, isStream
}: {
    idx: number, part: ReasoningPart, isStream: boolean
}) => {
    return (
        <>
            <div className="px-2 flex items-center gap-2 text-foreground-tertiary">
                <Icons.Lightbulb className="w-4 h-4" />
                <p className="text-sm">Reasoning</p>
            </div>
            <pre className="prose prose-invert text-xs my-2 px-3 py-2 border-l-1 whitespace-pre-wrap break-words text-foreground-tertiary">
                {part.text}
            </pre>
        </>
    );
};