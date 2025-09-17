import { useEditorEngine } from '@/components/store/editor';
import { cn } from '@onlook/ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';

interface ContextWheelProps {
  className?: string;
}

export const ContextWheel = observer(({ className }: ContextWheelProps) => {
  const editorEngine = useEditorEngine();

  const contextPercentage = useMemo(() => {
    // Use cumulative usage data if available, otherwise fall back to estimate
    const cumulativeUsage = (editorEngine.chat.context as any).cumulativeUsage;
    
    if (cumulativeUsage && cumulativeUsage.totalTokens > 0) {
      // Use cumulative token usage from all API responses
      // Assume a context window of ~200k tokens for Claude 4 Sonnet
      const maxContextTokens = 200000;
      const percentage = Math.min((cumulativeUsage.totalTokens / maxContextTokens) * 100, 100);
      return Math.round(percentage);
    }
    
    // Fallback to estimation if no usage data is available yet
    const contextItems = editorEngine.chat.context.context;
    const messages = editorEngine.chat.conversation.current?.messages || [];
    
    let estimatedTokens = 0;
    
    // Count tokens from context items (current context)
    contextItems.forEach(item => {
      if (item.content) {
        // Rough estimate: 1 token ≈ 4 characters for English text
        estimatedTokens += Math.ceil(item.content.length / 4);
      }
    });
    
    // Count tokens from ALL messages in the conversation (not just recent ones)
    messages.forEach(message => {
      // Extract text content from message parts
      const textContent = message.parts
        .filter(part => part.type === 'text')
        .map(part => (part as any).text)
        .join(' ');
      if (textContent) {
        estimatedTokens += Math.ceil(textContent.length / 4);
      }
      
      // Also count context from each message's metadata
      if (message.metadata?.context) {
        message.metadata.context.forEach((contextItem: any) => {
          if (contextItem.content) {
            estimatedTokens += Math.ceil(contextItem.content.length / 4);
          }
        });
      }
    });
    
    // Assume a context window of ~200k tokens for Claude 4 Sonnet
    const maxContextTokens = 200000;
    const percentage = Math.min((estimatedTokens / maxContextTokens) * 100, 100);
    
    return Math.round(percentage);
  }, [(editorEngine.chat.context as any).cumulativeUsage, editorEngine.chat.context.context, editorEngine.chat.conversation.current?.messages]);

  const getColorClass = (percentage: number) => {
    if (percentage < 50) return 'text-gray-500';
    if (percentage < 60) return 'text-amber-500';
    if (percentage < 80) return 'text-orange-500';
    return 'text-red-500';
  };

  const getStrokeColor = (percentage: number) => {
    if (percentage < 50) return '#606060'; // gray-400
    if (percentage < 60) return '#B99000'; // amber-500
    if (percentage < 80) return '#f97316'; // orange-500
    return '#FA003C'; // red-500
  };

  const strokeColor = getStrokeColor(contextPercentage);
  const circumference = 2 * Math.PI * 6; // radius of 6
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (contextPercentage / 100) * circumference;

  const contextItems = editorEngine.chat.context.context;
  const messages = editorEngine.chat.conversation.current?.messages || [];
  const cumulativeUsage = (editorEngine.chat.context as any).cumulativeUsage;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-1 cursor-help bg-background-tertiary/20 rounded px-1.5 py-1', className)}>
          <div className="relative w-4 h-4">
            <svg
              className="w-4 h-4 transform -rotate-90"
              viewBox="0 0 16 16"
            >
              {/* Background circle */}
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                className="text-foreground-tertiary/20"
              />
              {/* Progress circle */}
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke={strokeColor}
                strokeWidth="1.5"
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-in-out"
              />
            </svg>
          </div>
          <span className={cn('text-small tabular-nums text-foreground-tertiary', getColorClass(contextPercentage))}>
            {contextPercentage}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent hideArrow>
        <div className="text-xs text-background-primary">
          <div className="text-small">Context Usage</div>
          <div className="space-y-0.5 text-background-primary">
            {cumulativeUsage && cumulativeUsage.totalTokens > 0 ? (
              <>
                <div>{cumulativeUsage.totalTokens.toLocaleString()} total tokens</div>
                <div>{cumulativeUsage.promptTokens.toLocaleString()} prompt tokens</div>
                <div>{cumulativeUsage.completionTokens.toLocaleString()} completion tokens</div>
                <div className="text-background-primary">
                  {contextPercentage}% of context window
                </div>
              </>
            ) : (
              <>
                <div>{contextItems.length} current context items</div>
                <div>{messages.length} total messages</div>
                <div className="text-background-primary">
                  Estimated {contextPercentage}% of context window
                </div>
              </>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
