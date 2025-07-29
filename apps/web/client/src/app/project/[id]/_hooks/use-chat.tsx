'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { toMastraMessageFromOnlook, toOnlookMessageFromVercel } from '@onlook/db';
import { ChatType, type UserChatMessage } from '@onlook/models';
import type { Message } from 'ai';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers & { sendMessage: (message: UserChatMessage, type: ChatType) => Promise<string | null | undefined> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const lastMessageRef = useRef<Message | null>(null);
    const posthog = usePostHog();
    const [conversationId, setConversationId] = useState<string | null>(null);

    useEffect(() => {
        if (editorEngine.chat.conversation.current?.conversation.id) {
            setConversationId(editorEngine.chat.conversation.current?.conversation.id);
        }
    }, [editorEngine.chat.conversation.current?.conversation.id]);

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
            if (finishReason !== 'tool-calls') {
                editorEngine.chat.conversation.addOrReplaceMessage(toOnlookMessageFromVercel(message));
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
                editorEngine.chat.conversation.addOrReplaceMessage(toOnlookMessageFromVercel(lastMessageRef.current));
                lastMessageRef.current = null;
            }
        },
        sendExtraMessageFields: true,
    });

    const sendMessage = async (message: UserChatMessage, type: ChatType = ChatType.EDIT) => {
        if (!conversationId) {
            throw new Error('No conversation id');
        }
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();
        chat.setMessages([toMastraMessageFromOnlook(message) as any]);
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
            },
        });
    };

    return <ChatContext.Provider value={{ ...chat, sendMessage }}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}
