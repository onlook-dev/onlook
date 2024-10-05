import { CompoundElementStyleKey } from './group';

export enum ElementStyleGroup {
    Position = 'Position & Dimensions',
    Layout = 'Flexbox & Layout',
    Style = 'Styles',
    Text = 'Text',
}

export interface BaseElementStyle {
    key: string;
    elStyleType: string;
}
export interface CompoundElementStyle extends BaseElementStyle {
    key: CompoundElementStyleKey;
    head: ElementStyle;
    children: ElementStyle[];
    elStyleType: 'compound';
}

export interface ElementStyle extends BaseElementStyle {
    defaultValue: string;
    displayName: string;
    type: ElementStyleType;
    options?: ElementStyleOptions;
    elStyleType: 'single';
}

export interface ElementStyleOptions {
    selectValues?: string[];
    units?: string[];
    max?: number;
    min?: number;
}
export enum ElementStyleType {
    Text = 'text',
    Dimensions = 'dimensions',
    Number = 'number',
    Select = 'select',
    Color = 'color',
}
