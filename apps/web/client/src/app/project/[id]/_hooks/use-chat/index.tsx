'use client';

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { api } from '@/trpc/client';
import { useChat as useAiChat } from '@ai-sdk/react';
import { ChatType, type ChatMessage, type ChatSuggestion } from '@onlook/models';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    attachCommitToUserMessage,
    getUserChatMessageFromString,
    prepareMessagesForSuggestions,
} from './utils';
import { jsonClone } from '@onlook/utility';

export type SendMessage = (content: string, type: ChatType) => Promise<ChatMessage>;
export type EditMessage = (
    messageId: string,
    newContent: string,
    type: ChatType,
) => Promise<ChatMessage>;
export type ProcessMessage = (
    content: string,
    type: ChatType,
    messageId?: string,
) => Promise<ChatMessage | void>;

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

    const { addToolResult, messages, error, stop, setMessages, regenerate, status } =
        useAiChat<ChatMessage>({
            id: 'user-chat',
            messages: initialMessages,
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

    // Store messages in a ref to avoid re-rendering sendMessage/editMessage
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const sendMessage: SendMessage = useCallback(
        async (content: string, type: ChatType) => {
            posthog.capture('user_send_message', { type });

            console.log('[RERENDER] sendMessage');

            const context = await editorEngine.chat.context.getContextByChatType(type);
            const newMessage = getUserChatMessageFromString(content, context, conversationId);

            setMessages(jsonClone([...messagesRef.current, newMessage]));

            void regenerate({
                body: {
                    chatType: type,
                    conversationId,
                    context,
                },
            });

            // TODO: We're not blocking on attaching the commit here because this takes a while.
            // this risks some commits not being attached to the message since it requires another message to be sent.
            if (type !== ChatType.ASK) {
                editorEngine.versions.createCommit(content, false).then(({ commit }) => {
                    if (!commit) {
                        throw new Error('Failed to create commit');
                    }
                    const message = attachCommitToUserMessage(commit, newMessage, conversationId);
                    setMessages(jsonClone([...messagesRef.current, message]));
                });
            }

            return newMessage;
        },
        [
            editorEngine.chat.context,
            editorEngine.versions,
            messagesRef,
            setMessages,
            regenerate,
            conversationId,
            posthog,
        ],
    );

    const editMessage: EditMessage = useCallback(
        async (messageId: string, newContent: string, chatType: ChatType) => {
            posthog.capture('user_edit_message', { type: ChatType.EDIT });

            console.log('[RERENDER] editMessage');

            const messageIndex = messagesRef.current.findIndex((m) => m.id === messageId);
            const message = messagesRef.current[messageIndex];

            if (messageIndex === -1 || !message || message.role !== 'user') {
                throw new Error('Message not found.');
            }

            const updatedMessages = messagesRef.current.slice(0, messageIndex);

            const context = await editorEngine.chat.context.getContextByChatType(chatType);

            message.metadata = {
                ...message.metadata,
                context,
                conversationId,
                createdAt: message.metadata?.createdAt ?? new Date(),
                checkpoints: message.metadata?.checkpoints ?? [],
            };
            message.parts = [{ type: 'text', text: newContent }];

            setMessages(jsonClone([...updatedMessages, message]));

            void regenerate({
                body: {
                    chatType,
                    conversationId,
                },
            });

            // TODO: We're not blocking on attaching the commit here because this takes a while.
            // this risks some commits not being attached to the message since it requires another message to be sent.
            if (chatType !== ChatType.ASK) {
                editorEngine.versions.createCommit(newContent, false).then(({ commit }) => {
                    if (!commit) {
                        throw new Error('Failed to create commit');
                    }
                    const messageWithCommit = attachCommitToUserMessage(
                        commit,
                        message,
                        conversationId,
                    );
                    setMessages(jsonClone([...updatedMessages, messageWithCommit]));
                });
            }

            return message;
        },
        [
            editorEngine.chat.context,
            editorEngine.versions,
            regenerate,
            conversationId,
            setMessages,
            posthog,
        ],
    );

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

    useEffect(() => {
        editorEngine.chat.conversation.setConversationLength(messages.length);
    }, [messages.length, editorEngine.chat.conversation]);

    useEffect(() => {
        editorEngine.chat.setChatActions(sendMessage);
    }, [editorEngine.chat, sendMessage]);

    return { status, sendMessage, editMessage, messages, error, stop, isStreaming, suggestions };
}
