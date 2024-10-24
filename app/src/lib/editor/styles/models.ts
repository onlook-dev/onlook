export interface BaseStyle {
    key: string;
    elStyleType: string;
}
export interface CompoundStyle extends BaseStyle {
    key: CompoundStyleKey;
    head: SingleStyle;
    children: SingleStyle[];
    elStyleType: 'compound';
}

export interface SingleStyle extends BaseStyle {
    defaultValue: string;
    displayName: string;
    type: StyleType;
    params?: StyleParams;
    elStyleType: 'single';
    getValue(styleRecord: Record<string, string>): string;
}

export interface StyleParams {
    options?: string[];
    units?: string[];
    max?: number;
    min?: number;
}

export enum StyleType {
    Text = 'text',
    Dimensions = 'dimensions',
    Number = 'number',
    Select = 'select',
    Color = 'color',
}

export enum CompoundStyleKey {
    Margin = 'Margin',
    Padding = 'Padding',
    Corners = 'Corners',
    Border = 'Border',
    Display = 'Display',
}

export enum StyleGroupKey {
    Position = 'Position & Dimensions',
    Layout = 'Flexbox & Layout',
    Style = 'Styles',
    Text = 'Text',
}
