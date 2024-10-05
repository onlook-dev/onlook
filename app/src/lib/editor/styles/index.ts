import { CompoundStyle, CompoundStyleKey, SingleStyle, StyleParams, StyleType } from './models';

export class SingleStyleImpl implements SingleStyle {
    public readonly elStyleType = 'single';
    constructor(
        public readonly key: string,
        public readonly defaultValue: string,
        public readonly displayName: string,
        public readonly type: StyleType,
        public readonly params?: StyleParams,
    ) {}

    getValue(styleRecord: Record<string, string>) {
        return styleRecord[this.key] ?? this.defaultValue;
    }
}

export class CompoundStyleImpl implements CompoundStyle {
    public readonly elStyleType = 'compound';
    constructor(
        public readonly key: CompoundStyleKey,
        public readonly head: SingleStyleImpl,
        public readonly children: SingleStyleImpl[],
    ) {}
}
