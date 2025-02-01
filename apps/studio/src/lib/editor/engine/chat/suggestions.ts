import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { ChatSuggestion } from '@onlook/models';
import type { ImageMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage, CoreSystemMessage, ImagePart, TextPart } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class SuggestionManager {
    suggestions: ChatSuggestion[] = [];
    _shouldHide = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    addSuggestion(suggestion: ChatSuggestion) {
        this.suggestions.push(suggestion);
    }

    get shouldHide() {
        return this._shouldHide;
    }

    set shouldHide(value: boolean) {
        this._shouldHide = value;
    }

    async generateCreatedSuggestions(
        prompt: string,
        response: string,
        images: ImageMessageContext[],
    ) {
        sendAnalytics('generate suggestions');

        const systemMessage: CoreSystemMessage = {
            role: 'system',
            content:
                'You are a React and Tailwind CSS expert. You will be given a generated website and the prompt the user used to describe it. Please generate 3 more prompts that they can use to further improve the page. Try to reply in the same language as the original prompt.',
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };

        const messages = this.getMessages(prompt, response, images);
        const newSuggestions: ChatSuggestion[] | null = await invokeMainChannel(
            MainChannels.GENERATE_SUGGESTIONS,
            {
                messages: [systemMessage, ...messages],
            },
        );

        if (newSuggestions) {
            this.suggestions = newSuggestions;
            sendAnalytics('generated suggestions', {
                suggestions: this.suggestions,
            });
        } else {
            console.error('Failed to generate suggestions');
            sendAnalytics('generate suggestions failed');
        }
    }

    async generateNextSuggestions(messages: CoreMessage[]) {
        const systemMessage: CoreSystemMessage = {
            role: 'system',
            content:
                'Given the conversation above, please give 3 more prompts the users can use to improve their website. Please make sure the prompts are realistic, detailed, and implementable within their current project. The suggestions are aimed to make the site better for the original intent. Try to answer in the same language as the user.',
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };

        const newSuggestions: ChatSuggestion[] | null = await invokeMainChannel(
            MainChannels.GENERATE_SUGGESTIONS,
            {
                messages: [...messages, systemMessage],
            },
        );
        if (newSuggestions) {
            this.suggestions = newSuggestions;
            sendAnalytics('generated suggestions', {
                suggestions: this.suggestions,
            });
        } else {
            console.error('Failed to generate suggestions');
            sendAnalytics('generate suggestions failed');
        }
    }

    private getMessages(
        prompt: string,
        response: string,
        images: ImageMessageContext[],
    ): CoreMessage[] {
        const promptContent = `This was my previous prompt: ${prompt}.${images.length > 0 ? 'I also included the images above.' : ''}`;

        let content: string | (ImagePart | TextPart)[] = promptContent;
        if (images.length > 0) {
            content = [
                ...images.map((image) => ({
                    type: 'image' as const,
                    image: image.content,
                    mimeType: image.mimeType,
                })),
                {
                    type: 'text' as const,
                    text: promptContent,
                },
            ];
        }

        return [
            {
                role: 'user',
                content,
            },
            {
                role: 'assistant',
                content: response,
            },
            {
                role: 'user',
                content: 'What should I prompt next to make this page better?',
            },
        ];
    }
}
