'use client';

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { api } from '@/trpc/client';
import { useChat as useAiChat } from '@ai-sdk/react';
import { ChatType, type ChatMessage, type ChatSuggestion } from '@onlook/models';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { prepareMessagesForSuggestions } from './utils';

export type SendMessage = (content: string, type: ChatType) => Promise<string>;
export type EditMessage = (messageId: string, newContent: string, type: ChatType) => Promise<void>;

interface UseChatProps {
    conversationId: string;
    projectId: string;
    initialMessages: ChatMessage[];
}

export function useChat({ conversationId, projectId, initialMessages }: UseChatProps) {
    const editorEngine = useEditorEngine();
    const posthog = usePostHog();

    const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
    const [finishReason, setFinishReason] = useState<string | null>(null);
    const [isExecutingToolCall, setIsExecutingToolCall] = useState(false);
    
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
            setIsExecutingToolCall(true);
            void handleToolCall(toolCall.toolCall, editorEngine, addToolResult).then(() => {
                setIsExecutingToolCall(false);
            });
        },
        onFinish: ({ message }) => {
            const finishReason = (message.metadata as { finishReason?: string } | undefined)
                ?.finishReason;
            setFinishReason(finishReason ?? null);
        },
    });

    const isStreaming = status === 'streaming' || status === 'submitted' || isExecutingToolCall;

    useEffect(() => {
        editorEngine.chat.setIsStreaming(isStreaming);
    }, [editorEngine.chat, isStreaming]);

    const sendMessage: SendMessage = useCallback(
        async (content: string, type: ChatType) => {
            const newContext = await editorEngine.chat.context.getContextByChatType(type);

            console.log('newContext', JSON.stringify(newContext, null, 2));

            const messageId = uuidv4();
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
            return messageId;
        },
        [editorEngine.chat.context, baseSendMessage, conversationId, posthog],
    );

    // Store messages in a ref to avoid re-rendering editMessage
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);
    useEffect(() => {
        if (finishReason && finishReason !== 'tool-calls') {
            setFinishReason(null);
            setSuggestions([]);
            const fetchSuggestions = async () => {
                try {
                    const suggestions = await api.chat.suggestions.generate.mutate({    
                        conversationId,
                        messages: prepareMessagesForSuggestions(messagesRef.current),
                    });
                    setSuggestions(suggestions);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                }
            };
            void fetchSuggestions();
        }
    }, [finishReason, conversationId]);

    const editMessage: EditMessage = useCallback(
        async (messageId: string, newContent: string, chatType: ChatType) => {
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
        [editorEngine.chat.context, regenerate, conversationId, setMessages, posthog],
    );

    useEffect(() => {
        editorEngine.chat.setChatActions(sendMessage);
    }, [editorEngine.chat, sendMessage]);

    return { status, sendMessage, editMessage, messages, error, stop, isStreaming, suggestions };
}
