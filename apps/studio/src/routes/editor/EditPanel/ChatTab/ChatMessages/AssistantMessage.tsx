import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const AssistantMessage = ({ message }: { message: AssistantChatMessageImpl }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="p-4 text-small content-start group">
            <div className="flex flex-row gap-2">
                <div className="flex flex-col text-wrap gap-2 flex-grow">
                    <MarkdownRenderer
                        messageId={message.id}
                        content={message.content}
                        applied={message.applied}
                        isStream={message.isStream}
                    />
                </div>
                <button
                    onClick={handleCopy}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 self-start mt-1"
                >
                    {isCopied ? (
                        <Icons.Check className="h-4 w-4 text-green-500" />
                    ) : (
                        <Icons.Copy className="h-4 w-4 text-foreground-secondary hover:text-foreground" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default AssistantMessage;
