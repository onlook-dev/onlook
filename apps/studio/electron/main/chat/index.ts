import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { mainWindow } from '..';
import { GENERATE_CODE_TOOL } from './tool';
import { MainChannels } from '@onlook/models/constants';

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
}

class LLMService {
    private static instance: LLMService;
    private anthropic: Anthropic;

    private constructor() {
        this.anthropic = new Anthropic({
            apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        });
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    public async send(messages: MessageParam[]): Promise<Anthropic.Messages.Message> {
        return this.anthropic.messages.create({
            model: CLAUDE_MODELS.SONNET,
            max_tokens: 4096,
            system: 'You are a seasoned React and Tailwind expert.',
            messages,
            tools: [GENERATE_CODE_TOOL],
        });
    }

    public async stream(
        messages: MessageParam[],
        requestId: string,
    ): Promise<Anthropic.Messages.Message | null> {
        try {
            const stream = this.anthropic.messages.stream({
                model: CLAUDE_MODELS.SONNET,
                max_tokens: 4096,
                system: 'You are a seasoned React and Tailwind expert.',
                messages,
                tools: [GENERATE_CODE_TOOL],
                stream: true,
            });

            for await (const event of stream) {
                this.emitEvent(requestId, event);
            }

            const finalMessage = await stream.finalMessage();
            this.emitFinalMessage(requestId, finalMessage);
            return finalMessage;
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage(requestId, errorMessage);
            return null;
        }
    }

    private emitEvent(requestId: string, message: Anthropic.Messages.RawMessageStreamEvent) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_EVENT, {
            requestId,
            message,
        });
    }

    private emitFinalMessage(requestId: string, message: Anthropic.Messages.Message) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_FINAL_MESSAGE, {
            requestId,
            message,
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
