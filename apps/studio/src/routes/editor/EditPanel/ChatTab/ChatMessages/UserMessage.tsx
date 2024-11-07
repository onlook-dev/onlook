import { useEditorEngine } from '@/components/Context';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { getTruncatedFileName } from '@/lib/utils';
import type { ChatMessageContext } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import React, { useState } from 'react';

const FILE_ICONS: { [key: string]: React.ComponentType } = {
    file: Icons.File,
    image: Icons.Image,
    selected: Icons.Code,
};

interface UserMessageProps {
    message: UserChatMessageImpl;
}

const UserMessage = ({ message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const [buttonHover, setButtonHover] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    function getTruncatedName(context: ChatMessageContext) {
        let name = context.name;
        if (context.type === 'file' || context.type === 'image') {
            name = getTruncatedFileName(name);
        }
        return name.length > 20 ? `${name.slice(0, 20)}...` : name;
    }

    const handleEditClick = () => {
        setEditValue(message.content.map((content) => content.text).join(''));
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
        return message.content.map((content) => <span key={content.text}>{content.text}</span>);
    }

    function renderEditButton() {
        return (
            <Button
                onClick={handleEditClick}
                onMouseEnter={() => setButtonHover(true)}
                onMouseLeave={() => setButtonHover(false)}
                className="group h-5 py-0 p-1 gap-1 bg-background-secondary hover:bg-background hover:border-border absolute -bottom-3 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
                <p
                    className={cn(
                        'overflow-hidden text-[9px] text-white transition-all duration-200',
                        buttonHover ? 'w-6' : 'w-0',
                    )}
                >
                    Edit
                </p>
                <Icons.Pencil className="w-3 h-3 text-foreground-primary" />
            </Button>
        );
    }
    return (
        <div className="relative group w-full flex flex-row justify-end px-2" key={message.id}>
            <div className="w-[90%] flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary">
                {message.context.length > 0 && (
                    <div className="flex flex-row w-full overflow-auto gap-3 text-micro mb-1.5 text-foreground-secondary">
                        {message.context.map((context) => (
                            <span className="flex flex-row gap-1 items-center" key={context.name}>
                                {React.createElement(FILE_ICONS[context.type])}
                                <span>{getTruncatedName(context)}</span>
                            </span>
                        ))}
                    </div>
                )}
                <div className="text-small">
                    {isEditing ? renderEditingInput() : renderContent()}
                </div>
            </div>
            {!isEditing && renderEditButton()}
        </div>
    );
};

export default UserMessage;
