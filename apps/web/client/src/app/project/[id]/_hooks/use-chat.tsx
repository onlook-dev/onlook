'use client';

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat as useAiChat } from '@ai-sdk/react';
import { ChatType, type ChatMessage, type MessageContext } from '@onlook/models';
import {
    DefaultChatTransport,
    lastAssistantMessageIsCompleteWithToolCalls
} from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type SendMessage = (content: string, type?: ChatType, context?: MessageContext[]) => Promise<string>
export type EditMessage = (messageId: string, newContent: string) => Promise<void>

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

    const sendMessage: SendMessage = useCallback(
        async (content: string, type: ChatType = ChatType.EDIT) => {
            const newContext = await editorEngine.chat.context.getLatestContext();
            posthog.capture('user_send_message', { type });
            const messageId = uuidv4();
            await baseSendMessage(
                { text: content, messageId },
                {
                    body: {
                        chatType: type,
                        conversationId,
                        context: newContext,
                    },
                },
            );
            return messageId;
        },
        [baseSendMessage, conversationId, posthog],
    );

    // Store messages in a ref to avoid re-rendering editMessage
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const editMessage: EditMessage = useCallback(
        async (messageId: string, newContent: string) => {
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

            setMessages(updatedMessages);
            return regenerate({
                body: {
                    chatType: ChatType.EDIT,
                    conversationId,
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
