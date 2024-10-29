import { useEditorEngine } from '@/components/Context';
import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import type { SystemChatMessageImpl } from '@/lib/editor/engine/chat/message/system';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { getTruncatedFileName } from '@/lib/utils';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import CodeChangeBlock from './CodeChangeBlock';
import { ChatMessageType } from '/common/models/chat/message';
import type { ChatMessageContext } from '/common/models/chat/message/context';

const fileIcons: { [key: string]: React.ComponentType } = {
    file: Icons.File,
    image: Icons.Image,
    selected: Icons.Code,
};

const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [editorEngine.chat.isWaiting]);

    function getTruncatedName(context: ChatMessageContext) {
        let name = context.name;
        if (context.type === 'file' || context.type === 'image') {
            name = getTruncatedFileName(name);
        }
        return name.length > 20 ? `${name.slice(0, 20)}...` : name;
    }

    function renderAssistantMessage(message: AssistantChatMessageImpl) {
        return (
            <div className="p-4 text-small content-start overflow-auto">
                <div className="flex flex-col text-wrap gap-2">
                    {message.content.map((content) => {
                        if (content.type === 'text') {
                            return <p key={content.text}>{content.text}</p>;
                        } else if (content.type === 'code') {
                            return <CodeChangeBlock key={content.id} content={content} />;
                        }
                    })}
                </div>
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
                    <div className="text-small">
                        {message.content.map((content) => (
                            <span key={content.text}>{content.text}</span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    function renderMessage(
        message: AssistantChatMessageImpl | UserChatMessageImpl | SystemChatMessageImpl,
    ) {
        switch (message.type) {
            case ChatMessageType.ASSISTANT:
                return renderAssistantMessage(message);
            case ChatMessageType.USER:
                return renderUserMessage(message);
        }
    }

    function renderErrorMessage(errorMessage: string) {
        return (
            <div className="flex w-full flex-row items-center justify-center gap-2 p-2 text-small text-red">
                <Icons.ExclamationTriangle className="w-6" />
                <p className="w-5/6 text-wrap overflow-auto">{errorMessage}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {editorEngine.chat.messages.map((message) => renderMessage(message))}
            {editorEngine.chat.streamingMessage &&
                renderMessage(editorEngine.chat.streamingMessage)}
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full flex-row items-center gap-2 p-4 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {editorEngine.chat.streamResolver.errorMessage &&
                renderErrorMessage(editorEngine.chat.streamResolver.errorMessage)}
            <div ref={messagesEndRef} />
        </div>
    );
});

export default ChatMessages;
