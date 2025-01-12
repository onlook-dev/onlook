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
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!editorEngine.chat.shouldAutoScroll) {
            return;
        }
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [
        editorEngine.chat.streamingMessage,
        editorEngine.chat.isWaiting,
        editorEngine.chat.conversation.current?.messages,
    ]);

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        if (!event.isTrusted) {
            return;
        }
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < 10;
        editorEngine.chat.shouldAutoScroll = isAtBottom;
    };

    function renderMessage(message: AssistantChatMessageImpl | UserChatMessageImpl) {
        let messageNode;
        switch (message.type) {
            case ChatMessageType.ASSISTANT:
                messageNode = <AssistantMessage message={message} />;
                break;
            case ChatMessageType.USER:
                messageNode = <UserMessage message={message} />;
                break;
        }
        return <div key={message.id}>{messageNode}</div>;
    }

    function renderErrorMessage() {
        const errorMessage = editorEngine.chat.stream.errorMessage;
        if (errorMessage === null) {
            return null;
        }
        return (
            <div className="flex w-full flex-row items-center justify-center gap-2 p-2 text-small text-red">
                <Icons.ExclamationTriangle className="w-6" />
                <p className="w-5/6 text-wrap overflow-auto">{errorMessage}</p>
            </div>
        );
    }

    return editorEngine.chat.conversation.current ? (
        <div
            ref={containerRef}
            onWheel={handleWheel}
            className="flex flex-col gap-2 select-text overflow-auto"
        >
            {editorEngine.chat.conversation.current.messages.length === 0 && (
                <AssistantMessage message={GREETING_MSG} />
            )}
            {editorEngine.chat.conversation.current.messages.map((message) =>
                renderMessage(message),
            )}
            {editorEngine.chat.streamingMessage &&
                renderMessage(editorEngine.chat.streamingMessage)}
            {editorEngine.chat.isWaiting && (
                <div className="flex w-full flex-row items-center gap-2 p-4 text-small content-start text-foreground-secondary">
                    <Icons.Shadow className="animate-spin" />
                    <p>Thinking ...</p>
                </div>
            )}
            {renderErrorMessage()}
            <div ref={messagesEndRef} />
        </div>
    ) : (
        <div className="flex h-[70vh] w-full items-center justify-center text-foreground-secondary gap-2 text-sm">
            <Icons.Shadow className="h-6 w-6 animate-spin" />
            <span>Loading conversations</span>
        </div>
    );
});

export default ChatMessages;
