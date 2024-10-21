import { useEditorEngine } from '@/components/Context';
import { AssistantChatMessageImpl, UserChatMessageImpl } from '@/lib/editor/engine/chat/message';
import { platformSlash } from '@/lib/utils';
import { CodeIcon, FileIcon, ImageIcon, ShadowIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ChatMessageContext, ChatMessageRole } from '/common/models/chat';

const fileIcons: { [key: string]: React.ComponentType } = {
    file: FileIcon,
    image: ImageIcon,
    selected: CodeIcon,
};

const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();

    const getTruncatedName = (context: ChatMessageContext) => {
        let name = context.name;

        if (context.type === 'file' || context.type === 'image') {
            const parts = name.split(platformSlash);
            name = parts[parts.length - 1];
        }
        return name.length > 20 ? `${name.slice(0, 20)}...` : name;
    };

    function renderAssistantMessage(message: AssistantChatMessageImpl) {
        return (
            <div className="p-4 text-small content-start overflow-auto">
                {/* <div className="text-wrap">{message.content}</div> */}
            </div>
        );
    }

    function renderUserMessage(message: UserChatMessageImpl) {
        return (
            <div className="w-full flex flex-row justify-end px-2" key={message.id}>
                <div className="w-[90%] flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary">
                    {message.context.length > 0 && (
                        <div className="flex flex-row w-full overflow-auto gap-3 text-micro mb-1.5 text-foreground-secondary">
                            {message.context.map((context) => (
                                <span
                                    className="flex flex-row gap-1 items-center"
                                    key={context.name}
                                >
                                    {React.createElement(fileIcons[context.type])}
                                    <span>{getTruncatedName(context)}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="text-small">{/* <p>{message.content}</p> */}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {editorEngine.chat.messages.map((message) =>
                message.role === ChatMessageRole.ASSISTANT
                    ? renderAssistantMessage(message)
                    : renderUserMessage(message),
            )}
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full flex-row items-center gap-2 p-4 text-small content-start text-foreground-secondary">
                    <ShadowIcon className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
        </div>
    );
});

export default ChatMessages;
