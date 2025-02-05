import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { StreamRequestType, type StreamRequestV2, type StreamResponse } from '@onlook/models/chat';
import { ApiRoutes, BASE_API_ROUTE, FUNCTIONS_ROUTE, MainChannels } from '@onlook/models/constants';
import { type CoreMessage, type CoreSystemMessage } from 'ai';
import WebSocket from 'ws';
import { mainWindow } from '..';
import { getRefreshedAuthTokens } from '../auth';
import { PersistentStorage } from '../storage';

class LlmManager {
    private static instance: LlmManager;
    private abortController: AbortController | null = null;
    private useAnalytics: boolean = true;
    private promptProvider: PromptProvider;
    private ws: WebSocket | null = null;

    private constructor() {
        this.restoreSettings();
        this.promptProvider = new PromptProvider();
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        const enable = settings.enableAnalytics !== undefined ? settings.enableAnalytics : true;

        if (enable) {
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
        requestType: StreamRequestType,
        options?: {
            abortController?: AbortController;
            skipSystemPrompt?: boolean;
        },
    ): Promise<StreamResponse> {
        const { abortController, skipSystemPrompt } = options || {};
        this.abortController = abortController || new AbortController();

        try {
            const authTokens = await getRefreshedAuthTokens();

            if (!skipSystemPrompt) {
                const systemMessage = {
                    role: 'system',
                    content: this.promptProvider.getSystemPrompt(process.platform),
                    experimental_providerMetadata: {
                        anthropic: { cacheControl: { type: 'ephemeral' } },
                    },
                } as CoreSystemMessage;
                messages = [systemMessage, ...messages];
            }

            // Connect to WebSocket
            const wsApi = import.meta.env.VITE_SUPABASE_API_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
            if (!wsApi) {
                throw new Error('WebSocket API URL not found');
            }
            console.log('WebSocket API URL', wsApi);
            const wsUrl = `${wsApi}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.AI_WS}`;
            console.log('WebSocket URL', wsUrl);
            this.ws = new WebSocket(wsUrl);

            return new Promise((resolve, reject) => {
                let fullContent = '';

                this.ws!.onopen = () => {
                    // Send the request once connected
                    this.ws!.send(JSON.stringify({
                        messages,
                        useAnalytics: this.useAnalytics,
                        requestType,
                        authToken: authTokens.accessToken,
                    }));
                };

                this.ws!.onmessage = (event) => {
                    console.log('WebSocket message received', event.data);
                    const chunk = event.data;
                    fullContent += chunk;
                    this.emitPartialMessage(fullContent);
                };

                this.ws!.onclose = () => {
                    console.log('WebSocket connection closed');
                    resolve({ status: 'full', content: fullContent });
                };

                this.ws!.onerror = (error) => {
                    reject(error);
                };

                // Handle abort
                this.abortController?.signal.addEventListener('abort', () => {
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.close();
                    }
                });
            });

        } catch (error) {
            console.error('Error receiving stream', error);
            const errorMessage = this.getErrorMessage(error);
            return { content: errorMessage, status: 'error' };
        } finally {
            this.abortController = null;
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
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

    public async generateSuggestions(messages: CoreMessage[]): Promise<string[]> {
        const authTokens = await getRefreshedAuthTokens();
        const response: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.AI_V2}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authTokens.accessToken}`,
                },
                body: JSON.stringify({
                    messages,
                    useAnalytics: this.useAnalytics,
                    requestType: StreamRequestType.SUGGESTIONS,
                } satisfies StreamRequestV2),
            },
        );

        return (await response.json()) as string[];
    }

    public async connectToWebSocket(): Promise<void> {
        const wsUrl = `${import.meta.env.VITE_SUPABASE_API_URL?.replace('https://', 'wss://')}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.AI_WS}`;
        if (!wsUrl) {
            throw new Error('WebSocket URL not found');
        }

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connection opened');
        };

        ws.onmessage = (event) => {
            console.log('WebSocket message received', event.data);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }
}

export default LlmManager.getInstance();
