import { useEditorEngine } from '@/components/Context';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { nanoid } from 'nanoid';
import React, { useEffect, useRef, useState } from 'react';
import { SentContextPill } from '../ContextPills/SentContextPill';

interface UserMessageProps {
    message: UserChatMessageImpl;
}

const UserMessage = ({ message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const [isCopied, setIsCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(editValue.length, editValue.length);
        }
    }, [isEditing, editValue]);

    const handleEditClick = () => {
        setEditValue(message.content);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const handleSubmit = () => {
        editorEngine.chat.resubmitMessage(message.id, editValue);
        setIsEditing(false);
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

    function handleCopyClick() {
        const text = message.content;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    const handleRetry = () => {
        editorEngine.chat.resubmitMessage(message.id, message.content);
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
        return <div>{message.content}</div>;
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
                    <TooltipContent>Retry</TooltipContent>
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
                    <TooltipContent>Edit</TooltipContent>
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
                    <TooltipContent>Copy</TooltipContent>
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
        </div>
    );
};

export default UserMessage;
