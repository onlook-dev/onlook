import { ElementStyle, ElementStyleOptions, ElementStyleType } from './models';

export class ElementStyleImpl implements ElementStyle {
    constructor(
        public readonly key: string,
        public readonly defaultValue: string,
        public readonly displayName: string,
        public readonly type: ElementStyleType,
        public readonly option?: ElementStyleOptions,
    ) {}
}
