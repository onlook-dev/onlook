export interface StyleChange {
    value: string;
    type: StyleChangeType;
}

export enum StyleChangeType {
    Value = 'value',
    Custom = 'custom',
    Remove = 'remove',
}
