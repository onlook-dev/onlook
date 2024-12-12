import { MessageContextType, type ChatMessageContext } from '@onlook/models/chat';
import type { DomElement } from '@onlook/models/element';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';

export class ChatContext {
    // TODO: This will later be more than just the selected elements
    selected: DomElement[] = [];
    context: ChatMessageContext[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            (selected) => this.updateSelected(selected),
        );
    }

    get displayContext(): ChatMessageContext[] {
        return this.selected.map((element) => ({
            type: MessageContextType.HIGHLIGHT,
            content: element.tagName,
            displayName: element.tagName,
            path: '',
            start: 0,
            end: 0,
        }));
    }

    updateSelected(selected: DomElement[]) {
        console.log('updateSelected', selected);
        this.selected = selected;
    }

    clear() {
        this.context = [];
    }
}
