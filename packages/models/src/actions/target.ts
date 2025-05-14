import type { StyleChange } from '../style';

export type Change<T> = {
    updated: T;
    original: T;
};

export interface ActionTarget {
    domId: string;
    oid: string | null;
    frameId: string;
}

export interface StyleActionTarget extends ActionTarget {
    change: Change<Record<string, StyleChange>>;
}
