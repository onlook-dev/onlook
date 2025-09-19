import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils';

const reasoningVariants = cva('rounded-lg border border-dashed bg-muted/30 text-sm', {
    variants: {
        variant: {
            default: 'border-muted bg-muted/30',
            thinking: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50',
            error: 'border-destructive/50 bg-destructive/10',
            success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50',
        },
        size: {
            sm: 'p-2 text-xs',
            default: 'p-3 text-sm',
            lg: 'p-4 text-base',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});

interface ReasoningProps
    extends React.ComponentProps<'div'>,
        VariantProps<typeof reasoningVariants> {
    title?: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
}

function Reasoning({
    className,
    variant,
    size,
    title = 'Thinking...',
    collapsible = false,
    defaultCollapsed = false,
    children,
    ...props
}: ReasoningProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
        <div
            data-slot="ai-reasoning"
            className={cn(reasoningVariants({ variant, size, className }))}
            {...props}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground font-medium">{title}</div>
                    {variant === 'thinking' && (
                        <div className="flex gap-1">
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                        </div>
                    )}
                </div>
                {collapsible && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isCollapsed ? '▶' : '▼'}
                    </button>
                )}
            </div>
            {!isCollapsed && children && (
                <div className="mt-2 text-muted-foreground">{children}</div>
            )}
        </div>
    );
}

function ReasoningStep({
    className,
    step,
    ...props
}: React.ComponentProps<'div'> & { step?: number }) {
    return (
        <div data-slot="ai-reasoning-step" className={cn('flex gap-2 py-1', className)} {...props}>
            {step && <div className="flex-shrink-0 text-xs text-muted-foreground">{step}.</div>}
            <div className="flex-1">{props.children}</div>
        </div>
    );
}

function ChainOfThought({
    className,
    steps = [],
    ...props
}: React.ComponentProps<'div'> & {
    steps?: Array<{ id: string; content: string; status?: 'pending' | 'active' | 'complete' }>;
}) {
    return (
        <div data-slot="ai-chain-of-thought" className={cn('space-y-2', className)} {...props}>
            {steps.map((step, index) => (
                <div
                    key={step.id}
                    className={cn('flex gap-2 rounded border-l-2 p-2 text-sm', {
                        'border-l-muted bg-muted/20': step.status === 'pending',
                        'border-l-blue-400 bg-blue-50 dark:bg-blue-950/50':
                            step.status === 'active',
                        'border-l-green-400 bg-green-50 dark:bg-green-950/50':
                            step.status === 'complete',
                    })}
                >
                    <div className="flex-shrink-0 text-xs text-muted-foreground">{index + 1}.</div>
                    <div className="flex-1">
                        {step.content}
                        {step.status === 'active' && <span className="ml-2 animate-pulse">|</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}

export { ChainOfThought, Reasoning, ReasoningStep, reasoningVariants };
