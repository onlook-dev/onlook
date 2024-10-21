import { useEditorEngine } from '@/components/Context';
import { CodeIcon, FileIcon, ImageIcon, ShadowIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ChatMessageRole } from '/common/models/chat';

const fileIcons: { [key: string]: React.ComponentType } = {
    file: FileIcon,
    image: ImageIcon,
    selected: CodeIcon,
};

const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <div className="flex flex-col gap-2">
            {editorEngine.chat.messages.map((message) =>
                message.role === ChatMessageRole.ASSISTANT ? (
                    <div
                        className="flex w-full flex-col gap-6 p-4 text-small content-start"
                        key={message.id}
                    >
                        <p>{message.getContentText()}</p>
                    </div>
                ) : (
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
                                            <span>{context.name}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="text-small">
                                <p>{message.getContentText()}</p>
                            </div>
                        </div>
                    </div>
                ),
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
