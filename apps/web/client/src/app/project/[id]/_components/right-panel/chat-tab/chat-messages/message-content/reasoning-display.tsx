import { cn } from '@onlook/ui/utils';
import { Icons } from '@onlook/ui/icons';
import { MarkdownRenderer } from '../markdown-renderer';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

interface ReasoningDisplayProps {
    messageId: string;
    reasoning: string;
    applied: boolean;
    isStream: boolean;
    className?: string;
}

export const ReasoningDisplay = observer(
    ({ messageId, reasoning, applied, isStream, className = '' }: ReasoningDisplayProps) => {
        const contentRef = useRef<HTMLDivElement>(null);
        const [isExpanded, setIsExpanded] = useState(true);

        useEffect(() => {
            if (contentRef.current && isStream && isExpanded) {
                contentRef.current.scrollTop = contentRef.current.scrollHeight;
            }
        }, [reasoning, isStream, isExpanded]);

        const handleToggle = () => {
            setIsExpanded(!isExpanded);
        };

        return (
            <div
                className={cn(
                    'transition-all duration-200 ease-in-out',
                    className,
                )}
            >
                <div
                    className="flex items-center gap-2 ml-2 text-foreground-tertiary/80 cursor-pointer hover:text-foreground-secondary/90 transition-colors"
                    onClick={handleToggle}
                >
                    <Icons.Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-regularPlus">
                        {isStream ? 'Thinking...' : 'Reasoning'}
                    </span>
                    {applied && (
                        <div className="flex items-center gap-1 ml-auto">
                            <Icons.Check className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600 dark:text-green-400">
                                Applied
                            </span>
                        </div>
                    )}
                    <Icons.ChevronDown
                        className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            !isExpanded && 'rotate-180',
                        )}
                    />
                </div>

                {isExpanded && (
                    <div className="mt-2 p-4 rounded-lg border border-border-primary/50 bg-background-secondary/30">
                        <div
                            ref={contentRef}
                            className={cn(
                                'overflow-y-auto scrollbar-thin scrollbar-thumb-border-primary/30 scrollbar-track-transparent',
                                isStream ? 'max-h-48' : 'max-h-96',
                            )}
                        >
                            <MarkdownRenderer
                                messageId={messageId}
                                type="reasoning"
                                content={reasoning}
                                applied={applied}
                                isStream={isStream}
                                className="text-xs text-foreground-tertiary leading-relaxed"
                            />
                        </div>

                        {isStream && (
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <div
                                        className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"
                                        style={{ animationDelay: '0.2s' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"
                                        style={{ animationDelay: '0.4s' }}
                                    />
                                </div>
                                <span className="text-xs text-foreground-tertiary">
                                    Processing...
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    },
);
