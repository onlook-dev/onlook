import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { type StreamResponse } from '@onlook/models/chat';
import { ApiRoutes, BASE_API_ROUTE, FUNCTIONS_ROUTE, MainChannels } from '@onlook/models/constants';
import { type CoreMessage } from 'ai';
import { mainWindow } from '..';
import { getRefreshedAuthTokens } from '../auth';
import { PersistentStorage } from '../storage';

class LlmManager {
    private static instance: LlmManager;
    private abortController: AbortController | null = null;
    private useAnalytics: boolean = true;
    private userId: string | null = null;
    private promptProvider: PromptProvider;

    private constructor() {
        this.restoreSettings();
        this.promptProvider = new PromptProvider();
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        const enable = settings.enableAnalytics !== undefined ? settings.enableAnalytics : true;

        if (enable) {
            this.userId = settings.id || null;
            this.useAnalytics = true;
        } else {
            this.useAnalytics = false;
        }
    }

    public toggleAnalytics(enable: boolean) {
        this.useAnalytics = enable;
    }

    public static getInstance(): LlmManager {
        if (!LlmManager.instance) {
            LlmManager.instance = new LlmManager();
        }
        return LlmManager.instance;
    }

    public async stream(
        messages: CoreMessage[],
        systemPrompt: string | null = null,
    ): Promise<StreamResponse> {
        this.abortController = new AbortController();
        try {
            const authTokens = await getRefreshedAuthTokens();
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.AI}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authTokens.accessToken}`,
                    },
                    body: JSON.stringify({
                        messages,
                        systemPrompt: systemPrompt
                            ? systemPrompt
                            : this.promptProvider.getSystemPrompt(process.platform),
                        useAnalytics: this.useAnalytics,
                        userId: this.userId,
                    }),
                    signal: this.abortController.signal,
                },
            );

            if (response.status !== 200) {
                if (response.status === 403) {
                    return {
                        status: 'rate-limited',
                        content: 'You have reached your daily limit.',
                        rateLimitResult: await response.json(),
                    };
                }
                const errorMessage = await response.text();
                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response from server');
            }

            let fullContent = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const chunk = new TextDecoder().decode(value);
                fullContent += chunk;
                this.emitPartialMessage(fullContent);
            }
            return { status: 'full', content: fullContent };
        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
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
