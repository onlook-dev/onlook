import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const ChatHistory = observer(() => {
    const editorEngine = useEditorEngine();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const groups = [{ name: 'Today' }];

    return (
        <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild disabled={editorEngine.chat.isWaiting}>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className={cn('p-2 w-fit h-fit', {
                                    'bg-background-secondary text-primary': isHistoryOpen,
                                })}
                            >
                                <Icons.CounterClockwiseClock />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Chat History</p>
                        <TooltipArrow className="fill-foreground" />
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <PopoverAnchor className="absolute -left-2 top-0" />
            <PopoverContent side="left" align="start" className="rounded-xl p-0">
                <div className="flex flex-col">
                    <div className="border-b">
                        <div className="flex flex-row justify-between items-center p-1 h-fit text-xs text-foreground-tertiary">
                            <span className="px-2">Chat History</span>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className="p-2 w-fit hover:bg-transparent"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                <Icons.CrossL />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 p-2 text-foreground-tertiary">
                        {groups.map((group) => (
                            <div className="flex flex-col gap-1" key={group.name}>
                                <span className="text-[0.7rem] px-2">{group.name}</span>
                                <div className="flex flex-col">
                                    {editorEngine.chat.conversations.map((conversation) => (
                                        <button
                                            className={cn(
                                                'flex flex-row w-full p-2 gap-2 items-center rounded-md hover:bg-background-onlook active:bg-background-brand active:text-foreground cursor-pointer select-none',
                                                conversation.id ===
                                                    editorEngine.chat.conversation?.id &&
                                                    'bg-background-onlook text-primary font-semibold',
                                            )}
                                            key={conversation.id}
                                            onClick={() =>
                                                editorEngine.chat.selectConversation(
                                                    conversation.id,
                                                )
                                            }
                                        >
                                            <Icons.ChatBubble className="flex-none" />
                                            <span className="text-xs truncate">
                                                {conversation.displayName || 'New Conversation'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
});

export default ChatHistory;
