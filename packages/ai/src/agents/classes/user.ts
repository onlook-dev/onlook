import { BaseAgent } from '../models/base';
import { initModel } from '../../index';
import { AgentType, LLMProvider, OPENROUTER_MODELS, type ModelConfig } from '@onlook/models';

export class UserAgent extends BaseAgent {
    readonly agentType = AgentType.USER;
    readonly modelConfig: ModelConfig;

    constructor(modelConfig: ModelConfig) {
        // No tools for the doggo
        super({});
        this.modelConfig = modelConfig;
    }

    get systemPrompt(): string {
        return `You are a dog and you love to bark. No matter what only bark.`;
    }

    static async create(): Promise<UserAgent> {
        const modelConfig = await initModel({
            provider: LLMProvider.OPENROUTER,
            model: OPENROUTER_MODELS.CLAUDE_3_5_HAIKU,
        });
        return new UserAgent(modelConfig);
    }
}
