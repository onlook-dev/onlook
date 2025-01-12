import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { type StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { type CoreMessage, type CoreSystemMessage } from 'ai';
import { mainWindow } from '..';
import { API_ROUTES } from '../config';
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
    private abortController: AbortController | null = null;
    private userId: string | null = null;
    private promptProvider: PromptProvider;

    private constructor() {
        this.restoreSettings();
        this.promptProvider = new PromptProvider();
    }

    private getApiRoute() {
        return this.provider === LLMProvider.ANTHROPIC ? API_ROUTES.ANTHROPIC : API_ROUTES.OPENAI;
    }

    private getModel() {
        return this.provider === LLMProvider.ANTHROPIC
            ? CLAUDE_MODELS.SONNET
            : OPEN_AI_MODELS.GPT_4O;
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        this.userId = settings.id || null;
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
            const response = await fetch(this.getApiRoute(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [this.getSystemMessage(), ...messages],
                    model: this.getModel(),
                    options: {
                        stream: true,
                    },
                }),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const chunk = new TextDecoder().decode(value);
                fullText += chunk;
                this.emitPartialMessage(fullText);
            }

            this.emitFullMessage(fullText);
            return { content: fullText, status: 'full' };
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            this.emitErrorMessage(errorMessage);
            return { content: errorMessage, status: 'error' };
        } finally {
            this.abortController = null;
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
