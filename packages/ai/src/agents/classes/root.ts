import { ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { type ToolSet } from 'ai';
import { getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, getToolSetFromType, initModel } from '../../index';

export class RootAgent {
    private readonly chatType: ChatType;
    readonly modelConfig: ModelConfig;
    readonly toolSet: ToolSet;
    readonly maxSteps: number;

    constructor(chatType: ChatType) {
        this.chatType = chatType;
        this.modelConfig = this.getModelFromType(chatType);
        this.toolSet = getToolSetFromType(chatType);
        this.maxSteps = 20;
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
