'use client'

import { useContextTracking } from '@/app/project/[id]/_hooks/use-context-tracking';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import type { ChatMessage } from '@onlook/models';

interface ContextIndicatorProps {
    messages: ChatMessage[];
    modelId?: string;
}

function formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
}

export const ContextIndicator = observer(({ messages, modelId = 'openai:gpt-4' }: ContextIndicatorProps) => {
    const contextTracking = useContextTracking(messages, modelId);

    if (contextTracking.usage.totalTokens === 0) {
        return null;
    }

    const percentage = Math.min(contextTracking.percentage, 100);
    const isCritical = percentage > 95;
    const isNearLimit = percentage > 80;

    const colors = isCritical 
        ? { stroke: '#ef4444', text: 'text-red-600' }
        : isNearLimit 
        ? { stroke: '#f59e0b', text: 'text-amber-600' }
        : { stroke: '#6b7280', text: 'text-gray-500' };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted/30 transition-colors cursor-help shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative">
                        <svg width="16" height="16" className="transform -rotate-90">
                            <circle
                                cx="8"
                                cy="8" 
                                r="6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                fill="none"
                                className="text-muted-foreground/20"
                            />
                            <circle
                                cx="8"
                                cy="8"
                                r="6"
                                stroke={colors.stroke}
                                strokeWidth="1.5"
                                fill="none"
                                strokeDasharray={2 * Math.PI * 6}
                                strokeDashoffset={2 * Math.PI * 6 - (percentage / 100) * 2 * Math.PI * 6}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                            />
                        </svg>
                    </div>
                    <span className={cn("text-xs font-medium", colors.text)}>
                        {percentage.toFixed(1)}%
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="top">
                {formatTokens(contextTracking.usage.totalTokens)}/{formatTokens(contextTracking.limits.contextWindow)} context used
            </TooltipContent>
        </Tooltip>
    );
});