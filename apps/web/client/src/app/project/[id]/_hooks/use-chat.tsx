'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType } from '@onlook/models';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useRef } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers<UIMessage> & { submitMessage: (message: UIMessage, type: ChatType) => Promise<void> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const lastMessageRef = useRef<UIMessage | null>(null);
    const posthog = usePostHog();

    const chat = useChat({
        id: 'user-chat',
        transport: new DefaultChatTransport({
            api: '/api/chat',
            credentials: 'include',
            headers: { 'Custom-Header': 'value' },
        }),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        async onToolCall({ toolCall }) {
            handleToolCall(toolCall, chat.addToolResult, editorEngine);
        },
        // onFinish: (message, { finishReason }) => {
        //     lastMessageRef.current = message;
        //     if (finishReason !== 'tool-calls') {
        //         editorEngine.chat.conversation.addAssistantMessage(message);
        //         editorEngine.chat.suggestions.generateSuggestions();
        //         lastMessageRef.current = null;
        //     }

        //     if (finishReason === 'stop') {
        //         editorEngine.chat.context.clearAttachments();
        //         editorEngine.chat.error.clear();
        //     } else if (finishReason === 'length') {
        //         editorEngine.chat.error.handleChatError(new Error('Output length limit reached'));
        //     } else if (finishReason === 'content-filter') {
        //         editorEngine.chat.error.handleChatError(new Error('Content filter error'));
        //     } else if (finishReason === 'other' || finishReason === 'unknown') {
        //         editorEngine.chat.error.handleChatError(new Error('Unknown finish reason'));
        //     }
        // },
        onError: (error) => {
            console.error('Error in chat', error);
            editorEngine.chat.error.handleChatError(error);

            if (lastMessageRef.current) {
                editorEngine.chat.conversation.addAssistantMessage(lastMessageRef.current);
                lastMessageRef.current = null;
            }
        },
    });

    const submitMessage = async (message: UIMessage, type: ChatType = ChatType.EDIT) => {
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();
        try {
            posthog.capture('user_send_message', {
                type,
            });
        } catch (error) {
            console.error('Error tracking user send message: ', error)
        }
        return chat.sendMessage(message,
            {
                body: {
                    chatType: type,
                },
            });
    };

    return <ChatContext.Provider value={{ ...chat, submitMessage }}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}
