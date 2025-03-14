export type Change<T> = {
    updated: T;
    original: T;
};

export interface ActionTarget {
    domId: string;
    oid: string | null;
    webviewId: string;
}

export interface StyleChange {
    value: string;
    type: StyleChangeType;
}

export enum StyleChangeType {
    Value = 'value',
    Custom = 'custom',
    Remove = 'remove',
}

export interface StyleActionTarget extends ActionTarget {
    change: Change<Record<string, StyleChange>>;
}
