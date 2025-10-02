import { ChatType, LLMProvider, OPENROUTER_MODELS, type ChatMessage, type ChatMetadata, type ModelConfig } from '@onlook/models';
import { stepCountIs, streamText, type ModelMessage, type ToolSet, type UIMessageStreamOptions } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, getToolSetFromType, initModel } from '../../index';
import { convertToStreamMessages } from '../../stream';

export class RootAgent {
    readonly id = 'root-agent';
    private readonly chatType: ChatType;
    readonly modelConfig: ModelConfig;
    readonly toolSet: ToolSet;

    constructor(chatType: ChatType) {
        this.chatType = chatType;
        this.modelConfig = this.getModelFromType(chatType);
        this.toolSet = getToolSetFromType(chatType);
    }

    get systemPrompt(): string {
        switch (this.chatType) {
            case ChatType.CREATE:
                return getCreatePageSystemPrompt();
            case ChatType.ASK:
                return getAskModeSystemPrompt();
            case ChatType.EDIT:
            default:
                return getSystemPrompt();
        }
    }

    // Main streamText method that uses the agent's configuration
    streamText(
        messages: ModelMessage[] = [],
        additionalConfig: Omit<Partial<Parameters<typeof streamText>[0]>, 'model' | 'headers' | 'tools' | 'stopWhen' | 'messages' | 'prompt'> = {},
    ) {
        const config = {
            maxSteps: 20,
        };

        return streamText({
            model: this.modelConfig.model,
            headers: this.modelConfig.headers,
            tools: this.toolSet,
            stopWhen: stepCountIs(config.maxSteps),
            providerOptions: this.modelConfig.providerOptions,
            messages: [
                {
                    role: 'system',
                    content: this.systemPrompt,
                },
                ...messages
            ],
            ...additionalConfig,
        })
    }

    // Method that combines the functionality from AgentStreamer
    async streamTextWithMetadata(
        messages: ChatMessage[],
        conversationId: string,
        { streamTextConfig, toUIMessageStreamResponseConfig }: {
            streamTextConfig: Omit<Partial<Parameters<typeof streamText>[0]>, 'model' | 'headers' | 'tools' | 'stopWhen' | 'messages' | 'prompt'>,
            toUIMessageStreamResponseConfig: UIMessageStreamOptions<ChatMessage>
        }
    ) {
        const result = await this.streamText(convertToStreamMessages(messages), streamTextConfig);

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


    private getModelFromType(chatType: ChatType): ModelConfig {
        switch (chatType) {
            case ChatType.CREATE:
            case ChatType.FIX:
                return initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
                });
            case ChatType.ASK:
            case ChatType.EDIT:
            default:
                return initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.CLAUDE_4_5_SONNET,
                });
        }
    }
}
