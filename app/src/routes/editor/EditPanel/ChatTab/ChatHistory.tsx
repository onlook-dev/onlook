import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatBubbleIcon, CounterClockwiseClockIcon, Cross1Icon } from '@radix-ui/react-icons';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { useState } from 'react';

const exampleHistory = [
    {
        timeLabel: 'Today',
        chats: [
            {
                id: '1',
                text: 'When @button.tsx is clicked, make the map card appear and have an active background',
            },
            {
                id: '2',
                text: 'Another example chat for more to see how the chats look',
            },
            {
                id: '3',
                text: 'Another example chat for more to see how the chats look',
            },
        ],
    },
    {
        timeLabel: '3d ago',
        chats: [
            {
                id: '1',
                text: 'Another example chat for more to see how the chats look',
            },
            {
                id: '2',
                text: 'Another example chat for more to see how the chats look',
            },
            {
                id: '3',
                text: 'Another example chat for more to see how the chats look',
            },
            {
                id: '4',
                text: 'Another example chat for more to see how the chats look',
            },
            {
                id: '5',
                text: 'Another example chat for more to see how the chats look',
            },
        ],
    },
    {
        timeLabel: '5d ago',
        chats: [
            {
                id: '1',
                text: 'Another example chat for more to see how the chats look',
            },
        ],
    },
];

const ChatHistory = () => {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    return (
        <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className={clsx('p-2 w-fit h-fit', {
                                    'bg-background-secondary text-primary': isHistoryOpen,
                                })}
                            >
                                <CounterClockwiseClockIcon />
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
                                <Cross1Icon />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 p-2 text-foreground-tertiary">
                        {exampleHistory.map((history) => (
                            <div className="flex flex-col gap-1" key={history.timeLabel}>
                                <span className="text-[0.7rem] px-2">{history.timeLabel}</span>
                                <div className="flex flex-col">
                                    {history.chats.map((chat) => (
                                        <div
                                            className="flex flex-row w-full p-2 gap-2 items-center rounded-md hover:bg-background-onlook active:bg-background-brand active:text-foreground cursor-pointer select-none"
                                            key={chat.id}
                                        >
                                            <ChatBubbleIcon className="flex-none" />
                                            <span className="text-xs truncate">{chat.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ChatHistory;
