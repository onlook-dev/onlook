import { FileIcon, ImageIcon } from '@radix-ui/react-icons';
import React from 'react';

const fileIcons: { [key: string]: React.ComponentType } = {
    file: FileIcon,
    image: ImageIcon,
};

const exampleChat = {
    messages: [
        {
            id: '1',
            agent: 'user',
            text: [
                'When @button.tsx is clicked, make the map card appear and have an active background',
            ],
            files: [
                { type: 'file', name: 'map_card.tsx' },
                { type: 'image', name: 'example.jpg' },
            ],
        },
        {
            id: '2',
            agent: 'AI',
            text: [
                'I opened map-card.tsx and button.tsx adding in the correct classes.',
                'You need to add X that will let Y happen. To make sure Y is functional, be sure to test Z.',
                'Let me know what you think!',
            ],
        },
    ],
};

const ChatPanel = () => {
    return (
        <>
            {exampleChat.messages.map((message) =>
                message.agent === 'AI' ? (
                    <div
                        className="flex w-full flex-col gap-6 p-4 text-small content-start"
                        key={message.id}
                    >
                        {message.text.map((text) => (
                            <p key={text}>{text}</p>
                        ))}
                    </div>
                ) : (
                    <div className="w-full flex flex-row justify-end px-2" key={message.id}>
                        <div className="flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary">
                            <div className="flex flex-row gap-3 text-micro mb-1.5 text-foreground-secondary">
                                {message.files?.map((file) => (
                                    <span
                                        className="flex flex-row gap-1 items-center"
                                        key={file.name}
                                    >
                                        {React.createElement(fileIcons[file.type])}
                                        <span>{file.name}</span>
                                    </span>
                                ))}
                            </div>
                            <div className="text-small">
                                {message.text.map((text) => (
                                    <p key={text}>{text}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                ),
            )}
        </>
    );
};

export default ChatPanel;
