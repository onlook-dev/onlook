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

export type Action = UpdateStyleAction;
