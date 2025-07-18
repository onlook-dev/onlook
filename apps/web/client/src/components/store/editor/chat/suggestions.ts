
import { sendAnalytics } from '@/utils/analytics';
import type { ChatSuggestion, Project } from '@onlook/models';
import type { ImageMessageContext } from '@onlook/models/chat';
import type { CoreMessage, CoreSystemMessage, ImagePart, Message, TextPart } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatType } from '@onlook/models/chat';
import { removeContextMessages } from '@onlook/ai/src/prompt/provider';


export class SuggestionManager {
    shouldHide = false;
    isSendingMessage = false;
    isLoadingSuggestions = false;
    private _suggestions: ChatSuggestion[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get suggestions() {
        return this._suggestions || [];
    }

    set suggestions(suggestions: ChatSuggestion[]) {
        this._suggestions = suggestions;
    }

    setSendingMessage(isSending: boolean) {
        this._suggestions = [];
        this.isSendingMessage = isSending;
    }

    private async fetchSuggestions(messages: Message[]): Promise<ChatSuggestion[]> {
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages,
                    chatType: ChatType.SUGGEST,
                }),
            });

            if (!res.ok) {
                return [];
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }
    }


    async getNextSuggestionsMessages(): Promise<void> {
        const messages = this.editorEngine.chat.conversation.current?.messages ?? [];
        removeContextMessages(messages);
        
        this.setSendingMessage(false);
        this.isLoadingSuggestions = true;

        this.suggestions = await this.fetchSuggestions(messages);
        this.isLoadingSuggestions = false;
    }

    // Code to implement if you want to store and get suggestions from storage
    // async getCurrentProjectSuggestions(project: Project | null) {
    //     if (!project) {
    //         return;
    //     }
    //     if (this.editorEngine.projectId === project.id) {
    //         return;
    //     }
    //     this._suggestions = await this.getSuggestionsFromStorage(project.id);
    // }

    // private async getSuggestionsFromStorage(projectId: string): Promise<ChatSuggestion[]> {
    //     const res: ChatSuggestion[] = [
    //         {
    //             title: 'Suggestion 1',
    //             prompt: 'Suggestion 1 prompt',
    //         },
    //         {
    //             title: 'Suggestion 2',
    //             prompt: 'Suggestion 2 prompt',
    //         },
    //     ];
    //     return res;
    // }

    // private saveSuggestionsToStorage() {
    //     if (!this.editorEngine.projectId) {
    //         console.error('No project id found');
    //         return;
    //     }

    //     console.log('saveSuggestionsToStorage', this._suggestions);

    //     invokeMainChannel(MainChannels.SAVE_SUGGESTIONS, {
    //         suggestions: {
    //             id: this.projectId,
    //             projectId: this.projectId,
    //             suggestions: this._suggestions,
    //         } satisfies ProjectSuggestion s,
    //     });
    // }


    // async getCreatedSuggestionsMessages(
    //     prompt: string,
    //     response: string,
    //     images: ImageMessageContext[],
    // ): Promise<void> {
    //     sendAnalytics('generate suggestions');
    //     const messages = this.getMessages(prompt, response, images);
    //     this.suggestions = await this.fetchSuggestions(messages);
    // }

    // private getMessages(
    //     prompt: string,
    //     response: string,
    //     images: ImageMessageContext[],
    // ): CoreMessage[] {
    //     const promptContent = `This was my previous prompt: ${prompt}.${images.length > 0 ? 'I also included the images above.' : ''}`;

    //     let content: string | (ImagePart | TextPart)[] = promptContent;
    //     if (images.length > 0) {
    //         content = [
    //             ...images.map((image) => ({
    //                 type: 'image' as const,
    //                 image: image.content,
    //                 mimeType: image.mimeType,
    //             })),
    //             {
    //                 type: 'text' as const,
    //                 text: promptContent,
    //             },
    //         ];
    //     }

    //     return [
    //         {
    //             role: 'user',
    //             content,
    //         },
    //         {
    //             role: 'assistant',
    //             content: response,
    //         },
    //         {
    //             role: 'user',
    //             content: 'What should I prompt next to make this page better?',
    //         },
    //     ];
    // }
}
