import { createAnthropic } from '@ai-sdk/anthropic';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { type LanguageModelV1 } from 'ai';
import { LangfuseExporter } from 'langfuse-vercel';

export enum LLMProvider {
    ANTHROPIC = 'anthropic',
}

export enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-20241022',
    HAIKU = 'claude-3-5-haiku-20241022',
}

export function initModel(provider: LLMProvider): LanguageModelV1 {
    switch (provider) {
        case LLMProvider.ANTHROPIC: {
            const anthropic = createAnthropic({
                apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
            });
            return anthropic(CLAUDE_MODELS.SONNET, {
                cacheControl: true,
            });
        }
    }
}

export function initTelemetry(): NodeSDK {
    const telemetry = new NodeSDK({
        traceExporter: new LangfuseExporter({
            secretKey: Deno.env.get('LANGFUSE_SECRET_KEY'),
            publicKey: Deno.env.get('LANGFUSE_PUBLIC_KEY'),
            baseUrl: 'https://us.cloud.langfuse.com',
        }),
        instrumentations: [getNodeAutoInstrumentations()],
    });
    telemetry.start();
    return telemetry;
}
