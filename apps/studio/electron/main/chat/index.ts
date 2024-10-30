import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic';
import { CoreMessage, streamObject } from 'ai';
import { z } from 'zod';
import { mainWindow } from '..';
import { MainChannels } from '/common/constants';

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
}

class LLMService {
    private static instance: LLMService;
    private anthropic: AnthropicProvider;

    private constructor() {
        this.anthropic = createAnthropic({
            apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        });
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    public async stream(): Promise<z.infer<typeof StreamReponseObject> | null> {
        try {
            const model = this.anthropic(CLAUDE_MODELS.SONNET, {
                cacheControl: true,
            });

            const messages: CoreMessage[] = [
                {
                    role: 'user',
                    content: 'update index.ts to say hello world',
                },
            ];

            const stream = await streamObject({
                model,
                system: 'You are a seasoned React and Tailwind expert.',
                schema: StreamReponseObject,
                messages,
            });

            for await (const partialObject of stream.partialObjectStream) {
                this.emitEvent(
                    'requestId',
                    partialObject as Partial<z.infer<typeof StreamReponseObject>>,
                );
            }
            this.emitFinalMessage(
                'requestId',
                (await stream.object) as z.infer<typeof StreamReponseObject>,
            );
            return stream.object;
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage('requestId', errorMessage);
            return null;
        }
    }

    private emitEvent(requestId: string, object: Partial<z.infer<typeof StreamReponseObject>>) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_EVENT, {
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
