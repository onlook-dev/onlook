'use client';

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat as useAiChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType, type MessageContext } from '@onlook/models';
import {
    DefaultChatTransport,
    lastAssistantMessageIsCompleteWithToolCalls,
    type UIMessage,
} from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers<UIMessage> & {
    sendMessage: (content: string, type: ChatType, context: MessageContext[]) => Promise<void>;
    editMessage: (messageId: string, newContent: string) => Promise<void>;
    isStreaming: boolean;
};

interface UseChatProps {
    conversationId: string;
    projectId: string;
    initialMessages: UIMessage[];
}

export function useChat({
    conversationId,
    projectId,
    initialMessages,
}: UseChatProps): ExtendedUseChatHelpers {
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
    } = useAiChat({
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

    const sendMessage = useCallback(
        // TODO: const context = await editorEngine.chat.context.getChatContext();
        // TODO: context is optional
        async (content: string, type: ChatType = ChatType.EDIT, context: MessageContext[]) => {
            posthog.capture('user_send_message', { type });



            return baseSendMessage(
                { text: content },
                {
                    body: {
                        chatType: type,
                        conversationId,
                        context,
                    },
                },
            );
        },
        [baseSendMessage, conversationId, posthog],
    );


    // Store messages in a ref to avoid re-rendering editMessage
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);    

    const editMessage = useCallback(
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
                ...updatedMessages[messageIndex],
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
        [regenerate, conversationId, setMessages, posthog],
    );



    useEffect(() => {
        editorEngine.chat.setChatActions({
            sendMessage: sendMessage,
            editMessage: editMessage,
        });
    }, [editorEngine.chat, sendMessage, editMessage]);

    return { status, sendMessage, editMessage, messages, error, stop, isStreaming };
}
