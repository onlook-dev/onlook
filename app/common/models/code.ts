import { InsertedElement } from './element/insert';
import { TemplateNode } from './element/templateNode';

export interface CodeDiff {
    original: string;
    generated: string;
    templateNode: TemplateNode;
}

export interface CodeChangeParam {
    selector: string;
    templateNode: TemplateNode;
    codeBlock: string;
    elements: InsertedElement[];
    attributes: Record<string, string>;
}

export interface StyleChangeParam {
    selector: string;
    templateNode: TemplateNode;
    codeBlock: string;
    tailwind: string;
}

export interface InsertChangeParam {
    templateNode: TemplateNode;
    codeBlock: string;
    element: InsertedElement;
}
