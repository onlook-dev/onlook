import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { type StreamResponse, type StreamResult } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { type CoreMessage, type CoreSystemMessage, type LanguageModelV1, streamText } from 'ai';
import type { PartialDeep } from 'type-fest';
import { mainWindow } from '..';
import { getFormatString, parseObjectFromText } from './helpers';

enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
}

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-5-haiku-20241022',
}

enum OPEN_AI_MODELS {
    GPT_4O = 'gpt-4o',
    GPT_4O_MINI = 'gpt-4o-mini',
    GPT_4_TURBO = 'gpt-4-turbo',
}

class LLMService {
    private static instance: LLMService;
    private provider = LLMProvider.ANTHROPIC;
    private model: LanguageModelV1;
    private abortController: AbortController | null = null;

    private constructor() {
        this.model = this.initModel();
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

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    getSystemMessage(): CoreSystemMessage {
        return {
            role: 'system',
            content: 'You are a seasoned React and Tailwind expert.' + getFormatString(),
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };
    }

    public async stream(requestId: string, messages: CoreMessage[]): Promise<StreamResult> {
        this.abortController = new AbortController();
        let fullText = '';

        try {
            const { textStream, text } = await streamText({
                model: this.model,
                messages: [this.getSystemMessage(), ...messages],
                abortSignal: this.abortController.signal,
            });

            for await (const partialText of textStream) {
                fullText += partialText;
                const partialObject = parseObjectFromText(fullText);
                this.emitEvent(requestId, partialObject);
            }

            const fullObject = parseObjectFromText(await text);
            this.emitFinalMessage(requestId, fullObject);
            return { object: fullObject, success: true };
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage(requestId, errorMessage);
        } finally {
            this.abortController = null;
        }
        return { object: this.getAbortPartialObject(fullText), success: false };
    }

    getAbortPartialObject(text: string): PartialDeep<StreamResponse> | null {
        try {
            const partialObject = parseObjectFromText(text);
            return partialObject;
        } catch (error) {
            return null;
        }
    }

    public abortStream(requestId: string): boolean {
        if (this.abortController) {
            this.abortController.abort();
            return true;
        }
        return false;
    }

    private emitEvent(requestId: string, object: PartialDeep<StreamResponse>) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_PARTIAL, {
            requestId,
            object,
        });
    }

    private emitFinalMessage(requestId: string, object: PartialDeep<StreamResponse>) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_FINAL_MESSAGE, {
            requestId,
            object,
        });
    }

    private emitErrorMessage(requestId: string, message: string) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_ERROR, {
            requestId,
            message,
        });
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

export default LLMService.getInstance();
