'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType, type ChatMessage } from '@onlook/models';
import { jsonClone } from '@onlook/utility';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { observer } from 'mobx-react-lite';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

type ExtendedUseChatHelpers = UseChatHelpers<ChatMessage> & { sendMessageToChat: (type: ChatType) => Promise<void> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export const ChatProvider = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const lastMessageRef = useRef<ChatMessage | null>(null);
    const posthog = usePostHog();

    const conversationId = editorEngine.chat.conversation.current?.conversation.id;
    const chat = useChat<ChatMessage>({
        id: 'user-chat',
        generateId: () => uuidv4(),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                conversationId,
                projectId: editorEngine.projectId,
            },
        }),
        onToolCall: (toolCall) => { handleToolCall(toolCall.toolCall, editorEngine, chat.addToolResult) },
        onFinish: ({ message }) => {
            if (!message.metadata) {
                return;
            }
            const finishReason = (message.metadata as { finishReason?: string; usage?: any }).finishReason;
            const usage = (message.metadata as { finishReason?: string; usage?: any }).usage;


            // Store usage data in the editor engine if available
            if (usage) {
                console.log('Usage data received:', usage);
                // Store usage data directly and update cumulative usage
                const newUsage = {
                    promptTokens: usage.promptTokens || usage.prompt_tokens || 0,
                    completionTokens: usage.completionTokens || usage.completion_tokens || 0,
                    totalTokens: usage.totalTokens || usage.total_tokens || 0,
                };

                editorEngine.chat.context.usage = newUsage;

                // Add to cumulative usage
                const cumulativeUsage = editorEngine.chat.context.cumulativeUsage;
                cumulativeUsage.promptTokens += newUsage.promptTokens;
                cumulativeUsage.completionTokens += newUsage.completionTokens;
                cumulativeUsage.totalTokens += newUsage.totalTokens;
            }

            lastMessageRef.current = message;
            if (finishReason !== 'error') {
                editorEngine.chat.error.clear();
            }

            if (finishReason !== 'tool-calls') {
                editorEngine.chat.conversation.addOrReplaceMessage(message);
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
                editorEngine.chat.conversation.addOrReplaceMessage(lastMessageRef.current);
                lastMessageRef.current = null;
            }
        }
    });

    const sendMessageToChat = async (type: ChatType = ChatType.EDIT) => {
        if (!conversationId) {
            throw new Error('No conversation id');
        }
        lastMessageRef.current = null;
        editorEngine.chat.error.clear();

        const messages = editorEngine.chat.conversation.current?.messages ?? [];
        chat.setMessages(jsonClone(messages));
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
    };

    return <ChatContext.Provider value={{ ...chat, sendMessageToChat }}>{children}</ChatContext.Provider>;
});

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';

    return { ...context, isWaiting };
}
