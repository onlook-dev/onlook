import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { StreamRequestType, type StreamRequestV2, type StreamResponse } from '@onlook/models/chat';
import {
    ApiRoutes,
    BASE_API_ROUTE,
    FUNCTIONS_ROUTE,
} from '../../../../../packages/models/src/constants/api';
import { MainChannels } from '@onlook/models/constants';
import { type CoreMessage, type CoreSystemMessage } from 'ai';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';
import { WebSocketManager } from './websocket';
import { getRefreshedAuthTokens } from '../auth';

class LlmManager {
    private static instance: LlmManager;
    private useAnalytics: boolean = true;
    private promptProvider: PromptProvider;
    private webSocket: WebSocketManager;

    private constructor() {
        this.restoreSettings();
        this.promptProvider = new PromptProvider();
        this.webSocket = new WebSocketManager();
        this.webSocket.setMessageCallback((response) => {
            mainWindow?.webContents.send(MainChannels.CHAT_STREAM_PARTIAL, response);
        });
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        this.useAnalytics =
            settings.enableAnalytics !== undefined ? settings.enableAnalytics : true;
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
        const { skipSystemPrompt } = options || {};
        try {
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

            await this.webSocket.send({
                messages,
                useAnalytics: this.useAnalytics,
                requestType,
            });

            return { status: 'full', content: '' }; // WebSocket will handle streaming
        } catch (error) {
            console.error('Error in stream:', error);
            const errorMessage = this.getErrorMessage(error);
            return { content: errorMessage, status: 'error' };
        }
    }

    public abortStream(): boolean {
        this.webSocket.close();
        return true;
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
        try {
            await this.webSocket.send({
                messages,
                useAnalytics: this.useAnalytics,
                requestType: StreamRequestType.SUGGESTIONS,
            });
            return []; // WebSocket will handle suggestions through the callback
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return [];
        }
    }
}

export default LlmManager.getInstance();
