import { MessageContextType, type ChatMessageContext } from '@onlook/models/chat';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ChatContext {
    context: ChatMessageContext[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get displayContext(): ChatMessageContext[] {
        const highlightContexts = this.editorEngine.elements.selected.map((element) => ({
            type: MessageContextType.HIGHLIGHT,
            content: element.tagName,
            displayName: element.tagName,
            path: '',
            start: 0,
            end: 0,
        }));

        // TODO: Add file and image contexts
        return [...highlightContexts];
    }

    getChatContext() {
        // TODO: This will later be more than just the selected elements
    }

    clear() {
        this.context = [];
    }
}
