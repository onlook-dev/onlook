import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();
    const [isHovering, setIsHovering] = useState(false);

    const isStartingNewConversation = editorEngine.chat.conversation.creatingConversation;
    const isDisabled = editorEngine.chat.isStreaming || isStartingNewConversation;

    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        editorEngine.chat.focusChatInput();
    };

    return (
        <div className="flex flex-row">
            <Tooltip open={isHovering && isDisabled}>
                <TooltipTrigger asChild>
                    <span
                        className="inline-block"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        <Button
                            variant={'ghost'}
                            size={'icon'}
                            className="py-1 px-2 w-fit h-fit bg-transparent hover:!bg-transparent cursor-pointer group text-foreground-secondary hover:text-foreground-primary"
                            onClick={handleNewChat}
                            disabled={isDisabled}
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
                    </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" hideArrow>AI is still loading</TooltipContent>
            </Tooltip>
        </div>
    );
});
