import { useEditorEngine } from '@/components/Context';
import { ChatRole } from '@/lib/editor/engine/chat';
import { FileIcon, ImageIcon, ShadowIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import React from 'react';

const fileIcons: { [key: string]: React.ComponentType } = {
    file: FileIcon,
    image: ImageIcon,
};

const ChatPanel = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <>
            {editorEngine.chat.messages.map((message) =>
                message.role === ChatRole.ASSISTANT ? (
                    <div
                        className="flex w-full flex-col gap-6 p-4 text-small content-start"
                        key={message.id}
                    >
                        <p>{message.content.text}</p>
                    </div>
                ) : (
                    <div className="w-full flex flex-row justify-end px-2" key={message.id}>
                        <div className="flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary">
                            {/* <div className="flex flex-row gap-3 text-micro mb-1.5 text-foreground-secondary">
                                {message.files?.map((file) => (
                                    <span
                                        className="flex flex-row gap-1 items-center"
                                        key={file.name}
                                    >
                                        {React.createElement(fileIcons[file.type])}
                                        <span>{file.name}</span>
                                    </span>
                                ))}
                            </div> */}
                            <div className="text-small">
                                <p>{message.content.text}</p>
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
        </>
    );
});

export default ChatPanel;
