'use client';

import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { api } from '@/trpc/client';
import { useChat as useAiChat } from '@ai-sdk/react';
import { ChatType, type ChatMessage, type MessageContext, type QueuedMessage } from '@onlook/models';
import { jsonClone } from '@onlook/utility';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type FinishReason } from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    getUserChatMessageFromString
} from './utils';

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

    const [finishReason, setFinishReason] = useState<FinishReason | null>(null);
    const [isExecutingToolCall, setIsExecutingToolCall] = useState(false);
    const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
    const isProcessingQueue = useRef(false);

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
                const finishReason = message.metadata?.finishReason;
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

    const processMessage = useCallback(
        async (content: string, type: ChatType, context?: MessageContext[]) => {
            const messageContext = context || await editorEngine.chat.context.getContextByChatType(type);
            const newMessage = getUserChatMessageFromString(content, messageContext, conversationId);
            setMessages(jsonClone([...messagesRef.current, newMessage]));

            void regenerate({
                body: {
                    chatType: type,
                    conversationId,
                    context: messageContext,
                },
            });
            void editorEngine.chat.conversation.generateTitle(content);
            return newMessage;
        },
        [
            editorEngine.chat.context,
            messagesRef,
            setMessages,
            regenerate,
            conversationId,
        ],
    );

    const sendMessage: SendMessage = useCallback(
        async (content: string, type: ChatType) => {
            posthog.capture('user_send_message', { type });

            const context = await editorEngine.chat.context.getContextByChatType(type);

            const newMessage: QueuedMessage = {
                id: uuidv4(),
                content,
                type,
                timestamp: new Date(),
                context
            };

            if (isStreaming) {
                // AI is running - add to bottom of queue (normal queueing)
                setQueuedMessages(prev => [...prev, newMessage]);
            } else if (queuedMessages.length > 0) {
                // AI is stopped but there are queued messages - add to top of queue (priority)
                setQueuedMessages(prev => [newMessage, ...prev]);
            } else {
                // No queue and not streaming - send immediately
                return processMessage(content, type);
            }

            return getUserChatMessageFromString(content, [], conversationId);
        },
        [processMessage, posthog, editorEngine.chat.context, isStreaming, queuedMessages.length, conversationId],
    );

    const processMessageEdit = useCallback(
        async (messageId: string, newContent: string, chatType: ChatType) => {
            const messageIndex = messagesRef.current.findIndex((m) => m.id === messageId);
            const message = messagesRef.current[messageIndex];

            if (messageIndex === -1 || !message || message.role !== 'user') {
                throw new Error('Message not found.');
            }

            const updatedMessages = messagesRef.current.slice(0, messageIndex);

            // For resubmitted messages, we want to keep the previous context and refresh if possible
            const previousContext = message.metadata?.context ?? [];
            const updatedContext = await editorEngine.chat.context.getRefreshedContext(previousContext);

            message.metadata = {
                ...message.metadata,
                context: updatedContext,
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

            return message;
        },
        [
            editorEngine.chat.context,
            regenerate,
            conversationId,
            setMessages,
        ],
    );

    const removeFromQueue = useCallback((id: string) => {
        setQueuedMessages(prev => prev.filter(msg => msg.id !== id));
    }, []);

    const processNextInQueue = useCallback(async () => {
        if (isProcessingQueue.current || isStreaming || queuedMessages.length === 0) return;

        const nextMessage = queuedMessages[0];
        if (!nextMessage) return;

        isProcessingQueue.current = true;

        try {
            const refreshedContext = await editorEngine.chat.context.getRefreshedContext(nextMessage.context);
            await processMessage(nextMessage.content, nextMessage.type, refreshedContext);

            // Remove only after successful processing
            setQueuedMessages(prev => prev.slice(1));
        } catch (error) {
            console.error('Failed to process queued message:', error);
        } finally {
            isProcessingQueue.current = false;
        }
    }, [queuedMessages, editorEngine.chat.context, processMessage, isStreaming]);

    const editMessage: EditMessage = useCallback(
        async (messageId: string, newContent: string, chatType: ChatType) => {
            posthog.capture('user_edit_message', { type: ChatType.EDIT });

            if (isStreaming) {
                // Stop current streaming immediately
                stop();

                // Process edit with immediate priority (higher than queue)
                const context = await editorEngine.chat.context.getContextByChatType(chatType);
                return await processMessageEdit(messageId, newContent, chatType);
            }

            // Normal edit processing when not streaming
            return processMessageEdit(messageId, newContent, chatType);
        },
        [processMessageEdit, posthog, isStreaming, stop, editorEngine.chat.context],
    );

    useEffect(() => {
        // Actions to handle when the chat is finished
        if (finishReason && finishReason !== 'tool-calls') {
            setFinishReason(null);

            const applyCommit = async () => {
                console.log('[CHECKPOINT] applyCommit started');
                const lastUserMessage = messagesRef.current.findLast((m) => m.role === 'user');

                if (!lastUserMessage) {
                    console.log('[CHECKPOINT] No last user message found');
                    return;
                }

                const content = lastUserMessage.parts
                    .map((p) => {
                        if (p.type === 'text') {
                            return p.text;
                        }
                        return '';
                    })
                    .join('');

                if (!content) {
                    console.log('[CHECKPOINT] No content in message');
                    return;
                }

                console.log('[CHECKPOINT] Checking all branches for modifications...');
                // Detect all branches with modifications and create checkpoints
                const checkpoints: Array<{
                    type: import('@onlook/models').MessageCheckpointType.GIT;
                    oid: string;
                    branchId: string;
                    createdAt: Date;
                }> = [];

                for (const branch of editorEngine.branches.allBranches) {
                    console.log(`[CHECKPOINT] Checking branch: ${branch.name} (${branch.id})`);
                    const branchData = editorEngine.branches.getBranchDataById(branch.id);

                    if (!branchData) {
                        console.log(`[CHECKPOINT] Branch data not found for ${branch.id}`);
                        continue;
                    }

                    // Check if branch has modifications
                    const status = await branchData.sandbox.gitManager.getStatus();
                    console.log(`[CHECKPOINT] Git status for ${branch.name}:`, status);

                    if (status && status.files.length > 0) {
                        console.log(`[CHECKPOINT] Branch ${branch.name} has changes, creating commit...`);

                        const result = await branchData.sandbox.gitManager.createCommit(content);

                        if (result.success) {
                            const latestCommit = branchData.sandbox.gitManager.commits?.[0];
                            if (latestCommit) {
                                console.log(`[CHECKPOINT] Commit created for ${branch.name}:`, latestCommit.oid);
                                checkpoints.push({
                                    type: 'git' as import('@onlook/models').MessageCheckpointType.GIT,
                                    oid: latestCommit.oid,
                                    branchId: branch.id,
                                    createdAt: new Date(),
                                });
                            }
                        } else {
                            console.log(`[CHECKPOINT] Failed to create commit for ${branch.name}:`, result.error);
                        }
                    } else {
                        console.log(`[CHECKPOINT] Branch ${branch.name} has no changes`);
                    }
                }

                if (checkpoints.length === 0) {
                    console.warn('[CHECKPOINT] No checkpoints created - no modified branches found');
                    return;
                }

                console.log('[CHECKPOINT] Total checkpoints created:', checkpoints.length);

                // Update message with all checkpoints
                const oldCheckpoints = lastUserMessage.metadata?.checkpoints.map((checkpoint) => ({
                    ...checkpoint,
                    createdAt: new Date(checkpoint.createdAt),
                })) ?? [];

                lastUserMessage.metadata = {
                    ...lastUserMessage.metadata,
                    createdAt: lastUserMessage.metadata?.createdAt ?? new Date(),
                    conversationId,
                    checkpoints: [...oldCheckpoints, ...checkpoints],
                    context: lastUserMessage.metadata?.context ?? [],
                };

                console.log('[CHECKPOINT] Saving checkpoints to database...');
                // Save checkpoints to database
                void api.chat.message.updateCheckpoints.mutate({
                    messageId: lastUserMessage.id,
                    checkpoints: [...oldCheckpoints, ...checkpoints],
                });

                console.log('[CHECKPOINT] Updating UI messages...');
                setMessages(
                    jsonClone(
                        messagesRef.current.map((m) =>
                            m.id === lastUserMessage.id ? lastUserMessage : m,
                        ),
                    ),
                );
                console.log('[CHECKPOINT] applyCommit completed successfully');
            };

            const cleanupContext = async () => {
                await editorEngine.chat.context.clearImagesFromContext();
            };

            const processNextQueuedMessage = async () => {
                if (finishReason !== 'stop') {
                    return;
                }
                if (queuedMessages.length > 0) {
                    setTimeout(processNextInQueue, 500);
                }
            };

            void cleanupContext();
            void applyCommit();
            void processNextQueuedMessage();
        }
    }, [finishReason, conversationId, queuedMessages.length, processNextInQueue]);

    useEffect(() => {
        editorEngine.chat.conversation.setConversationLength(messages.length);
    }, [messages.length, editorEngine.chat.conversation]);

    useEffect(() => {
        editorEngine.chat.setChatActions(sendMessage);
    }, [editorEngine.chat, sendMessage]);

    return {
        status,
        sendMessage,
        editMessage,
        messages,
        error,
        stop,
        isStreaming,
        queuedMessages,
        removeFromQueue,
    };
}
