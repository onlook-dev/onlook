import { useEditorEngine } from '@/components/store/editor';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverAnchor, PopoverContent } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';

import { observer } from 'mobx-react-lite';
import { useState } from 'react';

interface ChatHistoryProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ChatHistory = observer(({ isOpen, onOpenChange }: ChatHistoryProps) => {
    const editorEngine = useEditorEngine();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

    const handlePopoverOpenChange = (open: boolean) => {
        if (!showDeleteDialog) {
            onOpenChange(open);
        }
    };

    const handleDeleteConversation = () => {
        if (conversationToDelete) {
            editorEngine.chat.conversation.deleteConversation(conversationToDelete);
            setShowDeleteDialog(false);
            setConversationToDelete(null);
        }
    };

    const groups = [{ name: 'Today' }];

    // Sort conversations by creation time, newest first
    const sortedConversations = [...editorEngine.chat.conversation.conversations].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
        <Popover open={isOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverAnchor className="absolute -left-2 top-0" />
            <PopoverContent side="left" align="start" className="rounded-xl p-0">
                <div className="flex flex-col select-none">
                    <div className="border-b">
                        <div className="flex flex-row justify-between items-center p-1 h-fit text-xs text-foreground-tertiary">
                            <span className="px-2">Chat History</span>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className="p-2 w-fit hover:bg-transparent"
                                onClick={() => onOpenChange(false)}
                            >
                                <Icons.CrossL />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 p-2 text-foreground-tertiary">
                        <div className="flex flex-col">
                            {groups.map((group) => (
                                <div className="flex flex-col gap-1" key={group.name}>
                                    <span className="text-[0.7rem] px-2">{group.name}</span>
                                    <div className="flex flex-col">
                                        {sortedConversations.map((conversation) => (
                                            <div
                                                className={cn(
                                                    'flex flex-row w-full py-2 items-center rounded-md hover:bg-background-onlook cursor-pointer select-none group relative',
                                                    conversation.id ===
                                                    editorEngine.chat.conversation.current?.conversation.id &&
                                                    'bg-background-onlook text-primary font-semibold',
                                                )}
                                                key={conversation.id}
                                                onClick={() =>
                                                    editorEngine.chat.conversation.selectConversation(
                                                        conversation.id,
                                                    )
                                                }
                                            >
                                                <Icons.ChatBubble className="flex-none mx-2" />
                                                <span className="text-xs truncate w-80 text-left">
                                                    {conversation.title ?? 'New Conversation'}
                                                </span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant={'ghost'}
                                                            size={'icon'}
                                                            className="absolute right-0 px-2.5 py-2 top-1/2 -translate-y-1/2 w-fit h-fit opacity-0 group-hover:opacity-100 group-hover:bg-background-primary hover:bg-background-tertiary z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConversationToDelete(
                                                                    conversation.id,
                                                                );
                                                                setShowDeleteDialog(true);
                                                            }}
                                                        >
                                                            <Icons.Trash className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        <p className="font-normal">
                                                            Delete Conversation
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PopoverContent>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to delete this conversation?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            conversation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={'destructive'}
                            className="rounded-md text-sm"
                            onClick={handleDeleteConversation}
                        >
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Popover>
    );
});
