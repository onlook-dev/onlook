import type { AgentType, ChatMessage } from '@onlook/models';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ClientTool, type OnToolCallHandler } from '../../tools/models/client';
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
                const { message } = options;
                const finishReason = message.metadata?.finishReason;
                if (finishReason && finishReason !== 'tool-calls') {
                    promiseResolve(message);
                }
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

        let conversationId = this.conversationId;
        if (!this.conversationId) {
            const newConversation = await editorEngine.chat.conversation.upsertConversationInStorage({
                agentType: this.agentType,
            });
            this.conversationId = newConversation.id;
            conversationId = newConversation.id;
        }

        const agentResponse = await this.messageAndGetFinalResponse(message, editorEngine, getOnToolCall);
        let response = "";

        const error = agentResponse.metadata?.error;
        if (!!error) {
            response = JSON.stringify(error, null, 2);
        }

        // Get the last step/part regardless of type
        const lastPart = agentResponse.parts[agentResponse.parts.length - 1];
        if (lastPart?.type === "text") {
            response = lastPart.text;
        } else {
            response = JSON.stringify(lastPart, null, 2);
        }

        return {
            conversationId: conversationId as string,
            response,
        } satisfies TOutput;
    }
}
