import { CompoundElementStyleKey } from './group';
import {
    CompoundElementStyle,
    ElementStyle,
    ElementStyleOptions,
    ElementStyleType,
} from './models';

export class ElementStyleImpl implements ElementStyle {
    public readonly elStyleType = 'single';
    constructor(
        public readonly key: string,
        public readonly defaultValue: string,
        public readonly displayName: string,
        public readonly type: ElementStyleType,
        public readonly option?: ElementStyleOptions,
    ) {}
}

export class CompoundElementStyleImpl implements CompoundElementStyle {
    public readonly elStyleType = 'compound';
    constructor(
        public readonly key: CompoundElementStyleKey,
        public readonly head: ElementStyle,
        public readonly children: ElementStyle[],
    ) {}
}
