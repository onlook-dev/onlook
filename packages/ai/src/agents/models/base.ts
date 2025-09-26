import type { AgentType, ModelConfig } from '@onlook/models';
import { type ModelMessage } from 'ai';
import { stepCountIs, streamText } from 'ai';
import { createToolSet, type BaseTool } from '../../tools';

export abstract class BaseAgent {
    abstract readonly agentType: AgentType;
    abstract readonly modelConfig: ModelConfig;
    abstract readonly systemPrompt: string;
    abstract readonly tools: Array<typeof BaseTool>;

    constructor() {

    }

    getSystemPrompt() {
        return this.systemPrompt;
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
            tools: createToolSet(this.tools),
            stopWhen: stepCountIs(config.maxSteps),
            system: this.getSystemPrompt(),
            messages,
            ...additionalConfig,
        })
    }
}