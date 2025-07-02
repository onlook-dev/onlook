
import { sendAnalytics } from '@/utils/analytics';
import type { ChatSuggestion, Project } from '@onlook/models';
import type { ImageMessageContext } from '@onlook/models/chat';
import type { CoreMessage, CoreSystemMessage, ImagePart, TextPart } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class SuggestionManager {
    shouldHide = false;
    private _suggestions: ChatSuggestion[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get suggestions() {
        return this._suggestions || [];
    }

    set suggestions(suggestions: ChatSuggestion[]) {
        this._suggestions = suggestions;
        this.saveSuggestionsToStorage();
    }

    async getCurrentProjectSuggestions(project: Project | null) {
        if (!project) {
            return;
        }
        if (this.editorEngine.projectId === project.id) {
            return;
        }
        this._suggestions = await this.getSuggestionsFromStorage(project.id);
    }

    private async getSuggestionsFromStorage(projectId: string): Promise<ChatSuggestion[]> {
        const res: ChatSuggestion[] | null = [
            {
                title: 'Suggestion 1',
                prompt: 'Suggestion 1 prompt',
            },
            {
                title: 'Suggestion 2',
                prompt: 'Suggestion 2 prompt',
            },
        ];
        return res || [];
    }

    private saveSuggestionsToStorage() {
        if (!this.editorEngine.projectId) {
            console.error('No project id found');
            return;
        }

        console.log('saveSuggestionsToStorage', this._suggestions);

        // invokeMainChannel(MainChannels.SAVE_SUGGESTIONS, {
        //     suggestions: {
        //         id: this.projectId,
        //         projectId: this.projectId,
        //         suggestions: this._suggestions,
        //     } satisfies ProjectSuggestions,
        // });
    }

    async getCreatedSuggestionsMessages(
        prompt: string,
        response: string,
        images: ImageMessageContext[],
    ): Promise<CoreMessage[]> {
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
        return [systemMessage, ...messages];
    }

    async getNextSuggestionsMessages(messages: CoreMessage[]): Promise<CoreMessage[]> {
        const systemMessage: CoreSystemMessage = {
            role: 'system',
            content:
                'Given the conversation above, please give 3 more prompts the users can use to improve their website. Please make sure the prompts are realistic, detailed, and implementable within their current project. The suggestions are aimed to make the site better for the original intent. Try to answer in the same language as the user.',
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };

        return [systemMessage, ...messages];
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
