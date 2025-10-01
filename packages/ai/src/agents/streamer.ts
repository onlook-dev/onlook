import type { ChatMessage, ChatMetadata } from "@onlook/models";
import { streamText, type UIMessageStreamOptions, type FinishReason } from "ai";
import { v4 as uuidv4 } from 'uuid';
import { convertToStreamMessages } from "../stream";
import type { BaseAgent } from "./models";

export class AgentStreamer {
    private readonly agent: BaseAgent;
    private readonly conversationId: string;

    constructor(agent: BaseAgent, conversationId: string) {
        this.agent = agent;
        this.conversationId = conversationId;
    }

    streamText(messages: ChatMessage[], { streamTextConfig, toUIMessageStreamResponseConfig }: { streamTextConfig: Omit<Partial<Parameters<typeof streamText>[0]>, 'model' | 'headers' | 'tools' | 'stopWhen' | 'messages' | 'prompt'>, toUIMessageStreamResponseConfig: UIMessageStreamOptions<ChatMessage> }) {
        const conversationId = this.conversationId;

        const result = this.agent.streamText(convertToStreamMessages(messages), streamTextConfig);

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
