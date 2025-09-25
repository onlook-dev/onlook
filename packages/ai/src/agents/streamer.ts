import type { ChatMessage, ChatMetadata } from "@onlook/models";
import type { BaseAgent } from "./models";
import { convertToStreamMessages } from "../stream";
import { v4 as uuidv4 } from 'uuid';
import type { streamText, UIMessageStreamOnFinishCallback, UIMessageStreamOptions } from "ai";

export class AgentStreamer {
    private readonly agent: BaseAgent;
    private readonly conversationId: string;

    constructor(agent: BaseAgent, conversationId: string) {
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
