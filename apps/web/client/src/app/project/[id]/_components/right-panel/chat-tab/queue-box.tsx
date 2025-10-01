'use client';

import { ChatType, type QueuedMessage } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';

// TODO: Remove this stub data when integrating with real queue data
const STUB_MESSAGES = [
    { id: '1', content: 'Test answer', timestamp: new Date(), type: ChatType.EDIT, context: [] },
    { id: '2', content: 'test message', timestamp: new Date(), type: ChatType.EDIT, context: [] },
    { id: '3', content: 'shgksjhdfgkjhsdkjfghjkhsdfjkghsdjkhfgjhk...', timestamp: new Date(), type: ChatType.EDIT, context: [] },
];

interface QueuedMessageItemProps {
    message: QueuedMessage;
    index: number;
    removeFromQueue: (id: string) => void;
}

const QueuedMessageItem = ({ message, index, removeFromQueue }: QueuedMessageItemProps) => {
    return (
        <div className="flex items-center gap-3 group hover:bg-transparent">
            <div className="w-4 h-4 rounded-full border border-muted-foreground/50 flex-shrink-0 bg-transparent" />

            <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                    {message.content}
                </p>
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-muted-foreground/60 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFromQueue(message.id)}
            >
                <Icons.CrossL className="h-3 w-3" />
            </Button>
        </div>
    );
};

interface QueueBoxProps {
    queuedMessages: QueuedMessage[];
    removeFromQueue: (id: string) => void;
}

export const QueueBox = ({ queuedMessages, removeFromQueue }: QueueBoxProps) => {
    const [queueExpanded, setQueueExpanded] = useState(false);

    // TODO: Replace with real queuedMessages when ready - using stub data for now
    const messages = STUB_MESSAGES;

    if (messages.length === 0) return null;

    return (
        <div className="queue-container mb-3">
            <Collapsible open={queueExpanded} onOpenChange={setQueueExpanded}>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-start h-auto hover:bg-transparent text-muted-foreground p-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.ChevronDown
                                className={`h-4 w-4 transition-transform ${queueExpanded ? 'rotate-180' : ''}`}
                            />
                            <span className="text-sm">
                                {messages.length} in queue
                            </span>
                        </div>
                    </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div>
                        {messages.map((message, index) => (
                            <QueuedMessageItem
                                key={message.id}
                                message={message}
                                index={index}
                                removeFromQueue={removeFromQueue}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};