import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();
    const { isWaiting } = useChatContext();

    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        editorEngine.chat.focusChatInput();
    };

    return (
        <div className="flex flex-row opacity-50 transition-opacity duration-200 group-hover/panel:opacity-100">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="p-2 w-fit h-fit hover:bg-background-onlook cursor-pointer"
                        onClick={handleNewChat}
                        disabled={isWaiting}
                    >
                        <Icons.Edit className='h-4 w-4' />
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
