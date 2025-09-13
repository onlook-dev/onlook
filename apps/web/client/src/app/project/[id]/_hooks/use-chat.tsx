'use client'

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { ChatType, type ChatMessage } from '@onlook/models';
import { jsonClone } from '@onlook/utility';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { observer } from 'mobx-react-lite';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useRef, useState } from 'react';

type ExtendedUseChatHelpers = UseChatHelpers<ChatMessage> & { sendMessageToChat: (message: ChatMessage, type: ChatType) => Promise<void> };
const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export const ChatProvider = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const conversationId = editorEngine.chat.conversation.current?.conversation.id;
    const lastMessageRef = useRef<ChatMessage | null>(null);
    const posthog = usePostHog();
    const [chatType, setChatType] = useState<ChatType>(ChatType.EDIT);

    const chat = useChat<ChatMessage>({
        id: conversationId,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new DefaultChatTransport({
            api: '/api/chat',
            prepareSendMessagesRequest: ({ messages }) => {
                // send only the last message and chat id
                // we will then fetch message history (for our chatId) on server
                // and append this message for the full context to send to the model
                const lastMessage = messages[messages.length - 1];
                return {
                    body: {
                        chatType,
                        message: lastMessage,
                        conversationId,
                        projectId: editorEngine.projectId,
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
        onData: (data) => {
            // Update UI with streaming content in real-time
            const currentMessages = chat.messages;
            const lastMessage = currentMessages[currentMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'assistant') {
                // Update the last assistant message with streaming content
                lastMessageRef.current = lastMessage;
                editorEngine.chat.conversation.addOrReplaceMessage(lastMessage);
            }
        },
        onFinish: (options: { message: ChatMessage; isAbort?: boolean; isDisconnect?: boolean; isError?: boolean }) => {
            const { message, isError = false } = options;
            console.log('onFinish', options);
            if (!message.metadata) {
                return;
            }
            const finishReason = (message.metadata as any)?.finishReason;
            lastMessageRef.current = message;
            editorEngine.chat.conversation.addOrReplaceMessage(message);
            if (finishReason !== 'error' && !isError) {
                editorEngine.chat.error.clear();
            }

            if (finishReason !== 'tool-calls') {
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
            
            // Save any partial content from streaming before handling error
            const currentMessages = chat.messages;
            const lastMessage = currentMessages[currentMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.parts.length > 0) {
                // Preserve partial assistant response
                lastMessageRef.current = lastMessage;
                editorEngine.chat.conversation.addOrReplaceMessage(lastMessage);
            } else if (lastMessageRef.current) {
                // Fallback to stored reference
                editorEngine.chat.conversation.addOrReplaceMessage(lastMessageRef.current);
            }
            
            editorEngine.chat.error.handleChatError(error);
            lastMessageRef.current = null;
        }
    });

    const sendMessageToChat = async (message: ChatMessage, type: ChatType = ChatType.EDIT) => {
        const clonedMessage = jsonClone(message);
        setChatType(type);
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

    return <ChatContext.Provider value={{ ...chat, sendMessageToChat }}>{children}</ChatContext.Provider>;
});

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}
