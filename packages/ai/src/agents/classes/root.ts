import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, getToolSetFromType, initModel } from '../../index';
import { BaseAgent } from '../models/base';
import { readOnlyRootTools, rootTools } from '../tool-lookup';

export function getToolFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyRootTools : rootTools;
}

export class RootAgent extends BaseAgent {
    readonly id = 'root-agent';
    private readonly chatType: ChatType;
    readonly modelConfig: ModelConfig;

    constructor(chatType: ChatType, modelConfig: ModelConfig) {
        super(getToolSetFromType(chatType));

        this.chatType = chatType;
        this.modelConfig = modelConfig;
    }

    get systemPrompt(): string {
        return this.getSystemPromptFromType(this.chatType);
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
