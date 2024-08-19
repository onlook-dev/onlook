import { InsertedElement } from './element/insert';
import { TemplateNode } from './element/templateNode';

export interface CodeDiffRequest {
    selector: string;
    templateNode: TemplateNode;
    codeBlock: string;
    elements: InsertedElement[];
    attributes: Record<string, string>;
}

export interface CodeDiff {
    original: string;
    generated: string;
    templateNode: TemplateNode;
}
