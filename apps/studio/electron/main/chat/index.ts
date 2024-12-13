import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { type StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { type CoreMessage, type CoreSystemMessage, type LanguageModelV1, streamText } from 'ai';
import { LangfuseExporter } from 'langfuse-vercel';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';

enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
}

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-20241022',
    HAIKU = 'claude-3-5-haiku-20241022',
}

enum OPEN_AI_MODELS {
    GPT_4O = 'gpt-4o',
    GPT_4O_MINI = 'gpt-4o-mini',
    GPT_4_TURBO = 'gpt-4-turbo',
}

class LlmManager {
    private static instance: LlmManager;
    private provider = LLMProvider.ANTHROPIC;
    private model: LanguageModelV1;
    private abortController: AbortController | null = null;
    private telemetry: NodeSDK | null = null;
    private userId: string | null = null;
    private promptProvider: PromptProvider;

    private constructor() {
        this.restoreSettings();
        this.model = this.initModel();
        this.promptProvider = new PromptProvider();
    }

    initModel() {
        switch (this.provider) {
            case LLMProvider.ANTHROPIC: {
                const anthropic = createAnthropic({
                    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
                });

                return anthropic(CLAUDE_MODELS.SONNET, {
                    cacheControl: true,
                });
            }
            case LLMProvider.OPENAI: {
                const openai = createOpenAI({
                    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
                });
                return openai(OPEN_AI_MODELS.GPT_4O, {
                    structuredOutputs: true,
                });
            }
        }
    }

    initTelemetry() {
        const telemetry = new NodeSDK({
            traceExporter: new LangfuseExporter({
                secretKey: import.meta.env.VITE_LANGFUSE_SECRET_KEY,
                publicKey: import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
                baseUrl: 'https://us.cloud.langfuse.com',
            }),
            instrumentations: [getNodeAutoInstrumentations()],
        });
        telemetry.start();
        return telemetry;
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        const enable = settings.enableAnalytics !== undefined ? settings.enableAnalytics : true;

        if (enable) {
            this.userId = settings.id || null;
            this.telemetry = this.initTelemetry();
        } else {
            this.telemetry = null;
        }
    }

    public toggleAnalytics(enable: boolean) {
        if (enable) {
            this.telemetry = this.initTelemetry();
        } else {
            this.telemetry = null;
        }
    }

    public static getInstance(): LlmManager {
        if (!LlmManager.instance) {
            LlmManager.instance = new LlmManager();
        }
        return LlmManager.instance;
    }

    getSystemMessage(): CoreSystemMessage {
        return {
            role: 'system',
            content: this.promptProvider.getSystemPrompt(process.platform),
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };
    }

    public async stream(messages: CoreMessage[]): Promise<StreamResponse> {
        this.abortController = new AbortController();
        let fullText = '';
        try {
            const { textStream, text } = await streamText({
                model: this.model,
                messages: [this.getSystemMessage(), ...messages],
                abortSignal: this.abortController.signal,
                experimental_telemetry: {
                    isEnabled: this.telemetry ? true : false,
                    functionId: 'code-gen',
                    metadata: {
                        userId: this.userId || 'unknown',
                    },
                },
            });

            for await (const partialText of textStream) {
                fullText += partialText;
                this.emitPartialMessage(fullText);
            }

            this.emitFullMessage(await text);
            return { content: fullText, status: 'full' };
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage(errorMessage);
            return { content: errorMessage, status: 'error' };
        } finally {
            this.abortController = null;
            this.telemetry?.shutdown();
        }
    }

    public abortStream(): boolean {
        if (this.abortController) {
            this.abortController.abort();
            return true;
        }
        return false;
    }

    private emitPartialMessage(content: string) {
        const res: StreamResponse = {
            status: 'partial',
            content,
        };
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_PARTIAL, res);
    }

    private emitFullMessage(content: string) {
        const res: StreamResponse = {
            status: 'full',
            content,
        };
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_FINAL_MESSAGE, res);
    }

    private emitErrorMessage(message: string) {
        const res: StreamResponse = {
            status: 'error',
            content: message,
        };
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_ERROR, res);
    }

    private getErrorMessage(error: unknown): string {
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
}

export default LlmManager.getInstance();
