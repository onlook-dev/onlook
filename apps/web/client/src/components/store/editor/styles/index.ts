import type { CSSProperties } from 'react';
import type {
    CompoundStyle,
    CompoundStyleKey,
    SingleStyle,
    StyleParams,
    StyleType,
} from './models';

export class SingleStyleImpl implements SingleStyle {
    public readonly elStyleType = 'single';
    constructor(
        public readonly key: string,
        public readonly defaultValue: string,
        public readonly displayName: string,
        public readonly type: StyleType,
        public readonly params?: StyleParams,
    ) {}

    getValue(styleRecord: CSSProperties) {
        return styleRecord[this.key as keyof CSSProperties]?.toString() ?? this.defaultValue;
    }
}

export class CompoundStyleImpl implements CompoundStyle {
    public readonly elStyleType = 'compound';
    constructor(
        public readonly key: CompoundStyleKey,
        public readonly head: SingleStyleImpl,
        public readonly children: SingleStyleImpl[],
    ) {}

    isHeadSameAsChildren(style: CSSProperties) {
        const headValue = this.head.getValue(style);
        const childrenValues = this.children.map((child) => child.getValue(style));
        return !childrenValues.every((value) => value === headValue);
    }
}
