import { createAnthropic } from '@ai-sdk/anthropic';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { type CoreMessage, type CoreSystemMessage, type LanguageModelV1, streamText } from 'ai';
import { LangfuseExporter } from 'langfuse-vercel';

enum LLMProvider {
    ANTHROPIC = 'anthropic',
}

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-20241022',
    HAIKU = 'claude-3-5-haiku-20241022',
}

export function aiRouteHandler({ messages, systemPrompt, userId, useAnalytics = true }: {
    messages: CoreMessage[],
    systemPrompt: string,
    userId: string,
    useAnalytics: boolean
}): Response {
    try {
        let telemetry: NodeSDK | undefined;
        if (useAnalytics) {
            telemetry = initTelemetry();
        }
        const model = initModel(LLMProvider.ANTHROPIC);
        const systemMessage: CoreSystemMessage = {
            role: 'system',
            content: systemPrompt,
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };

        const result = streamText({
            model,
            messages: [systemMessage, ...messages],
            experimental_telemetry: {
                isEnabled: useAnalytics ? true : false,
                functionId: 'code-gen',
                metadata: {
                    userId: userId,
                },
            },
            onFinish: async () => {
                await telemetry?.shutdown();
            }
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error(error);
        return new Response(
            getErrorMessage(error),
            {
                headers: { "Content-Type": "application/json" },
                status: 500
            }
        );
    }
}

function initModel(provider: LLMProvider): LanguageModelV1 {
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

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}

function initTelemetry(): NodeSDK {
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
