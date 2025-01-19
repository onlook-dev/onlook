import { createAnthropic } from '@ai-sdk/anthropic';
import { StreamResponse } from '@onlook/models/chat/response.ts';
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

// Initialize telemetry once at module level
initTelemetry();

export function aiRouteHandler({ messages, systemPrompt, userId, useAnalytics = true }: {
    messages: CoreMessage[],
    systemPrompt: string,
    userId: string,
    useAnalytics: boolean
}): Response {
    try {
        console.log("userId", userId, useAnalytics);
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
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error(error);
        const errorResponse: StreamResponse = {
            status: 'error',
            content: getErrorMessage(error)
        };

        return new Response(
            JSON.stringify(errorResponse),
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

/*
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/api/ai' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "messages": [
        {
          "role": "user",
          "content": "Hello, can you help me with some programming?"
        }
      ],
      "systemPrompt": "You are a helpful AI assistant focused on programming.",
      "userId": "123",
      "useAnalytics": true
    }'
*/
