import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import {
    ChatSuggestionSchema,
    StreamRequestType,
    type ChatSuggestion,
    type StreamResponse,
    type UsageCheckResult,
} from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { generateObject, streamText, tool, type CoreMessage, type CoreSystemMessage } from 'ai';
import { z } from 'zod';
import { mainWindow } from '..';
import { getRefreshedAuthTokens } from '../auth';
import { PersistentStorage } from '../storage';
import { getAllFiles } from './helpers';
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
        console.log('messages', messages);
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
                maxSteps: 10,
                tools: {
                    listAllFiles: tool({
                        description:
                            'List all files in the current directory, including subdirectories',
                        parameters: z.object({
                            path: z
                                .string()
                                .describe('The absolute path to the directory to get files from'),
                        }),
                        execute: async ({ path }) => {
                            console.log('List all files in', path);
                            const files = getAllFiles(path);
                            return files;
                        },
                    }),
                    readFile: tool({
                        description: 'Read a file',
                        parameters: z.object({
                            path: z.string().describe('The absolute path to the file to read'),
                        }),
                        execute: async ({ path }) => {
                            console.log('Read file', path);
                            const file = await Bun.file(path).text();
                            console.log('File content', file);
                            return file;
                        },
                    }),
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

    public async generateSuggestions(messages: CoreMessage[]): Promise<ChatSuggestion[]> {
        try {
            const authTokens = await getRefreshedAuthTokens();
            const model = initModel(LLMProvider.ANTHROPIC, CLAUDE_MODELS.HAIKU, {
                accessToken: authTokens.accessToken,
                requestType: StreamRequestType.SUGGESTIONS,
            });

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
