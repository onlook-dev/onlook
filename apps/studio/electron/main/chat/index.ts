import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { StreamReponseObject } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { CoreMessage, DeepPartial, LanguageModelV1, streamText } from 'ai';
import { Allow, parse } from 'partial-json';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { mainWindow } from '..';

enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
}

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
}

enum OPEN_AI_MODELS {
    O1_MINI = 'o1-mini',
    O1_PREVIEW = 'o1-preview',
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
                return openai(OPEN_AI_MODELS.GPT_4O, { structuredOutputs: true });
            }
        }
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    getFormatString() {
        const jsonFormat = JSON.stringify(zodToJsonSchema(StreamReponseObject));
        return `\nReturn your response only in this JSON format: <format>${jsonFormat}</format>`;
    }

    stripFullText(fullText: string) {
        let text = fullText;

        if (text.startsWith('```')) {
            text = text.slice(3);
        }

        if (text.startsWith('```json\n')) {
            text = text.slice(8);
        }

        if (text.endsWith('```')) {
            text = text.slice(0, -3);
        }
        return text;
    }

    public async stream(
        messages: CoreMessage[],
    ): Promise<z.infer<typeof StreamReponseObject> | null> {
        try {
            const result = await streamText({
                model: this.model,
                system: 'You are a seasoned React and Tailwind expert.' + this.getFormatString(),
                messages,
            });

            let fullText = '';
            for await (const partialText of result.textStream) {
                fullText += partialText;
                const strippedFull = this.stripFullText(fullText);
                const partialObject = parse(strippedFull, Allow.ALL);
                this.emitEvent(
                    'id',
                    partialObject as DeepPartial<z.infer<typeof StreamReponseObject>>,
                );
            }

            const fullObject = parse(fullText, Allow.ALL);
            this.emitFinalMessage('id', fullObject as z.infer<typeof StreamReponseObject>);
            return fullObject;
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage('requestId', errorMessage);
            return null;
        }
    }

    private emitEvent(requestId: string, object: DeepPartial<z.infer<typeof StreamReponseObject>>) {
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
