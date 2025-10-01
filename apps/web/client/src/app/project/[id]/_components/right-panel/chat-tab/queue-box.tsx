'use client';

import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { Card } from '@onlook/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { ChatType } from '@onlook/models';
import { useState } from 'react';

interface QueuedMessage {
    id: string;
    content: string;
    type: ChatType;
    timestamp: Date;
    context: any[];
}

interface QueuedMessageItemProps {
    message: QueuedMessage;
    index: number;
    removeFromQueue: (id: string) => void;
}

const QueuedMessageItem = ({ message, index, removeFromQueue }: QueuedMessageItemProps) => {
    return (
        <div className="flex items-start gap-2 p-2 rounded-md border border-border/50 bg-card/50">
            <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                #{index + 1}
            </Badge>
            
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 line-clamp-2 break-words">
                    {message.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                </p>
            </div>
            
            <div className="flex gap-1 shrink-0">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeFromQueue(message.id)}
                        >
                            <Icons.Trash className="h-3 w-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from queue</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

interface QueueBoxProps {
    queuedMessages: QueuedMessage[];
    removeFromQueue: (id: string) => void;
}

export const QueueBox = ({ queuedMessages, removeFromQueue }: QueueBoxProps) => {
    const [queueExpanded, setQueueExpanded] = useState(false);
    
    if (queuedMessages.length === 0) return null;
    
    return (
        <Card className="queue-container border-border/50 bg-background/95 backdrop-blur mb-3">
            <Collapsible open={queueExpanded} onOpenChange={setQueueExpanded}>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-between p-3 h-auto hover:bg-accent/50"
                    >
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                {queuedMessages.length}
                            </Badge>
                            <span className="text-sm">
                                message{queuedMessages.length > 1 ? 's' : ''} queued
                            </span>
                        </div>
                        <Icons.ChevronDown 
                            className={`h-4 w-4 transition-transform ${queueExpanded ? 'rotate-180' : ''}`}
                        />
                    </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="border-t border-border/50">
                    <div className="p-3 space-y-2">
                        {queuedMessages.map((message, index) => (
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
        </Card>
    );
};