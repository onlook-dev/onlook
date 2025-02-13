import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ChatHistory from './ChatHistory';

const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState<boolean | undefined>(undefined);

    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        setIsHistoryOpen(false);
        editorEngine.chat.focusChatInput();
    };

    const handleHistoryOpenChange = (open: boolean) => {
        setIsHistoryOpen(open);
        // Force tooltip to close when dialog closes
        if (!open) {
            setShowTooltip(false);
            // Reset tooltip state after a brief delay to allow hover to work again
            setTimeout(() => setShowTooltip(undefined), 200);
        }
    };

    return (
        <div className="flex flex-row gap">
            <Tooltip open={isHistoryOpen ? false : showTooltip}>
                <TooltipTrigger asChild>
                    <div>
                        <ChatHistory
                            isOpen={isHistoryOpen}
                            onOpenChange={handleHistoryOpenChange}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Chat History</p>
                    <TooltipArrow className="fill-foreground" />
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="p-2 w-fit h-fit hover:bg-background-onlook"
                        onClick={handleNewChat}
                        disabled={editorEngine.chat.isWaiting}
                    >
                        <Icons.Plus />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>New Chat</p>
                    <TooltipArrow className="fill-foreground" />
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

export default ChatControls;
