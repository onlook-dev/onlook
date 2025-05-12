export interface StyleChange {
    value: string;
    type: StyleChangeType;
}

export enum StyleChangeType {
    Value = 'value',
    Custom = 'custom',
    Remove = 'remove',
}

export interface TailwindColor {
    name: string;
    originalKey: string;
    lightColor: string;
    darkColor?: string;
    line?: {
        config?: number;
        css?: {
            lightMode?: number;
            darkMode?: number;
        };
    };
    override?: boolean;
}
