import { CodeGroup, CodeInsert, CodeMove, CodeRemove } from './actions/code';
import { TemplateNode } from './element/templateNode';

export interface CodeDiffRequest {
    selector: string;
    templateNode: TemplateNode;
    insertedElements: CodeInsert[];
    removedElements: CodeRemove[];
    movedElements: CodeMove[];
    groupElements: CodeGroup[];
    attributes: Record<string, string>;
    textContent?: string;
    overrideClasses?: boolean;
}

export interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}
