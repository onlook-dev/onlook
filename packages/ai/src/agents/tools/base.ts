import type { AgentType, ChatMessage } from '@onlook/models';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { ClientTool, type OnToolCallHandler } from '../../tools/models/client';
import { z } from 'zod';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { api } from '@onlook/web-client/src/trpc/client';
import { OnlookChat } from '../onlook-chat';

export type ToolsAgentInput = {
    message: string;
};

export type ToolsAgentOutput = {
    conversationId: string;
    response: string;
};

const BaseSubAgentToolParametersSchema = z.object({
    message: z
        .string()
        .describe("The message to send to the sub agent"),
});

export abstract class BaseSubAgentTool<
    TInput extends { message: string } = { message: string },
    TOutput extends ToolsAgentOutput = ToolsAgentOutput
> extends ClientTool<TInput, TOutput> {
    protected conversationId: string | null = null;
    protected messages: ChatMessage[] = [];

    protected abstract agentType: AgentType;
    static readonly defaultParameters = BaseSubAgentToolParametersSchema;


    createMessage(input: TInput): string {
        return JSON.stringify(input, null, 2);
    }

    /**
 * Send a message to the agent and return just the final assistant message
 * @param message - The message to send to the agent
 * @returns The final assistant's response message
 */
    async messageAndGetFinalResponse(message: string, editorEngine: EditorEngine, onToolCall: OnToolCallHandler): Promise<ChatMessage> {
        if (!this.conversationId) {
            throw new Error('Conversation ID is not set');
        }

        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: "user",
            parts: [
                {
                    type: "text",
                    text: message,
                },
            ],
            metadata: {
                createdAt: new Date(),
                conversationId: this.conversationId,
                context: [], // TODO: Get context from editorEngine
                checkpoints: [],
            },
        };

        // Update messages and save to chat
        this.messages.push(userMessage);

        // Use chat route instead of direct agent streaming
        const onlookChat = new OnlookChat({
            messages: this.messages,
            sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
            transport: new DefaultChatTransport({
                api: '/api/chat',
                body: {
                    agentType: this.agentType,
                    messages: this.messages,
                    conversationId: this.conversationId,
                    projectId: editorEngine.projectId,
                },
            }),
            onToolCall: (toolCall) => {
                onToolCall(this.agentType, onlookChat.addToolResult.bind(onlookChat))(toolCall);
            },
            onFinish: (options) => {
                const { message, messages } = options;
                console.log("OnlookChat - Finish:", options);
                console.log("OnlookChat - Message parts:", JSON.stringify(message.parts, null, 2));

                // Update our internal messages with the final state
                this.messages = messages as ChatMessage[];

                // Check if this message has any tool calls that are not yet completed
                const toolCallParts = message.parts.filter(part => part.type.startsWith('tool-'));
                console.log("OnlookChat - Tool call parts:", toolCallParts.map(p => ({ type: p.type, state: (p as any).state })));

                // Check if there are any text parts that are still streaming (not "done")
                const hasStreamingText = message.parts.some(part =>
                    part.type === 'text' && (part as any).state && (part as any).state !== 'done'
                );

                // Check if there are any tool calls that are incomplete
                const hasIncompleteToolCalls = message.role === 'assistant' &&
                    toolCallParts.some(part => {
                        const state = (part as any).state;
                        // A tool call is incomplete if it's in 'call' state or doesn't have output available
                        return part.type === 'tool-call' || (state && state !== 'output-available' && state !== 'output-error');
                    });

                const isIncomplete = hasStreamingText || hasIncompleteToolCalls;

                console.log("OnlookChat - Has streaming text:", hasStreamingText);
                console.log("OnlookChat - Has incomplete tool calls:", hasIncompleteToolCalls);
                console.log("OnlookChat - Is incomplete:", isIncomplete, onlookChat.status);

                // Check if this looks like a complete conversation by looking at the message structure
                // A complete conversation should have:
                // 1. No incomplete tool calls
                // 2. No streaming text
                // 3. The last part should be either completed text or completed tool output
                const lastPart = message.parts[message.parts.length - 1];
                const lastPartComplete = lastPart &&
                    (lastPart.type === 'text' && (lastPart as any).state === 'done');

                console.log("OnlookChat - Last part:", { type: lastPart?.type, state: (lastPart as any)?.state });
                console.log("OnlookChat - Last part complete:", lastPartComplete);

                if (!isIncomplete && lastPartComplete) {
                    // This is the final assistant message with no pending tool calls or streaming text
                    console.log("OnlookChat - Resolving with final message", onlookChat.status);
                    promiseResolve(message as ChatMessage);
                } else {
                    console.log("OnlookChat - Message is incomplete, waiting for completion", onlookChat.status);
                }
                // If there are pending tool calls, don't resolve yet - let sendAutomaticallyWhen handle it
            },
            onError: (error) => {
                console.error("OnlookChat - Error during streaming:", error);
                promiseReject(error);
            },
        });

        let promiseResolve: (value: ChatMessage) => void;
        let promiseReject: (reason?: any) => void;

        const promise = new Promise<ChatMessage>((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });

        // Start the chat by sending the message
        console.log("OnlookChat - Sending message");
        onlookChat.sendMessage().catch((error) => {
            console.error("ToolsAgent - Error calling chat API:", error);
            promiseReject(error);
        });

        return promise;
    }

    async handle(input: TInput, editorEngine: EditorEngine, getOnToolCall: OnToolCallHandler): Promise<TOutput> {
        const message = this.createMessage(input);

        if (!this.conversationId) {
            const newConversation = await api.chat.conversation.upsert.mutate({
                projectId: editorEngine.projectId,
            });
            this.conversationId = newConversation.id;
        }

        const agentResponse = await this.messageAndGetFinalResponse(message, editorEngine, getOnToolCall);
        let response = "";

        if (agentResponse.metadata?.error !== null) {
            response = JSON.stringify(agentResponse.metadata!.error, null, 2);
        }

        // Get the last step/part regardless of type
        const lastPart = agentResponse.parts[agentResponse.parts.length - 1];
        if (lastPart?.type === "text") {
            response = lastPart.text;
        } else {
            response = JSON.stringify(lastPart, null, 2);
        }

        return {
            conversationId: this.conversationId,
            response,
        } as TOutput;
    }
}
