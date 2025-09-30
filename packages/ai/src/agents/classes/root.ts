import { AgentType, ChatType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { getAskModeSystemPrompt, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '../../index';
import { BaseAgent } from '../models/base';
import { readOnlyRootTools, rootTools } from '../tool-lookup';

export function getToolFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyRootTools : rootTools;
}

export class RootAgent extends BaseAgent {
    readonly agentType = AgentType.ROOT;
    private readonly chatType: ChatType;
    readonly modelConfig: ModelConfig;

    constructor(chatType: ChatType) {
        super();
        this.chatType = chatType;
        this.modelConfig = this.getModelFromType(chatType);
    }

    get systemPrompt(): string {
        return this.getSystemPromptFromType(this.chatType);
    }

    get tools() {
        return getToolFromType(this.chatType);
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
