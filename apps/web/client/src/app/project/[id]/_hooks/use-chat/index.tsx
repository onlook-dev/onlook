'use client';

// TEMP: Remove editorEngine for performance testing
// import { useEditorEngine } from '@/components/store/editor';
import { handleToolCall } from '@/components/tools';
import { api } from '@/trpc/client';
import { useChat as useAiChat } from '@ai-sdk/react';
import { ChatType, type ChatMessage, type GitMessageCheckpoint, type MessageContext, type QueuedMessage } from '@onlook/models';
import { jsonClone } from '@onlook/utility';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type FinishReason } from 'ai';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    createCheckpointsForAllBranches,
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
    // TEMP: Remove editorEngine for performance testing
    // const editorEngine = useEditorEngine();
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
                // TEMP: Check if we should skip tool execution entirely
                const SKIP_TOOLS = typeof window !== 'undefined' && (window as any).__ONLOOK_SKIP_TOOLS;
                if (SKIP_TOOLS) {
                    console.log('[SKIP] Tool execution bypassed entirely', toolCall.toolCall.toolName);
                    void addToolResult({
                        tool: toolCall.toolCall.toolName,
                        toolCallId: toolCall.toolCall.toolCallId,
                        output: { skipped: true, message: 'Tool execution skipped' },
                    });
                    return;
                }

                setIsExecutingToolCall(true);
                // TEMP: editorEngine now accessed directly in handleToolCall
                void handleToolCall(toolCall.toolCall, addToolResult).then(() => {
                    setIsExecutingToolCall(false);
                });
            },
            onFinish: ({ message }) => {
                const finishReason = message.metadata?.finishReason;
                setFinishReason(finishReason ?? null);
            },
        });

    const isStreaming = status === 'streaming' || status === 'submitted' || isExecutingToolCall;

    // TEMP: Defer message updates to prevent jitter during streaming
    const [isPending, startTransition] = useTransition();
    const deferredMessages = useDeferredValue(messages);

    useEffect(() => {
        // TEMP: Disable MobX state sync to test if this is causing the freeze
        console.log('[PERF TEST] Skipping editorEngine.chat.setIsStreaming', isStreaming);
    }, [isStreaming]);

    // Store messages in a ref to avoid re-rendering sendMessage/editMessage
    const messagesRef = useRef(messages);
    useEffect(() => {
        // TEMP: Track message updates
        if (typeof window !== 'undefined' && (window as any).__ONLOOK_PERF_LOG) {
            console.log('[MESSAGE UPDATE]', messages.length, 'messages', performance.now());
        }
        messagesRef.current = messages;
    }, [messages]);

    const processMessage = useCallback(
        async (content: string, type: ChatType, context?: MessageContext[]) => {
            // TEMP: Stub out context - just use empty array for testing
            const messageContext = context || [];
            const newMessage = getUserChatMessageFromString(content, messageContext, conversationId);
            setMessages(jsonClone([...messagesRef.current, newMessage]));

            void regenerate({
                body: {
                    chatType: type,
                    conversationId,
                    context: messageContext,
                },
            });
            // TEMP: Skip title generation for testing
            // void editorEngine.chat.conversation.generateTitle(content);
            return newMessage;
        },
        [
            messagesRef,
            setMessages,
            regenerate,
            conversationId,
        ],
    );

    const sendMessage: SendMessage = useCallback(
        async (content: string, type: ChatType) => {
            posthog.capture('user_send_message', { type });

            // TEMP: Stub out context - just use empty array for testing
            const context: MessageContext[] = [];

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
        [processMessage, posthog, isStreaming, queuedMessages.length, conversationId],
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
            // TEMP: Stub out context refresh
            const updatedContext = previousContext;

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
            // TEMP: Stub out context refresh
            const refreshedContext = nextMessage.context;
            await processMessage(nextMessage.content, nextMessage.type, refreshedContext);

            // Remove only after successful processing
            setQueuedMessages(prev => prev.slice(1));
        } catch (error) {
            console.error('Failed to process queued message:', error);
        } finally {
            isProcessingQueue.current = false;
        }
    }, [queuedMessages, processMessage, isStreaming]);

    const editMessage: EditMessage = useCallback(
        async (messageId: string, newContent: string, chatType: ChatType) => {
            posthog.capture('user_edit_message', { type: ChatType.EDIT });

            if (isStreaming) {
                // Stop current streaming immediately
                stop();

                // Process edit with immediate priority (higher than queue)
                // TEMP: Stub out context
                return await processMessageEdit(messageId, newContent, chatType);
            }

            // Normal edit processing when not streaming
            return processMessageEdit(messageId, newContent, chatType);
        },
        [processMessageEdit, posthog, isStreaming, stop],
    );

    useEffect(() => {
        // Actions to handle when the chat is finished
        if (finishReason && finishReason !== 'tool-calls') {
            setFinishReason(null);

            const applyCommit = async () => {
                const lastUserMessage = messagesRef.current.findLast((m) => m.role === 'user');

                if (!lastUserMessage) {
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
                    return;
                }

                // Create checkpoints for all branches
                // TEMP: Stub out checkpoints
                const checkpoints: GitMessageCheckpoint[] = [];

                if (checkpoints.length === 0) {
                    return;
                }

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

                // Save checkpoints to database (filter out legacy checkpoints without branchId)
                const checkpointsWithBranchId = [...oldCheckpoints, ...checkpoints].filter(
                    (cp): cp is GitMessageCheckpoint & { branchId: string } => !!cp.branchId
                );
                void api.chat.message.updateCheckpoints.mutate({
                    messageId: lastUserMessage.id,
                    checkpoints: checkpointsWithBranchId,
                });

                setMessages(
                    jsonClone(
                        messagesRef.current.map((m) =>
                            m.id === lastUserMessage.id ? lastUserMessage : m,
                        ),
                    ),
                );
            };

            const cleanupContext = async () => {
                // TEMP: Stub out cleanup
                // await editorEngine.chat.context.clearImagesFromContext();
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

    // TEMP: Stub out editorEngine useEffects
    // useEffect(() => {
    //     editorEngine.chat.conversation.setConversationLength(messages.length);
    // }, [messages.length, editorEngine.chat.conversation]);

    // useEffect(() => {
    //     editorEngine.chat.setChatActions(sendMessage);
    // }, [editorEngine.chat, sendMessage]);

    // TEMP: Test with deferred messages to reduce jitter
    const USE_DEFERRED = typeof window !== 'undefined' && (window as any).__ONLOOK_USE_DEFERRED;

    return {
        status,
        sendMessage,
        editMessage,
        messages: USE_DEFERRED ? deferredMessages : messages,
        error,
        stop,
        isStreaming,
        queuedMessages,
        removeFromQueue,
    };
}
