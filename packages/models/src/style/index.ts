import type { ActionTarget } from 'src/actions/target';
import type { Change } from 'src/actions/target';

export interface StyleChange {
    value: string;
    type: StyleChangeType;
}

export enum StyleChangeType {
    Value = 'value',
    Custom = 'custom',
    Remove = 'remove',
}
