'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat } from '@ai-sdk/react';
import { toVercelMessageFromOnlook } from '@onlook/ai';
import { toOnlookMessageFromVercel } from '@onlook/db';
import { ChatMessageRole, ChatType } from '@onlook/models';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai';
import { observer } from 'mobx-react-lite';
import { usePostHog } from 'posthog-js/react';
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

type ChatContextType = {
    messages: UIMessage[];
    streamingAssistantMessage: UIMessage | null;
    error: string | null;
    isWaiting: boolean;
    status: 'streaming' | 'submitted' | 'ready' | 'error';
    sendMessageToChat: (type: ChatType) => Promise<void>;
    stop: () => void;
}
const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const lastMessageRef = useRef<UIMessage | null>(null);
    const posthog = usePostHog();

    const conversationId = editorEngine.chat.conversation.current?.conversation.id;
    const chat = useChat({
        id: 'user-chat',
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                conversationId,
                projectId: editorEngine.projectId,
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
        onFinish: ({ message }) => {
            if (!message.metadata) {
                return;
            }
            const finishReason = (message.metadata as { finishReason?: string }).finishReason;
            lastMessageRef.current = message;
            if (finishReason !== 'error') {
                editorEngine.chat.error.clear();
            }

            if (finishReason !== 'tool-calls') {
                const currentConversationId = editorEngine.chat.conversation.current?.conversation.id;
                editorEngine.chat.conversation.addOrReplaceMessage(toOnlookMessageFromVercel(message, currentConversationId ?? ''));
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

            chat.stop();

            const filteredMessages = chat.messages.filter(msg => msg.role !== 'assistant');
            chat.setMessages(filteredMessages);

            if (chat.status === 'streaming' || chat.status === 'submitted') {
                setTimeout(() => {
                    if (chat.status === 'streaming' || chat.status === 'submitted') {
                        chat.stop();
                    }
                }, 100);
            }

            if (lastMessageRef.current) {
                const currentConversationId = editorEngine.chat.conversation.current?.conversation.id;
                editorEngine.chat.conversation.addOrReplaceMessage(toOnlookMessageFromVercel(lastMessageRef.current, currentConversationId ?? ''));
                lastMessageRef.current = null;
            }
        }
    });

    const assistantMessages = useMemo(() => {
        return chat.messages.filter(message => message.role === ChatMessageRole.ASSISTANT);
    }, [chat.messages]);


    const streamingAssistantMessage = useMemo(() => assistantMessages.find(message => message.parts?.some(part => part.type === 'reasoning' && part.state === 'streaming')) ?? null, [assistantMessages]);

    const staticMessages = useMemo(() => {
        return chat.messages.filter(message => message.parts?.some(part => part.type === 'reasoning' && part.state === 'streaming'));
    }, [chat.messages]);

    
    const isWaiting = useMemo(() => chat.status === 'streaming' || chat.status === 'submitted', [chat.status]);
    const status = useMemo(() => chat.status, [chat.status]);
    const stop = useCallback(() => chat.stop(), [chat]);
    const error = useMemo(() => editorEngine.chat.error.message, [editorEngine.chat.error.message]);
    
    const sendMessageToChat = useCallback(async (type: ChatType = ChatType.EDIT) => {
        if (!conversationId) {
            throw new Error('No conversation id');
        }
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();

        const messages = editorEngine.chat.conversation.current?.messages ?? [];

        const uiMessages = messages.map((message, index) =>
            toVercelMessageFromOnlook(message, {
                totalMessages: messages.length,
                currentMessageIndex: index,
                lastUserMessageIndex: messages.findLastIndex(m => m.role === ChatMessageRole.USER),
                lastAssistantMessageIndex: messages.findLastIndex(m => m.role === ChatMessageRole.ASSISTANT),
            })
        );

        chat.setMessages(uiMessages);
        try {
            posthog.capture('user_send_message', {
                type,
            });
        } catch (error) {
            console.error('Error tracking user send message: ', error)
        }
        return chat.regenerate({
            body: {
                chatType: type,
                conversationId
            },
        });
    }, [chat, conversationId]);

    const contextValue = useMemo(() => ({
        messages: staticMessages,
        streamingAssistantMessage,
        error,
        isWaiting,
        sendMessageToChat,
        status,
        stop,
    }), [staticMessages, streamingAssistantMessage, isWaiting, sendMessageToChat, status, stop, error]);

    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
});

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';

    return { ...context, isWaiting };
}
