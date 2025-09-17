'use client';

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat as useAiChat } from '@ai-sdk/react';
import { ChatType, type ChatMessage } from '@onlook/models';
import {
    DefaultChatTransport,
    lastAssistantMessageIsCompleteWithToolCalls
} from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type SendMessage = (content: string, type: ChatType) => Promise<string>
export type EditMessage = (messageId: string, newContent: string, type: ChatType) => Promise<void>

interface UseChatProps {
    conversationId: string;
    projectId: string;
    initialMessages: ChatMessage[];
}

export function useChat({
    conversationId,
    projectId,
    initialMessages,
}: UseChatProps) {
    const editorEngine = useEditorEngine();
    const posthog = usePostHog();
    const {
        sendMessage: baseSendMessage,
        addToolResult,
        messages,
        error,
        stop,
        setMessages,
        regenerate,
        status,
    } = useAiChat<ChatMessage>({
        id: 'user-chat',
        messages: initialMessages,
        generateId: () => uuidv4(),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                conversationId,
                projectId,
            },
        }),
        onToolCall: async (toolCall) => {
            handleToolCall(toolCall.toolCall, editorEngine, addToolResult)
        },
        onFinish: ({ message }) => {
            if (!message.metadata) {
                return;
            }
            const finishReason = (message.metadata as { finishReason?: string }).finishReason;

            if (finishReason !== 'tool-calls') {
                // Generate suggestions, can maybe pull out of mobx store if suggestions aren't consumed anywhere other than the right-panel
            }
            if (finishReason === 'stop') {
                editorEngine.chat.context.clearAttachments();
            }
        },
    });

    const isStreaming = status === 'streaming' || status === 'submitted';

    useEffect(() => {
        editorEngine.chat.setIsStreaming(isStreaming);
    }, [editorEngine.chat, isStreaming]);

    const sendMessage: SendMessage = useCallback(async (content: string, type: ChatType) => {
        console.error('Sending message', content, type);
        const newContext = await editorEngine.chat.context.getContextByChatType(type);
        const messageId = uuidv4();
        console.error('New context', newContext);
        await baseSendMessage(
            { text: content },
            {
                body: {
                    chatType: type,
                    conversationId,
                    context: newContext,
                },
            },
        );
        posthog.capture('user_send_message', { type });
        console.error('Message sent', messageId);
        return messageId;
    }, [baseSendMessage, conversationId, posthog]);

    // Store messages in a ref to avoid re-rendering editMessage
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const editMessage: EditMessage = useCallback(
        async (messageId: string, newContent: string, chatType: ChatType) => {
            // TODO: Handle types probably in context.getContextByType
            const messageIndex = messagesRef.current.findIndex((m) => m.id === messageId);
            if (messageIndex === -1) {
                throw new Error('Message not found');
            }

            const message = messagesRef.current.find((m) => m.id === messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            posthog.capture('user_edit_message', { type: ChatType.EDIT });
            const updatedMessages = messagesRef.current.slice(0, messageIndex + 1);
            updatedMessages[messageIndex] = {
                ...message,
                parts: [{ type: 'text', text: newContent }],
            };

            const context = await editorEngine.chat.context.getContextByChatType(chatType);

            setMessages(updatedMessages);
            return regenerate({
                body: {
                    chatType,
                    conversationId,
                    context,
                },
            });
        },
        [regenerate, conversationId, setMessages, posthog]
    );

    useEffect(() => {
        editorEngine.chat.setChatActions(sendMessage);
    }, [editorEngine.chat, sendMessage]);

    return { status, sendMessage, editMessage, messages, error, stop, isStreaming };
}
