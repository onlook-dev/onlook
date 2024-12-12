import { useEditorEngine } from '@/components/Context';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import React, { useState } from 'react';
import { SentContextPill } from '../ContextPills/SentContextPill';
interface UserMessageProps {
    message: UserChatMessageImpl;
}

const UserMessage = ({ message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const [isEditHovered, setIsEditHovered] = useState(false);
    const [isCopyHovered, setIsCopyHovered] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    function handleCopyClick() {
        const text = message.content;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    function renderEditingInput() {
        return (
            <div className="flex flex-col gap-2 pt-2">
                <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-small border-none resize-none"
                    rows={3}
                    onKeyDown={handleKeyDown}
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
        return <span key={message.content}>{message.content}</span>;
    }

    function renderEditButton() {
        return (
            <Button
                onClick={handleEditClick}
                onMouseEnter={() => setIsEditHovered(true)}
                onMouseLeave={() => setIsEditHovered(false)}
                className="h-5 py-0 p-1 gap-1 bg-background-secondary hover:bg-background hover:border-border"
            >
                <p
                    className={cn(
                        'overflow-hidden text-[10px] text-white transition-all duration-200',
                        isEditHovered ? 'w-6' : 'w-0',
                    )}
                >
                    Edit
                </p>
                <Icons.Pencil className="w-3 h-3 text-foreground-primary" />
            </Button>
        );
    }

    function renderCopyButton() {
        return (
            <Button
                onClick={handleCopyClick}
                onMouseEnter={() => setIsCopyHovered(true)}
                onMouseLeave={() => setIsCopyHovered(false)}
                className="h-5 py-0 p-1 gap-1 bg-background-secondary hover:bg-background hover:border-border"
            >
                <p
                    className={cn(
                        'overflow-hidden text-[10px] text-white transition-all duration-200',
                        isCopyHovered ? 'w-6' : 'w-0',
                    )}
                >
                    Copy
                </p>
                {isCopied ? (
                    <Icons.Check className="w-3 h-3 text-foreground-primary" />
                ) : (
                    <Icons.Copy className="w-3 h-3 text-foreground-primary" />
                )}
            </Button>
        );
    }

    return (
        <div className="relative group w-full flex flex-row justify-end px-2" key={message.id}>
            <div className="w-[90%] flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary">
                {message.context.length > 0 && (
                    <div className="flex flex-row w-full overflow-auto gap-3 text-micro mb-1.5 text-foreground-secondary">
                        {message.context.map((context) => (
                            <SentContextPill key={context.displayName} context={context} />
                        ))}
                    </div>
                )}
                <div className="text-small">
                    {isEditing ? renderEditingInput() : renderContent()}
                </div>
            </div>
            <div className="flex gap-1 absolute -bottom-3 right-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {!isEditing && renderCopyButton()}
                {!isEditing && renderEditButton()}
            </div>
        </div>
    );
};

export default UserMessage;
