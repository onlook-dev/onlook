import type { EditMessage } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { ChatType, MessageCheckpointType, type ChatMessage, type GitMessageCheckpoint } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { nanoid } from 'nanoid';
import React, { useEffect, useRef, useState } from 'react';
import { SentContextPill } from '../context-pills/sent-context-pill';
import { MessageContent } from './message-content';
import { MultiBranchRevertModal } from './multi-branch-revert-modal';

interface UserMessageProps {
    onEditMessage: EditMessage;
    message: ChatMessage;
}

export const getUserMessageContent = (message: ChatMessage) => {
    return message.parts.map((part) => {
        if (part.type === 'text') {
            return part.text;
        }
        return '';
    }).join('');
}

export const UserMessage = ({ onEditMessage, message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const [isCopied, setIsCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isMultiBranchModalOpen, setIsMultiBranchModalOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gitCheckpoints = (message.metadata?.checkpoints?.filter(
        (s) => s.type === MessageCheckpointType.GIT,
    ) ?? []) as GitMessageCheckpoint[];

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            if (editValue === getUserMessageContent(message)) {
                textareaRef.current.setSelectionRange(editValue.length, editValue.length);
            }
        }
    }, [isEditing]);

    const handleEditClick = () => {
        setEditValue(getUserMessageContent(message));
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            void handleSubmit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    async function handleCopyClick() {
        const text = getUserMessageContent(message);
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    const handleSubmit = async () => {
        setIsEditing(false);
        await sendMessage(editValue);
    };

    const handleRetry = async () => {
        toast.promise(
            onEditMessage(message.id, getUserMessageContent(message), ChatType.EDIT),
            {
                error: 'Failed to resubmit message',
            }
        )
    };

    const sendMessage = async (newContent: string) => {
        toast.promise(
            onEditMessage(message.id, newContent, ChatType.EDIT),
            {
                loading: 'Editing message...',
                success: 'Message resubmitted successfully',
                error: 'Failed to resubmit message',
            }
        )
    };

    const handleRestoreSingleBranch = async (checkpoint: GitMessageCheckpoint) => {
        try {
            setIsRestoring(true);

            const branchData = editorEngine.branches.getBranchDataById(checkpoint.branchId);
            if (!branchData) {
                toast.error('Branch not found');
                return;
            }

            // Save current state before restoring
            const saveResult = await branchData.sandbox.gitManager.createCommit('Save before restoring backup');
            if (!saveResult.success) {
                toast.warning('Failed to save before restoring backup');
            }

            // Restore to the specified commit
            const restoreResult = await branchData.sandbox.gitManager.restoreToCommit(checkpoint.oid);

            if (!restoreResult.success) {
                throw new Error(restoreResult.error || 'Failed to restore commit');
            }

            const branchName = editorEngine.branches.getBranchById(checkpoint.branchId)?.name || checkpoint.branchId;
            toast.success('Restored to backup!', {
                description: `Branch "${branchName}" has been restored`,
            });
        } catch (error) {
            console.error('Failed to restore checkpoint', error);
            toast.error('Failed to restore checkpoint', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsRestoring(false);
        }
    };

    const getBranchName = (branchId: string): string => {
        const branch = editorEngine.branches.getBranchById(branchId);
        return branch?.name || branchId;
    };

    function renderEditingInput() {
        return (
            <div className="flex flex-col">
                <Textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-small border-none resize-none px-0 mt-[-8px]"
                    rows={2}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                />
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant={'ghost'} onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" variant={'outline'} onClick={handleSubmit}>
                        Submit
                    </Button>
                </div>
            </div>
        );
    }

    function renderButtons() {
        return (
            <div className="absolute right-2 top-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 bg-background-primary">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={handleRetry}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-1"
                        >
                            <Icons.Reload className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={5}>
                        Retry
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={handleEditClick}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-1"
                        >
                            <Icons.Pencil className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={5}>
                        Edit
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={handleCopyClick}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-1"
                        >
                            {isCopied ? (
                                <Icons.Check className="h-4 w-4 text-teal-200" />
                            ) : (
                                <Icons.Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={5}>
                        Copy
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="relative group w-full flex flex-row justify-end px-2" key={message.id}>
            <div className="w-[90%] flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary relative">
                {!isEditing && renderButtons()}
                <div className="h-6 relative">
                    <div className="absolute top-1 left-0 right-0 flex flex-row justify-start items-center w-full overflow-auto pr-16">
                        <div className="flex flex-row gap-3 text-micro text-foreground-secondary">
                            {message.metadata?.context?.map((context) => (
                                <SentContextPill key={nanoid()} context={context} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="text-small mt-1">
                    {isEditing ? (
                        renderEditingInput()
                    ) : (
                        <MessageContent
                            messageId={message.id}
                            parts={message.parts}
                            applied={false}
                            isStream={false}
                        />
                    )}
                </div>
            </div>
            {gitCheckpoints.length > 0 && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    {gitCheckpoints.length === 1 ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    className={cn(
                                        'text-xs opacity-0 group-hover:opacity-100 hover:opacity-80 rounded-md p-2',
                                        isRestoring ? 'opacity-100' : 'opacity-0',
                                    )}
                                    onClick={() => handleRestoreSingleBranch(gitCheckpoints[0]!)}
                                    disabled={isRestoring}
                                >
                                    {isRestoring ? (
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Icons.Reset className="h-4 w-4" />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={5}>
                                {isRestoring ? 'Restoring Checkpoint...' : `Restore ${getBranchName(gitCheckpoints[0]!.branchId)}`}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        'text-xs opacity-0 group-hover:opacity-100 hover:opacity-80 rounded-md p-2',
                                        isRestoring ? 'opacity-100' : 'opacity-0',
                                    )}
                                    disabled={isRestoring}
                                >
                                    {isRestoring ? (
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Icons.Reset className="h-4 w-4" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="right">
                                {gitCheckpoints.map((checkpoint) => (
                                    <DropdownMenuItem
                                        key={checkpoint.branchId}
                                        onClick={() => handleRestoreSingleBranch(checkpoint)}
                                    >
                                        {getBranchName(checkpoint.branchId)}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsMultiBranchModalOpen(true)}>
                                    Select Multiple Branches...
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <MultiBranchRevertModal
                        open={isMultiBranchModalOpen}
                        onOpenChange={setIsMultiBranchModalOpen}
                        checkpoints={gitCheckpoints}
                    />
                </div>
            )}
        </div>
    );
};
