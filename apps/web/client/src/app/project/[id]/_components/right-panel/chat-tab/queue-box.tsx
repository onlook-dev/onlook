'use client';

import { ChatType, type QueuedMessage } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useState } from 'react';

// TODO: Remove this stub data when integrating with real queue data
const STUB_MESSAGES = [
    { id: '1', content: 'Test answer', timestamp: new Date(), type: ChatType.EDIT, context: [] },
    { id: '2', content: 'test message', timestamp: new Date(), type: ChatType.EDIT, context: [] },
    { id: '3', content: 'This is a long message', timestamp: new Date(), type: ChatType.EDIT, context: [] },
    { id: '4', content: 'shgksjhdfgkjhsdkjfghjkhsdfjkghsdjkhfgjhkshgksjhdfgkjhsdkjfghjkhsdfjkghsdjkhfgjhkshgksjhdfgkjhsdkjfghjkhsdfjkghsdjkhfgjhkshgksjhdfgkjhsdkjfghjkhsdfjkghsdjkhfgjhkshgksjhdfgkjhsdkjfghjkhsdfjkghsdjkhfgjhk', timestamp: new Date(), type: ChatType.EDIT, context: [] },

];

interface QueuedMessageItemProps {
    message: QueuedMessage;
    index: number;
    removeFromQueue: (id: string) => void;
}

const QueuedMessageItem = ({ message, index, removeFromQueue }: QueuedMessageItemProps) => {
    return (
        <div className="flex items-center gap-3 group hover:bg-transparent">
            <div className="size-3 rounded-full border border-muted-foreground/50 flex-shrink-0 bg-transparent" />

            <p className="flex-1 min-w-0 text-small text-muted-foreground truncate">
                {message.content}
            </p>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className='hidden group-hover:flex items-center justify-center bg-transparent hover:bg-transparent h-4 w-4 p-0.25'
                        onClick={() => removeFromQueue(message.id)}
                    >
                        <Icons.CrossL className='size-2.5' />
                    </Button>
                </TooltipTrigger>
                <TooltipContent hideArrow>
                    Remove from queue
                </TooltipContent>
            </Tooltip>
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
        <Collapsible className="mb-3" open={queueExpanded} onOpenChange={setQueueExpanded}>
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start h-auto hover:bg-transparent text-muted-foreground p-0 py-2 "
                >
                    <div className="flex items-center gap-2">
                        <Icons.ChevronDown
                            className={`size-4 transition-transform ${queueExpanded ? 'rotate-180' : ''}`}
                        />
                        <span className="text-xs">
                            {messages.length} in queue
                        </span>
                    </div>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mx-1 gap-1 flex flex-col">
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
    );
};