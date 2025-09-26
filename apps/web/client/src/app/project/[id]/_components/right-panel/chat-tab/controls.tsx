import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();

    const isStartingNewConversation = editorEngine.chat.conversation.creatingConversation;
    const canAddNewChat = editorEngine.chat.multiChat.canAddNewChat;
    const currentConversationId = editorEngine.chat.multiChat.selectedChatId;
    const isCurrentConversationStreaming = currentConversationId ? 
        editorEngine.chat.isConversationStreaming(currentConversationId) : false;

    const handleNewChat = async () => {
        if (!canAddNewChat) return;
        
        // Start a new conversation
        await editorEngine.chat.conversation.startNewConversation();
        const newConversation = editorEngine.chat.conversation.current;
        
        if (newConversation) {
            await editorEngine.chat.multiChat.addChat(newConversation);
        }
        
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
                        disabled={isStartingNewConversation || !canAddNewChat}
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
