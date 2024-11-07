import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { type StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import {
    type CoreMessage,
    type CoreSystemMessage,
    type DeepPartial,
    type LanguageModelV1,
    streamText,
} from 'ai';
import { mainWindow } from '..';
import { getFormatString, parseObjectFromText } from './helpers';

enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
}

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
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

    public async stream(messages: CoreMessage[]): Promise<StreamResponse | null> {
        try {
            const { textStream, text } = await streamText({
                model: this.model,
                messages: [this.getSystemMessage(), ...messages],
            });

            this.emitStreamEvents(textStream);
            const fullObject = parseObjectFromText(await text) as StreamResponse;
            this.emitFinalMessage('id', fullObject);
            return fullObject;
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage('requestId', errorMessage);
            return null;
        }
    }

    async emitStreamEvents(textStream: AsyncIterable<string>) {
        try {
            let fullText = '';
            for await (const partialText of textStream) {
                fullText += partialText;
                const partialObject = parseObjectFromText(fullText);
                this.emitEvent('id', partialObject);
            }
        } catch (error) {
            console.error('Error parsing stream', error);
        }
    }

    private emitEvent(requestId: string, object: DeepPartial<StreamResponse>) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_PARTIAL, {
            requestId,
            object,
        });
    }

    private emitFinalMessage(requestId: string, object: StreamResponse) {
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
