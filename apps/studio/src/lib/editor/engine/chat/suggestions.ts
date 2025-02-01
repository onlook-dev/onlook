import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { ImageMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage, ImagePart, TextPart } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class SuggestionManager {
    _suggestions: string[] = ['Add a header', 'Add a text input', 'Add a footer'];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get suggestions() {
        return this._suggestions;
    }

    addSuggestion(suggestion: string) {
        this._suggestions.push(suggestion);
    }

    async generateCreatedSuggestions(
        prompt: string,
        response: string,
        images: ImageMessageContext[],
    ) {
        sendAnalytics('generate suggestions');

        const systemPrompt =
            'You are a React and Tailwind CSS export. You will be given a generated website and the prompt the user used to describe it. Please generate 3 more prompts that they can use to further improve the page.';
        const messages = this.getMessages(prompt, response, images);
        const newSuggestions: string[] | null = await invokeMainChannel(
            MainChannels.GENERATE_SUGGESTIONS,
            {
                messages,
                systemPrompt,
            },
        );
        if (newSuggestions) {
            this._suggestions = newSuggestions;
            sendAnalytics('generated suggestions', {
                suggestions: this._suggestions,
            });
        } else {
            console.error('Failed to generate suggestions');
            sendAnalytics('generate suggestions failed');
        }

        console.log('suggestions', this._suggestions);
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
