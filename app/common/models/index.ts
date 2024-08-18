import { TemplateNode } from './element/templateNode';

export interface CodeDiff {
    original: string;
    generated: string;
    templateNode: TemplateNode;
}

export interface StyleChangeParam {
    selector: string;
    templateNode: TemplateNode;
    tailwind: string;
    codeBlock: string;
}

export enum MouseAction {
    MOVE = 'move',
    CLICK = 'click',
}

export enum InsertPos {
    BEFORE = 'before',
    AFTER = 'after',
    PREPEND = 'prepend',
    APPEND = 'append',
}
