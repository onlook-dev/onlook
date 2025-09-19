import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils';

const messageVariants = cva('flex w-full flex-col gap-2 rounded-lg border p-4 text-sm', {
    variants: {
        role: {
            user: 'ml-auto max-w-[80%] bg-primary text-primary-foreground',
            assistant: 'mr-auto max-w-[80%] bg-muted/50',
            system: 'bg-secondary text-secondary-foreground border-dashed',
        },
        size: {
            sm: 'p-2 text-xs',
            default: 'p-4 text-sm',
            lg: 'p-6 text-base',
        },
    },
    defaultVariants: {
        role: 'assistant',
        size: 'default',
    },
});

interface MessageProps
    extends Omit<React.ComponentProps<'div'>, 'role'>,
        VariantProps<typeof messageVariants> {
    content?: string;
    timestamp?: Date;
}

function Message({ className, role, size, content, timestamp, children, ...props }: MessageProps) {
    return (
        <div
            data-slot="ai-message"
            className={cn(messageVariants({ role, size, className }))}
            {...props}
        >
            <div className="flex-1">
                {content && <div className="whitespace-pre-wrap">{content}</div>}
                {children}
            </div>
            {timestamp && (
                <div className="mt-2 text-xs opacity-70">{timestamp.toLocaleTimeString()}</div>
            )}
        </div>
    );
}

function MessageContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-message-content"
            className={cn('whitespace-pre-wrap', className)}
            {...props}
        />
    );
}

function MessageHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-message-header"
            className={cn('mb-2 flex items-center justify-between', className)}
            {...props}
        />
    );
}

function MessageActions({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-message-actions"
            className={cn('mt-2 flex items-center gap-2', className)}
            {...props}
        />
    );
}

export { Message, MessageActions, MessageContent, MessageHeader, messageVariants };
