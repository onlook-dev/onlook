export interface Change<T> {
    updated: T;
    original: T;
}

export interface StyleActionTarget {
    webviewId: string;
    selector: string;
}

export interface ActionTarget {
    webviewId: string;
}

export interface UpdateStyleAction {
    type: 'update-style';
    targets: Array<StyleActionTarget>;
    style: string;
    change: Change<string>;
}

export interface ActionElementLocation {
    position: 'before' | 'after' | 'prepend' | 'append';
    targetSelector: string;
}

export interface ActionElement {
    tagName: string;
    attributes: Record<string, string>;
    children: ActionElement[];
    textContent: string;
}

export interface InsertElementAction {
    type: 'insert-element';
    targets: Array<ActionTarget>;
    location: ActionElementLocation;
    element: ActionElement;
    styles: Record<string, string>;
}

export interface RemoveElementAction {
    type: 'remove-element';
    targets: Array<ActionTarget>;
    location: ActionElementLocation;
    element: ActionElement;
    styles: Record<string, string>;
}

export type Action = UpdateStyleAction | InsertElementAction | RemoveElementAction;
