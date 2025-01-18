export type Change<T> = {
    updated: T;
    original: T;
};

export interface ActionTarget {
    domId: string;
    oid: string | null;
    webviewId: string;
}

export interface StyleActionTarget extends ActionTarget {
    change: Change<Record<string, string>>;
}
