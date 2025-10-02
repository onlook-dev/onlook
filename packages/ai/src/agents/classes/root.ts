import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { stepCountIs, streamText, type ModelMessage, type ToolSet } from 'ai';
import { getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, getToolSetFromType, initModel } from '../../index';

export class RootAgent {
    readonly id = 'root-agent';
    private readonly chatType: ChatType;
    readonly modelConfig: ModelConfig;
    protected readonly toolSet: ToolSet;

    constructor(chatType: ChatType, modelConfig: ModelConfig) {
        this.chatType = chatType;
        this.modelConfig = modelConfig;
        this.toolSet = getToolSetFromType(chatType);
    }

    get systemPrompt(): string {
        return this.getSystemPromptFromType(this.chatType);
    }

    getSystemPrompt() {
        return this.systemPrompt;
    }

    getToolSet() {
        return this.toolSet;
    }

    // Default streamText configuration - can be overridden by subclasses
    protected getStreamTextConfig() {
        return {
            maxSteps: 20,
        };
    }

    // Main streamText method that uses the agent's configuration
    streamText(
        messages: ModelMessage[] = [],
        additionalConfig: Omit<Partial<Parameters<typeof streamText>[0]>, 'model' | 'headers' | 'tools' | 'stopWhen' | 'messages' | 'prompt'> = {},
    ) {
        const config = this.getStreamTextConfig();

        return streamText({
            model: this.modelConfig.model,
            headers: this.modelConfig.headers,
            tools: this.getToolSet(),
            stopWhen: stepCountIs(config.maxSteps),
            providerOptions: this.modelConfig.providerOptions,
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(),
                },
                ...messages
            ],
            ...additionalConfig,
        })
    }

    private getSystemPromptFromType(chatType: ChatType): string {
        switch (chatType) {
            case ChatType.CREATE:
                return getCreatePageSystemPrompt();
            case ChatType.ASK:
                return getAskModeSystemPrompt();
            case ChatType.EDIT:
            default:
                return getSystemPrompt();
        }
    }

    static async create(chatType: ChatType): Promise<RootAgent> {
        const modelConfig = await RootAgent.getModelFromType(chatType);
        return new RootAgent(chatType, modelConfig);
    }

    private static async getModelFromType(chatType: ChatType): Promise<ModelConfig> {
        switch (chatType) {
            case ChatType.CREATE:
            case ChatType.FIX:
                return await initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
                });
            case ChatType.ASK:
            case ChatType.EDIT:
            default:
                return await initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.CLAUDE_4_5_SONNET,
                });
        }
    }
}
