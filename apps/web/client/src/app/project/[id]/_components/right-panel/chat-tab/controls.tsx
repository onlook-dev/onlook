import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();

    const isStartingNewConversation = editorEngine.chat.conversation.creatingConversation;

    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        editorEngine.chat.focusChatInput();
    };

    return (
        <div className="flex flex-row">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="py-1 px-2 w-fit h-fit bg-transparent hover:!bg-transparent cursor-pointer group text-foreground-secondary hover:text-foreground-primary"
                        onClick={handleNewChat}
                        disabled={editorEngine.chat.isStreaming || isStartingNewConversation}
                    >
                        {isStartingNewConversation ? (
                            <>
                                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                <span className="text-small">New Chat</span>
                            </>
                        ) : (
                            <>
                                <Icons.Edit className="h-4 w-4" />
                                <span className="text-small">New Chat</span>
                            </>
                        )}
                    </Button>
                </TooltipTrigger>
            </Tooltip>
        </div>
    );
});
