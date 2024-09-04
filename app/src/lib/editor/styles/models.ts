export interface ElementStyle {
    key: string;
    value: string;
    displayName: string;
    type: ElementStyleType;
    group: ElementStyleGroup;

    // Optional depending on types
    options?: string[];
    units?: string[];
    max?: number;
    subGroup?: ElementStyleSubGroup;
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
    Layout = 'Layout',
    Style = 'Styles',
    Text = 'Text',
    Effects = 'Effects',
}

export enum ElementStyleSubGroup {
    Corners = 'Corners',
    Margin = 'Margin',
    Padding = 'Padding',
    Border = 'Border',
    Shadow = 'Shadow',
    Display = 'Display',
}
