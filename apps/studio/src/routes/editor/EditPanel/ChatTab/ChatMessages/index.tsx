import { useEditorEngine } from '@/components/Context';
import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { GREETING_MSG } from '@/lib/editor/engine/chat/mockData';
import { ChatMessageType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import AssistantMessage from './AssistantMessage';
import UserMessage from './UserMessage';

const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [editorEngine.chat.isWaiting, editorEngine.chat.conversation?.messages]);

    function renderMessage(message: AssistantChatMessageImpl | UserChatMessageImpl) {
        switch (message.type) {
            case ChatMessageType.ASSISTANT:
                return <AssistantMessage message={message} />;
            case ChatMessageType.USER:
                return <UserMessage message={message} />;
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

    return editorEngine.chat.conversation ? (
        <div className="flex flex-col gap-2 select-text">
            {editorEngine.chat.conversation.messages.length === 0 && (
                <AssistantMessage message={GREETING_MSG} />
            )}
            {editorEngine.chat.conversation.messages.map((message) => renderMessage(message))}
            {editorEngine.chat.streamingMessage && (
                <AssistantMessage message={editorEngine.chat.streamingMessage} />
            )}
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full flex-row items-center gap-2 p-4 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {editorEngine.chat.stream.errorMessage &&
                renderErrorMessage(editorEngine.chat.stream.errorMessage)}
            <div ref={messagesEndRef} />
        </div>
    ) : (
        <div className="flex h-[70vh] w-full items-center justify-center text-foreground-secondary gap-2 text-sm">
            <Icons.Shadow className="h-6 w-6  animate-spin" />
            <span>Loading conversations</span>
        </div>
    );
});

export default ChatMessages;
