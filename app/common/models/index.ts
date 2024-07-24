import { TemplateNode } from './elements/templateNode';

export interface StyleChangeParam {
    selector: string;
    templateNode: TemplateNode;
    tailwind: string;
    codeBlock: string;
}

export interface StyleCodeDiff {
    original: string;
    generated: string;
    param: StyleChangeParam;
}
