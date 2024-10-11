import { InsertPos } from '..';

export interface Change<T> {
    updated: T;
    original: T;
}

export interface ActionTarget {
    webviewId: string;
}

export interface ActionTargetWithSelector extends ActionTarget {
    selector: string;
}

export interface StyleActionTarget extends ActionTargetWithSelector {
    change: Change<string>;
}

export interface ActionElementLocation {
    position: InsertPos;
    targetSelector: string;
    index: number;
}

export interface MoveActionLocation extends ActionElementLocation {
    originalIndex: number;
    index: number;
}

export interface ActionElement {
    selector: string;
    tagName: string;
    attributes: Record<string, string>;
    children: ActionElement[];
    styles: Record<string, string>;
    textContent?: string;
}

export interface UpdateStyleAction {
    type: 'update-style';
    targets: Array<StyleActionTarget>;
    style: string;
}

export interface InsertElementAction {
    type: 'insert-element';
    targets: Array<ActionTarget>;
    location: ActionElementLocation;
    element: ActionElement;
    editText?: boolean;
    codeBlock?: string;
}

export interface RemoveElementAction {
    type: 'remove-element';
    targets: Array<ActionTarget>;
    location: ActionElementLocation;
    element: ActionElement;
    codeBlock?: string;
}

export interface MoveElementAction {
    type: 'move-element';
    targets: Array<ActionTargetWithSelector>;
    location: MoveActionLocation;
}

export interface EditTextAction {
    type: 'edit-text';
    targets: Array<ActionTargetWithSelector>;
    originalContent: string;
    newContent: string;
}

export type Action =
    | UpdateStyleAction
    | InsertElementAction
    | RemoveElementAction
    | MoveElementAction
    | EditTextAction;
