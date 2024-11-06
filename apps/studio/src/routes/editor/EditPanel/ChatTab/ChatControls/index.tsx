import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';
import ChatHistory from './ChatHistory';

const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <div className="flex flex-row gap">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="p-2 w-fit h-fit hover:bg-transparent"
                        onClick={() => editorEngine.chat.startNewConversation()}
                    >
                        <Icons.Plus />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>New Chat</p>
                    <TooltipArrow className="fill-foreground" />
                </TooltipContent>
            </Tooltip>
            <ChatHistory />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="p-2 w-fit h-fit hover:bg-transparent"
                        onClick={() =>
                            editorEngine.chat.deleteConversation(editorEngine.chat.conversation.id)
                        }
                    >
                        <Icons.Trash />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Delete Chat</TooltipContent>
            </Tooltip>
        </div>
    );
});

export default ChatControls;
