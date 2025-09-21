import {
    Context,
    ContextCacheUsage,
    ContextContent,
    ContextContentBody,
    ContextContentFooter,
    ContextContentHeader,
    ContextInputUsage,
    ContextOutputUsage,
    ContextReasoningUsage,
    ContextTrigger
} from '@onlook/ui/ai-elements/context';

export const ChatContextWindow = () => {
    const showCost = false;
    return (
        <Context
            maxTokens={128000}
            usedTokens={40000}
            usage={{
                inputTokens: 32000,
                outputTokens: 8000,
                totalTokens: 40000,
                cachedInputTokens: 0,
                reasoningTokens: 0,
            }}
        >
            <ContextTrigger />
            <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                    <ContextInputUsage />
                    <ContextOutputUsage />
                    <ContextReasoningUsage />
                    <ContextCacheUsage />
                </ContextContentBody>
                {showCost && <ContextContentFooter />}
            </ContextContent>
        </Context>
    );
};