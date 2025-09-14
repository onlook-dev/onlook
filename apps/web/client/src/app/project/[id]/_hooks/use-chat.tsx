'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType, type ChatMessage } from '@onlook/models';
import { jsonClone } from '@onlook/utility';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { observer } from 'mobx-react-lite';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useMemo, useRef } from 'react';

interface ExtraChatHelpers {
    sendMessageToChat: (message: ChatMessage, type: ChatType) => Promise<void>;
    streamingMessage: ChatMessage | null;
}

const ChatContext = createContext<UseChatHelpers<ChatMessage> & ExtraChatHelpers | null>(null);

export const ChatProvider = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const posthog = usePostHog();
    const lastMessageRef = useRef<ChatMessage | null>(null);
    const traceId = useRef<string | null>(null);
    const chatTypeRef = useRef<ChatType>(ChatType.EDIT);
    const conversationId = editorEngine.chat.conversation.current?.conversation.id;

    const chat = useChat<ChatMessage>({
        id: conversationId,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            prepareSendMessagesRequest: ({ messages }) => {
                const lastMessage = messages[messages.length - 1];
                return {
                    body: {
                        chatType: chatTypeRef.current,
                        message: lastMessage,
                        conversationId,
                        projectId: editorEngine.projectId,
                        traceId: traceId.current,
                    },
                };
            },
        }),
        onToolCall: async (toolCall) => {
            const result = await handleToolCall(toolCall.toolCall, editorEngine);
            chat.addToolResult({
                tool: toolCall.toolCall.toolName,
                toolCallId: toolCall.toolCall.toolCallId,
                output: result,
            });
        },
        onError: (error) => {
            console.error('Error in chat', error);
            if (lastMessageRef.current) {
                editorEngine.chat.conversation.addOrReplaceMessage(lastMessageRef.current);
            }
            editorEngine.chat.error.handleChatError(error);
        },
        onFinish: (options: { message: ChatMessage; isAbort?: boolean; isDisconnect?: boolean; isError?: boolean }) => {
            const { message } = options;
            editorEngine.chat.conversation.addOrReplaceMessage(message);
            editorEngine.chat.suggestions.generateSuggestions();
            editorEngine.chat.context.clearAttachments();
        },
    });

    const sendMessageToChat = async (message: ChatMessage, type: ChatType = ChatType.EDIT) => {
        const clonedMessage = jsonClone(message);
        chatTypeRef.current = type;
        traceId.current = message.id;
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();
        try {
            posthog.capture('user_send_message', {
                type,
            });
        } catch (error) {
            console.error('Error tracking user send message: ', error)
        }
        return chat.sendMessage(clonedMessage);
    };

    const streamingMessage = useMemo(() => {
        if (chat.messages.length > 0) {
            const lastMessage = chat.messages[chat.messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                lastMessageRef.current = lastMessage;
                return lastMessage;
            }
            return null;
        }
        return null;
    }, [chat.messages]);

    return <ChatContext.Provider value={{ ...chat, sendMessageToChat, streamingMessage }}>{children}</ChatContext.Provider>;
});

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}
