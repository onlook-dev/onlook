import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import {
    StreamRequestType,
    type StreamRequestV2,
    type StreamResponse,
    type UsageCheckResult,
} from '@onlook/models/chat';
import { ApiRoutes, BASE_API_ROUTE, FUNCTIONS_ROUTE, MainChannels } from '@onlook/models/constants';
import { streamText, type CoreMessage, type CoreSystemMessage } from 'ai';
import { mainWindow } from '..';
import { getRefreshedAuthTokens } from '../auth';
import { PersistentStorage } from '../storage';
import { CLAUDE_MODELS, initModel, LLMProvider } from './llmProvider';

class LlmManager {
    private static instance: LlmManager;
    private abortController: AbortController | null = null;
    private useAnalytics: boolean = true;
    private promptProvider: PromptProvider;

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
            const model = initModel(LLMProvider.ANTHROPIC, CLAUDE_MODELS.SONNET, {
                accessToken: authTokens.accessToken,
                requestType,
            });

            const { textStream } = await streamText({
                model,
                messages,
                abortSignal: this.abortController?.signal,
                onError: (error) => {
                    throw error;
                },
            });

            let fullText = '';
            for await (const partialText of textStream) {
                fullText += partialText;
                this.emitPartialMessage(fullText);
            }
            return { content: fullText, status: 'full' };
        } catch (error: any) {
            console.log('error', error.error.statusCode);
            if (error.error.statusCode === 403) {
                const rateLimitError = JSON.parse(error.error.responseBody) as UsageCheckResult;
                return {
                    status: 'rate-limited',
                    content: 'You have reached your daily limit.',
                    rateLimitResult: rateLimitError,
                };
            }
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
        if (error instanceof Response) {
            return error.statusText;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String(error.message);
        }
        return 'An unknown error occurred';
    }

    public async generateSuggestions(messages: CoreMessage[]): Promise<string[]> {
        return [];
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
}

export default LlmManager.getInstance();
