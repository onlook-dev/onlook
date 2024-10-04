export interface ElementStyleOptions {
    selectValues?: string[];
    units?: string[];
    max?: number;
    min?: number;
}
export interface ElementStyle {
    key: string;
    defaultValue: string;
    displayName: string;
    type: ElementStyleType;
    options?: ElementStyleOptions;
}

export enum ElementStyleType {
    Text = 'text',
    Dimensions = 'dimensions',
    Number = 'number',
    Select = 'select',
    Color = 'color',
}

export enum ElementStyleGroup {
    Size = 'Size',
    Position = 'Position & Dimensions',
    Layout = 'Flexbox & Layout',
    Style = 'Styles',
    Text = 'Text',
    Effects = 'Effects',
}

// export enum ElementStyleSubGroup {
//     Corners = 'Corners',
//     Margin = 'Margin',
//     Padding = 'Padding',
//     Border = 'Border',
//     Shadow = 'Shadow',
//     Display = 'Display',
// }

export interface ElementStyleSubGroup {
    key: string;
    head: ElementStyle;
    children: ElementStyle[];
}

export class ElementStyleSubGroupImpl implements ElementStyleSubGroup {
    constructor(
        public readonly key: string,
        public readonly head: ElementStyle,
        public readonly children: ElementStyle[],
    ) {}
}
