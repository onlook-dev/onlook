import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType } from '@onlook/models';
import type { Message } from 'ai';
import { createContext, useContext, useRef } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers & { sendMessages: (messages: Message[], type: ChatType) => Promise<string | null | undefined> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const lastMessageRef = useRef<Message | null>(null);

    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 20,
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, { finishReason }) => {
            lastMessageRef.current = message;
            if (finishReason !== 'tool-calls') {
                editorEngine.chat.conversation.addAssistantMessage(message);
                lastMessageRef.current = null;
            }

            if (finishReason === 'stop') {
                editorEngine.chat.context.clearAttachments();
                editorEngine.chat.error.clear();
            } else if (finishReason === 'length') {
                editorEngine.chat.error.handleChatError(new Error('Output length limit reached'));
            } else if (finishReason === 'content-filter') {
                editorEngine.chat.error.handleChatError(new Error('Content filter error'));
            } else if (finishReason === 'error') {
                editorEngine.chat.error.handleChatError(new Error('Error in chat'));
            } else if (finishReason === 'other' || finishReason === 'unknown') {
                editorEngine.chat.error.handleChatError(new Error('Unknown finish reason'));
            }
        },
        onError: (error) => {
            console.error('Error in chat', error);
            editorEngine.chat.error.handleChatError(error);

            if (lastMessageRef.current) {
                editorEngine.chat.conversation.addAssistantMessage(lastMessageRef.current);
                lastMessageRef.current = null;
            }
        },
    });

    const sendMessages = async (messages: Message[], type: ChatType = ChatType.EDIT) => {
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();
        chat.setMessages(messages);
        return chat.reload({
            body: {
                chatType: type,
            },
        });
    };

    return <ChatContext.Provider value={{ ...chat, sendMessages }}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}
