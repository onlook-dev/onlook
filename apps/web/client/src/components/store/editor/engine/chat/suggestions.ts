import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { ChatSuggestion, Project } from '@onlook/models';
import type { ImageMessageContext, ProjectSuggestions } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage, CoreSystemMessage, ImagePart, TextPart } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';

export class SuggestionManager {
    projectId: string | null = null;
    private _suggestions: ChatSuggestion[] = [];
    private _shouldHide = false;

    constructor(private projectsManager: ProjectsManager) {
        makeAutoObservable(this);
        reaction(
            () => this.projectsManager.project,
            (current) => this.getCurrentProjectSuggestions(current),
        );
    }

    get suggestions() {
        return this._suggestions || [];
    }

    set suggestions(suggestions: ChatSuggestion[]) {
        this._suggestions = suggestions;
        this.saveSuggestionsToStorage();
    }

    get shouldHide() {
        return this._shouldHide;
    }

    set shouldHide(value: boolean) {
        this._shouldHide = value;
    }

    async getCurrentProjectSuggestions(project: Project | null) {
        if (!project) {
            return;
        }
        if (this.projectId === project.id) {
            return;
        }
        this.projectId = project.id;
        this._suggestions = await this.getSuggestions(project.id);
    }

    async getSuggestions(projectId: string): Promise<ChatSuggestion[]> {
        const res: ChatSuggestion[] | null = await invokeMainChannel(
            MainChannels.GET_SUGGESTIONS_BY_PROJECT,
            { projectId },
        );
        if (!res) {
            console.error('No suggestions found');
            return [];
        }
        return res;
    }

    saveSuggestionsToStorage() {
        if (!this.projectId) {
            console.error('No project id found');
            return;
        }

        invokeMainChannel(MainChannels.SAVE_SUGGESTIONS, {
            suggestions: {
                id: this.projectId,
                projectId: this.projectId,
                suggestions: this._suggestions,
            } satisfies ProjectSuggestions,
        });
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
            sendAnalytics('generated suggestions');
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
            sendAnalytics('generated suggestions');
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
