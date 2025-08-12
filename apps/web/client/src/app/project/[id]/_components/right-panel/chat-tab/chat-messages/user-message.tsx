import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { ChatType, MessageCheckpointType, type UserChatMessage } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from './message-content/markdown-renderer';

interface UserMessageProps {
    message: UserChatMessage;
}

export const getUserMessageContent = (message: UserChatMessage) => {
    return message.content.parts.map((part) => {
        if (part.type === 'text') {
            return part.text;
        }
        return '';
    }).join('\n');
}

export const UserMessage = ({ message }: UserMessageProps) => {
    const editorEngine = useEditorEngine();
    const { sendMessage: sendMessageToChat } = useChatContext();
    const [isCopied, setIsCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(getUserMessageContent(message));

    const handleCopy = async () => {
        await navigator.clipboard.writeText(getUserMessageContent(message));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleEdit = () => setIsEditing(true);

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditValue(getUserMessageContent(message));
    };

    const handleSubmit = async () => {
        setIsEditing(false);
        await sendMessage(editValue);
    };

    const handleRetry = async () => {
        await sendMessage(getUserMessageContent(message));
    };

    const sendMessage = async (newContent: string) => {
        try {
            const newMessage = await editorEngine.chat.resubmitMessage(message.id, newContent);
            if (!newMessage) {
                throw new Error('Message not found');
            }
            sendMessageToChat(ChatType.EDIT);
        } catch (error) {
            console.error('Error resubmitting message', error);
        }
    };

    return (
        <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
            {isEditing ? (
                <div className="flex flex-col gap-2">
                    <textarea
                        className="w-full rounded-md border border-border p-2 text-foreground bg-background-secondary"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={4}
                    />
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleSubmit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                    </div>
                </div>
            ) : (
                <MarkdownRenderer
                    messageId={message.id}
                    type="text"
                    key={message.id}
                    content={getUserMessageContent(message)}
                    applied={message.applied ?? false}
                    isStream={false}
                />
            )}
            <div className="flex items-center gap-2">
                <Button size="xs" variant="ghost" onClick={handleCopy}>
                    {isCopied ? <Icons.Check className="w-4 h-4" /> : <Icons.Copy className="w-4 h-4" />}
                    <span className="ml-1">Copy</span>
                </Button>
                <Button size="xs" variant="ghost" onClick={handleEdit}>
                    <Icons.Pencil className="w-4 h-4" />
                    <span className="ml-1">Edit</span>
                </Button>
                <Button size="xs" variant="ghost" onClick={handleRetry}>
                    <Icons.RefreshCw className="w-4 h-4" />
                    <span className="ml-1">Retry</span>
                </Button>
            </div>
        </div>
    );
}
