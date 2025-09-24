// import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { observer } from 'mobx-react-lite';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

import { useEditorEngine } from '@/components/store/editor';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();

    const isStartingNewConversation = editorEngine.chat.conversation.creatingConversation;

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
                        className="hover:bg-background-onlook h-fit w-fit cursor-pointer p-2"
                        onClick={handleNewChat}
                        disabled={editorEngine.chat.isStreaming || isStartingNewConversation}
                    >
                        {isStartingNewConversation ? (
                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                        ) : (
                            <Icons.Edit className="h-4 w-4" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>New Chat</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});
