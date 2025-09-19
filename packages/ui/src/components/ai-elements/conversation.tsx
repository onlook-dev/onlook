import * as React from 'react';

import { cn } from '../../utils';

interface ConversationProps extends React.ComponentProps<'div'> {
    messages?: Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp?: Date;
    }>;
}

function Conversation({ className, messages = [], children, ...props }: ConversationProps) {
    return (
        <div
            data-slot="ai-conversation"
            className={cn('flex w-full flex-col gap-4 p-4', className)}
            {...props}
        >
            {messages.length > 0 && (
                <div className="flex flex-col gap-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            data-role={message.role}
                            className={cn(
                                'flex w-full flex-col gap-2 rounded-lg border p-4 text-sm',
                                {
                                    'ml-auto max-w-[80%] bg-primary text-primary-foreground':
                                        message.role === 'user',
                                    'mr-auto max-w-[80%] bg-muted/50': message.role === 'assistant',
                                    'bg-secondary text-secondary-foreground border-dashed':
                                        message.role === 'system',
                                },
                            )}
                        >
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            {message.timestamp && (
                                <div className="mt-2 text-xs opacity-70">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {children}
        </div>
    );
}

function ConversationList({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-conversation-list"
            className={cn('flex flex-col gap-4', className)}
            {...props}
        />
    );
}

function ConversationInput({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-conversation-input"
            className={cn('mt-4 flex items-center gap-2', className)}
            {...props}
        />
    );
}

export { Conversation, ConversationInput, ConversationList };
