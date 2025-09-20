'use client'

import { getContextUsage, getModelLimits } from '@onlook/ai/src/tokens';
import type { TokenUsage, ModelLimits } from '@onlook/ai/src/tokens';
import type { ChatMessage } from '@onlook/models';
import { useEffect, useState } from 'react';

interface ContextTrackingState {
    usage: TokenUsage;
    limits: ModelLimits;
    percentage: number;
}

export const useContextTracking = (messages: ChatMessage[], modelId: string = 'openai:gpt-4') => {
    const [contextState, setContextState] = useState<ContextTrackingState>({
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        limits: getModelLimits(modelId),
        percentage: 0
    });

    useEffect(() => {
        const updateContextUsage = async () => {
            const contextUsage = await getContextUsage(messages, modelId);
            setContextState(contextUsage);
        };

        updateContextUsage();
    }, [messages, modelId]);

    return {
        ...contextState
    };
};