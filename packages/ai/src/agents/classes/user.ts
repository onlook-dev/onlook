import { BaseAgent } from '../models/base';
import { initModel } from '../../index';
import { AgentType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';
import { userTools } from '../tool-lookup';

export class UserAgent extends BaseAgent {
    readonly agentType = AgentType.USER;
    readonly modelConfig: ModelConfig = initModel({
        provider: LLMProvider.OPENROUTER,
        model: OPENROUTER_MODELS.CLAUDE_3_5_HAIKU,
    });
    readonly tools = userTools;

    get systemPrompt(): string {
        return ``;
    }
}