import type { ChatMessage, ChatMetadata } from "@onlook/models";
import type { streamText, UIMessageStreamOptions } from "ai";
import { v4 as uuidv4 } from 'uuid';
import { convertToStreamMessages } from "../stream";
import type { RootAgent } from "./classes/root";

export class AgentStreamer {
    private readonly agent: RootAgent;
    private readonly conversationId: string;

    constructor(agent: RootAgent, conversationId: string) {
        this.agent = agent;
        this.conversationId = conversationId;
    }

    async streamText(messages: ChatMessage[], { streamTextConfig, toUIMessageStreamResponseConfig }: { streamTextConfig: Omit<Partial<Parameters<typeof streamText>[0]>, 'model' | 'headers' | 'tools' | 'stopWhen' | 'messages' | 'prompt'>, toUIMessageStreamResponseConfig: UIMessageStreamOptions<ChatMessage> }) {
        const conversationId = this.conversationId;

        const result = await this.agent.streamText(convertToStreamMessages(messages), streamTextConfig);

        return result.toUIMessageStreamResponse<ChatMessage>({
            originalMessages: messages,
            generateMessageId: () => uuidv4(),
            messageMetadata: ({ part }) => {
                return {
                    createdAt: new Date(),
                    conversationId,
                    context: [],
                    checkpoints: [],
                    finishReason: part.type === 'finish-step' ? part.finishReason : undefined,
                    usage: part.type === 'finish-step' ? part.usage : undefined,
                } satisfies ChatMetadata;
            },
            ...toUIMessageStreamResponseConfig,
        });
    }
}
