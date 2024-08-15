export interface Change<T> {
    updated: T;
    original: T;
}

export interface ActionTarget {
    webviewId: string;
    selector: string;
}

export interface UpdateStyleAction {
    type: 'update-style';
    targets: Array<ActionTarget>;
    style: string;
    change: Change<string>;
}

export interface ElementLocation {
    position: 'before' | 'after' | 'prepend' | 'append' | number;
    targetSelector: string;
}

export interface HTMLElement {
    tagName: string;
    attributes: Record<string, string>;
    children: HTMLElement[];
    textContent: string;
}

export interface InsertElementAction {
    type: 'insert-element';
    targets: Array<ActionTarget>;
    location: ElementLocation;
    element: HTMLElement;
}

export interface RemoveElementAction {
    type: 'remove-element';
    targets: Array<ActionTarget>;
    location: ElementLocation;
    element: HTMLElement;
}

export type Action = UpdateStyleAction | InsertElementAction | RemoveElementAction;
