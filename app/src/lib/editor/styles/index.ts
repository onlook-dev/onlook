import { CompoundStyle, CompoundStyleKey, StyleParams, StyleType } from './models';

export class SingleStyle implements SingleStyle {
    public readonly elStyleType = 'single';
    constructor(
        public readonly key: string,
        public readonly defaultValue: string,
        public readonly displayName: string,
        public readonly type: StyleType,
        public readonly params?: StyleParams,
    ) {}
}

export class CompoundStyleImpl implements CompoundStyle {
    public readonly elStyleType = 'compound';
    constructor(
        public readonly key: CompoundStyleKey,
        public readonly head: SingleStyle,
        public readonly children: SingleStyle[],
    ) {}
}
