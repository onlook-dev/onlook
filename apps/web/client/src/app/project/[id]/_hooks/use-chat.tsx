'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { toOnlookMessageFromVercel } from '@onlook/db';
import { ChatType } from '@onlook/models';
import type { Message } from 'ai';
import { observer } from 'mobx-react-lite';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useRef } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers & { sendMessage: (type: ChatType) => Promise<string | null | undefined> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export const ChatProvider = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const lastMessageRef = useRef<Message | null>(null);
    const posthog = usePostHog();

    const conversationId = editorEngine.chat.conversation.current?.conversation.id;
    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 20,
        body: {
            conversationId,
            projectId: editorEngine.projectId,
        },
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, { finishReason }) => {
            lastMessageRef.current = message;
            if (finishReason !== 'error') {
                editorEngine.chat.error.clear();
            }

            if (finishReason !== 'tool-calls') {
                editorEngine.chat.conversation.addOrReplaceMessage(toOnlookMessageFromVercel(message, conversationId ?? ''));
                editorEngine.chat.suggestions.generateSuggestions();
                lastMessageRef.current = null;
            }
            if (finishReason === 'stop') {
                editorEngine.chat.context.clearAttachments();
            } else if (finishReason === 'length') {
                editorEngine.chat.error.handleChatError(new Error('Output length limit reached'));
            } else if (finishReason === 'content-filter') {
                editorEngine.chat.error.handleChatError(new Error('Content filter error'));
            }
        },
        onError: (error) => {
            console.error('Error in chat', error);
            editorEngine.chat.error.handleChatError(error);

            if (lastMessageRef.current) {
                editorEngine.chat.conversation.addOrReplaceMessage(toOnlookMessageFromVercel(lastMessageRef.current, conversationId ?? ''));
                lastMessageRef.current = null;
            }
        },
        sendExtraMessageFields: true,
    });

    const sendMessage = async (type: ChatType = ChatType.EDIT) => {
        if (!conversationId) {
            throw new Error('No conversation id');
        }
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();
        chat.setMessages(editorEngine.chat.conversation.current?.messages ?? [] as any);
        try {
            posthog.capture('user_send_message', {
                type,
            });
        } catch (error) {
            console.error('Error tracking user send message: ', error)
        }
        return chat.reload({
            body: {
                chatType: type,
                conversationId
            },
        });
    };

    return <ChatContext.Provider value={{ ...chat, sendMessage }}>{children}</ChatContext.Provider>;
});

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}
