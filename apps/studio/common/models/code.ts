import { CodeGroup, CodeInsert, CodeMove, CodeRemove, CodeUngroup } from './actions/code';
import { TemplateNode } from './element/templateNode';

export interface CodeDiffRequest {
    selector: string;
    templateNode: TemplateNode;
    attributes: Record<string, string>;
    textContent?: string;
    overrideClasses?: boolean;

    // Structual changes
    insertedElements: CodeInsert[];
    removedElements: CodeRemove[];
    movedElements: CodeMove[];
    groupElements: CodeGroup[];
    ungroupElements: CodeUngroup[];
}

export interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}
