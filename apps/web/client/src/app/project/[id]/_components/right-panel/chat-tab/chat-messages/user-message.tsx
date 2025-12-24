import React, { memo, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';

import type { ChatMessage, GitMessageCheckpoint } from '@onlook/models';
import { ChatType, MessageCheckpointType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';

import type { EditMessage } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { restoreCheckpoint } from '@/components/store/editor/git';
import { observer } from 'mobx-react-lite';
import { SentContextPill } from '../context-pills/sent-context-pill';
import { MessageContent } from './message-content';
import { MultiBranchRevertModal } from './multi-branch-revert-modal';

interface UserMessageProps {
    onEditMessage: EditMessage;
    message: ChatMessage;
}

export const getUserMessageContent = (message: ChatMessage) => {
    return message.parts
        .map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        })
        .join('');
};

const UserMessageComponent = ({ onEditMessage, message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const [isCopied, setIsCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isMultiBranchModalOpen, setIsMultiBranchModalOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gitCheckpoints =
        message.metadata?.checkpoints?.filter((s) => s.type === MessageCheckpointType.GIT) ?? [];

    // Legacy checkpoints (created before multi-branch support) don't have branchId.
    // If any exist, fall back to simple single-branch restore UI.
    const hasLegacyCheckpoints = gitCheckpoints.some((cp) => !cp.branchId);

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
        toast.promise(onEditMessage(message.id, getUserMessageContent(message), ChatType.EDIT), {
            error: 'Failed to resubmit message',
        });
    };

    const sendMessage = async (newContent: string) => {
        toast.promise(onEditMessage(message.id, newContent, ChatType.EDIT), {
            loading: 'Editing message...',
            success: 'Message resubmitted successfully',
            error: 'Failed to resubmit message',
        });
    };

    const handleRestoreSingleBranch = async (checkpoint: GitMessageCheckpoint) => {
        setIsRestoring(true);
        await restoreCheckpoint(checkpoint, editorEngine);
        setIsRestoring(false);
    };

    const handleRestoreLegacy = async () => {
        // Legacy checkpoints without branchId will restore to the active branch
        const firstCheckpoint = gitCheckpoints[0];
        if (firstCheckpoint) {
            setIsRestoring(true);
            await restoreCheckpoint(firstCheckpoint, editorEngine);
            setIsRestoring(false);
        }
    };

    const getBranchName = (branchId: string | undefined): string => {
        if (!branchId) {
            return editorEngine.branches.activeBranch.name;
        }
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
                    className="text-small mt-[-8px] resize-none border-none px-0"
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
            <div className="bg-background-primary absolute top-2 right-2 z-10 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
        <div className="group relative flex w-full flex-row justify-end px-2" key={message.id}>
            <div className="bg-background-primary relative ml-8 flex w-[90%] flex-col rounded-lg rounded-br-none border-[0.5px] p-2 shadow-sm">
                {!isEditing && renderButtons()}
                <div className="relative h-6">
                    <div className="absolute top-1 right-0 left-0 flex w-full flex-row items-center justify-start overflow-auto pr-16">
                        <div className="text-micro text-foreground-secondary flex flex-row gap-3">
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
                <div className="absolute top-1/2 left-2 -translate-y-1/2">
                    {hasLegacyCheckpoints ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleRestoreLegacy}
                                    className={cn(
                                        'rounded-md p-2 text-xs opacity-0 group-hover:opacity-100 hover:opacity-80',
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
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={5}>
                                {isRestoring ? 'Restoring...' : 'Restore to here'}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <>
                            <Tooltip>
                                <DropdownMenu>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={cn(
                                                    'rounded-md p-2 text-xs opacity-0 group-hover:opacity-100 hover:opacity-80',
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
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={5}>
                                        {isRestoring ? 'Restoring...' : 'Restore to here'}
                                    </TooltipContent>
                                    <DropdownMenuContent align="start" side="right">
                                        <DropdownMenuLabel>Restore Branch</DropdownMenuLabel>
                                        {gitCheckpoints.map((checkpoint) => (
                                            <DropdownMenuItem
                                                key={checkpoint.branchId}
                                                onClick={() => handleRestoreSingleBranch(checkpoint)}
                                            >
                                                {getBranchName(checkpoint.branchId)}
                                            </DropdownMenuItem>
                                        ))}
                                        {gitCheckpoints.length > 1 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setIsMultiBranchModalOpen(true)}
                                                >
                                                    Select Multiple Branches...
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </Tooltip>
                            <MultiBranchRevertModal
                                open={isMultiBranchModalOpen}
                                onOpenChange={setIsMultiBranchModalOpen}
                                checkpoints={gitCheckpoints}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export const UserMessage = memo(observer(UserMessageComponent));
