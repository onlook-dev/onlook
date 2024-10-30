import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { StreamReponseObject } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { CoreMessage, DeepPartial, streamObject } from 'ai';
import { z } from 'zod';
import { mainWindow } from '..';

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
}

enum OPEN_AI_MODELS {
    GPT_4_TURBO = 'gpt-4-turbo',
}

class LLMService {
    private static instance: LLMService;
    private anthropic: AnthropicProvider;
    private openai: OpenAIProvider;

    private constructor() {
        this.anthropic = createAnthropic({
            apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        });
        this.openai = createOpenAI({
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        });
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    public async stream(
        messages: CoreMessage[],
    ): Promise<z.infer<typeof StreamReponseObject> | null> {
        try {
            // const model = this.anthropic(CLAUDE_MODELS.SONNET, {
            //     cacheControl: true,
            // });

            const model = this.openai(OPEN_AI_MODELS.GPT_4_TURBO);

            const result = await streamObject({
                model,
                system: 'You are a seasoned React and Tailwind expert.',
                schema: StreamReponseObject,
                messages,
            });

            for await (const partialObject of result.partialObjectStream) {
                console.log('Partial', partialObject);
                this.emitEvent(
                    'id',
                    partialObject as DeepPartial<z.infer<typeof StreamReponseObject>>,
                );
            }

            this.emitFinalMessage(
                'id',
                (await result.object) as z.infer<typeof StreamReponseObject>,
            );
            return result.object;
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage('requestId', errorMessage);
            return null;
        }
    }

    private emitEvent(requestId: string, object: DeepPartial<z.infer<typeof StreamReponseObject>>) {
        console.log('Partial', object);
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_PARTIAL, {
            requestId,
            object,
        });
    }

    private emitFinalMessage(requestId: string, object: z.infer<typeof StreamReponseObject>) {
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
