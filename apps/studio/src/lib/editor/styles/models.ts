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
    Image = 'image',
    Font = 'font',
}

export enum CompoundStyleKey {
    Margin = 'Margin',
    Padding = 'Padding',
    Corners = 'Corners',
    Border = 'Border',
    Display = 'Display',
    Fill = 'Fill',
    Position = 'Position',
}

export enum StyleGroupKey {
    Position = 'position',
    Layout = 'layout',
    Style = 'style',
    Text = 'text',
}
