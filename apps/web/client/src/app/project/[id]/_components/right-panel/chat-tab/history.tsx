import { useState } from 'react';
import { observer } from 'mobx-react-lite';

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

import { useEditorEngine } from '@/components/store/editor';

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
            <PopoverAnchor className="absolute top-0 -left-2" />
            <PopoverContent side="left" align="start" className="rounded-xl p-0">
                <div className="flex flex-col select-none">
                    <div className="border-b">
                        <div className="text-foreground-tertiary flex h-fit flex-row items-center justify-between p-1 text-xs">
                            <span className="px-2">Chat History</span>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className="w-fit p-2 hover:bg-transparent"
                                onClick={() => onOpenChange(false)}
                            >
                                <Icons.CrossL />
                            </Button>
                        </div>
                    </div>
                    <div className="text-foreground-tertiary flex flex-col gap-2 p-2">
                        <div className="flex flex-col">
                            {groups.map((group) => (
                                <div className="flex flex-col gap-1" key={group.name}>
                                    <span className="px-2 text-[0.7rem]">{group.name}</span>
                                    <div className="flex flex-col">
                                        {sortedConversations.map((conversation) => (
                                            <div
                                                className={cn(
                                                    'hover:bg-background-onlook group relative flex w-full cursor-pointer flex-row items-center rounded-md py-2 select-none',
                                                    conversation.id ===
                                                        editorEngine.chat.conversation.current
                                                            ?.id &&
                                                        'bg-background-onlook text-primary font-semibold',
                                                )}
                                                key={conversation.id}
                                                onClick={() =>
                                                    editorEngine.chat.conversation.selectConversation(
                                                        conversation.id,
                                                    )
                                                }
                                            >
                                                <Icons.ChatBubble className="mx-2 flex-none" />
                                                <span className="w-80 truncate text-left text-xs">
                                                    {conversation.title ?? 'New Conversation'}
                                                </span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant={'ghost'}
                                                            size={'icon'}
                                                            className="group-hover:bg-background-primary hover:bg-background-tertiary absolute top-1/2 right-0 z-10 h-fit w-fit -translate-y-1/2 px-2.5 py-2 opacity-0 group-hover:opacity-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConversationToDelete(
                                                                    conversation.id,
                                                                );
                                                                setShowDeleteDialog(true);
                                                            }}
                                                        >
                                                            <Icons.Trash className="h-4 w-4" />
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
