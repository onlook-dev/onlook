'use client';

import { type QueuedMessage } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import { QueuedMessageItem } from './queue-item';

export const QueueItems = ({
    queuedMessages: messages,
    removeFromQueue
}: {
    queuedMessages: QueuedMessage[];
    removeFromQueue: (id: string) => void;
}) => {
    const [queueExpanded, setQueueExpanded] = useState(false);
    if (messages.length === 0) return null;
    return (
        <Collapsible className="mb-2" open={queueExpanded} onOpenChange={setQueueExpanded}>
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start h-auto hover:bg-transparent text-muted-foreground p-2"
                >
                    <div className="flex items-center gap-2">
                        <Icons.ChevronDown
                            className={`size-4 transition-transform ${queueExpanded ? 'rotate-180' : ''}`}
                        />
                        <span className="text-xs">
                            {messages.length} chats in queue
                        </span>
                    </div>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="gap-0 flex flex-col mt-1">
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
