import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import type { UserChatMessageImpl } from '@/components/store/editor/chat/message/user';
import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { nanoid } from 'nanoid';
import React, { useEffect, useRef, useState } from 'react';
import { SentContextPill } from '../context-pills/sent-context-pill';

interface UserMessageProps {
    message: UserChatMessageImpl;
}

export const UserMessage = ({ message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const { sendMessages } = useChatContext();
    const [isCopied, setIsCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            if (editValue === message.getStringContent()) {
                textareaRef.current.setSelectionRange(editValue.length, editValue.length);
            }
        }
    }, [isEditing]);

    const handleEditClick = () => {
        setEditValue(message.getStringContent());
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    async function handleCopyClick() {
        const text = message.getStringContent();
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    const handleSubmit = async () => {
        setIsEditing(false);
        await sendMessage(editValue);
    };

    const handleRetry = async () => {
        await sendMessage(message.getStringContent());
    };

    const sendMessage = async (newContent: string) => {
        const newMessages = await editorEngine.chat.getResubmitMessages(message.id, newContent);
        if (!newMessages) {
            console.error('Failed to resubmit message');
            return;
        }
        sendMessages(newMessages, ChatType.EDIT);
    };

    const handleRestoreCheckpoint = async () => {
        try {
            setIsRestoring(true);
            if (!message.commitOid) {
                throw new Error('No commit oid found');
            }
            const commit = await editorEngine.versions.getCommitByOid(message.commitOid);
            if (!commit) {
                throw new Error('Failed to get commit');
            }
            const success = await editorEngine.versions.checkoutCommit(commit);
            if (!success) {
                throw new Error('Failed to checkout commit');
            }
        } catch (error) {
            console.error('Failed to restore checkpoint', error);
            toast.error('Failed to restore checkpoint', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsRestoring(false);
        }
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

    function renderContent() {
        return <div>{message.getStringContent()}</div>;
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
                            {message.context.map((context) => (
                                <SentContextPill key={nanoid()} context={context} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="text-small mt-1">
                    {isEditing ? renderEditingInput() : renderContent()}
                </div>
            </div>
            {message.commitOid && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className={cn(
                                    'text-xs opacity-0 group-hover:opacity-100 hover:opacity-80 rounded-md p-2',
                                    isRestoring ? 'opacity-100' : 'opacity-0',
                                )}
                                onClick={handleRestoreCheckpoint}
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
                            {isRestoring ? 'Restoring Checkpoint...' : 'Restore Checkpoint'}
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}
        </div>
    );
};
