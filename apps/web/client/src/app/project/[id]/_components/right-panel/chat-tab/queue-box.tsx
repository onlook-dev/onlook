'use client';

import { type QueuedMessage } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useState } from 'react';

interface QueuedMessageItemProps {
    message: QueuedMessage;
    index: number;
    removeFromQueue: (id: string) => void;
}

const QueuedMessageItem = ({ message, index, removeFromQueue }: QueuedMessageItemProps) => {
    return (
        <div className="flex flex-row w-full py-1.5 items-center rounded-md hover:bg-background-onlook cursor-default select-none group relative transition-none overflow-hidden">
            <Icons.ChatBubble className="flex-none mr-2 ml-3 text-muted-foreground group-hover:text-foreground" />
            <span className="text-small truncate w-full text-left text-muted-foreground group-hover:text-foreground mr-2">
                {message.content}
            </span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground absolute right-0 px-2.5 py-2 top-1/2 -translate-y-1/2 w-fit h-fit opacity-0 group-hover:opacity-100 !bg-background-onlook hover:!bg-background-onlook z-10 transition-none cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(message.id);
                        }}
                    >
                        <Icons.Trash className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" hideArrow>
                    <p className="font-normal">
                        Remove from queue
                    </p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};

interface QueueBoxProps {
    queuedMessages: QueuedMessage[];
    removeFromQueue: (id: string) => void;
}

export const QueueBox = ({ queuedMessages: messages, removeFromQueue }: QueueBoxProps) => {
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