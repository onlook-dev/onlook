import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { listFilesTool, readFileTool } from '@onlook/ai/src/tools';
import { CLAUDE_MODELS, LLMProvider, MCP_MODELS } from '@onlook/models';
import {
    ChatSuggestionSchema,
    StreamRequestType,
    type ChatSuggestion,
    type StreamResponse,
    type UsageCheckResult,
} from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import {
    generateObject,
    streamText,
    type CoreMessage,
    type CoreSystemMessage,
    type LanguageModelV1,
} from 'ai';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';
import { initModel } from './llmProvider';

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
            const model = await this.getModel(requestType);

            const { textStream } = await streamText({
                model,
                messages,
                abortSignal: this.abortController?.signal,
                onError: (error) => {
                    throw error;
                },
                maxSteps: 10,
                tools: {
                    listAllFiles: listFilesTool,
                    readFile: readFileTool,
                },
                maxTokens: 64000,
            });

            let fullText = '';
            for await (const partialText of textStream) {
                fullText += partialText;
                this.emitPartialMessage(fullText);
            }
            return { content: fullText, status: 'full' };
        } catch (error: any) {
            try {
                console.error('Error', error);
                if (error?.error?.statusCode) {
                    if (error?.error?.statusCode === 403) {
                        const rateLimitError = JSON.parse(
                            error.error.responseBody,
                        ) as UsageCheckResult;
                        return {
                            status: 'rate-limited',
                            content: 'You have reached your daily limit.',
                            rateLimitResult: rateLimitError,
                        };
                    } else {
                        return {
                            status: 'error',
                            content: error.error.responseBody,
                        };
                    }
                }
                const errorMessage = this.getErrorMessage(error);
                return { content: errorMessage, status: 'error' };
            } catch (error) {
                console.error('Error parsing error', error);
                return { content: 'An unknown error occurred', status: 'error' };
            } finally {
                this.abortController = null;
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
        if (error instanceof Response) {
            return error.statusText;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String(error.message);
        }
        return 'An unknown error occurred';
    }

    private async getModel(requestType: StreamRequestType): Promise<LanguageModelV1> {
        // Get the provider and model from settings or use defaults
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        const provider = settings.llmProvider || LLMProvider.ANTHROPIC;
        const modelName = settings.llmModel || CLAUDE_MODELS.SONNET;

        return await initModel(provider, modelName, { requestType });
    }

    public async generateSuggestions(messages: CoreMessage[]): Promise<ChatSuggestion[]> {
        try {
            const model = await this.getModel(StreamRequestType.SUGGESTIONS);

            const { object } = await generateObject({
                model,
                output: 'array',
                schema: ChatSuggestionSchema,
                messages,
            });
            return object as ChatSuggestion[];
        } catch (error) {
            console.error(error);
            return [];
        }
    }
}

export default LlmManager.getInstance();
