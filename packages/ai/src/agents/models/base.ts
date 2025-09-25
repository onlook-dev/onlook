import type { AgentType, ModelConfig } from '@onlook/models';
import { type ModelMessage, type ToolSet } from 'ai';
import { stepCountIs, streamText } from 'ai';

export abstract class BaseAgent {
    abstract readonly agentType: AgentType;
    abstract readonly modelConfig: ModelConfig;
    abstract readonly systemPrompt: string;
    protected readonly toolSet: ToolSet

    constructor(toolSet: ToolSet = {}) {
        this.toolSet = toolSet;
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
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(),
                    providerOptions: this.modelConfig.providerOptions,
                },
                ...messages
            ],
            ...additionalConfig,
        })
    }
}
