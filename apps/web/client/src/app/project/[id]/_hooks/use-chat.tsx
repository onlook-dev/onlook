import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType } from '@onlook/models';
import type { Message } from 'ai';
import { createContext, useContext } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers & { sendMessages: (messages: Message[], type: ChatType) => Promise<string | null | undefined> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 10,
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, config) => {
            if (config.finishReason !== 'tool-calls') {
                editorEngine.chat.conversation.addAssistantMessage(message);
            }
            if (config.finishReason === 'stop') {
                editorEngine.chat.context.clearAttachments();
            }
        },
        onError: (error) => {
            console.error('Error in chat', error);
            editorEngine.chat.error.handleChatError(error);
        },
    });

    const sendMessages = async (messages: Message[], type: ChatType = ChatType.EDIT) => {
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
