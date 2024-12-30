import {
    type CodeGroup,
    type CodeInsert,
    type CodeMove,
    type CodeRemove,
    type CodeUngroup,
} from '../actions/code';

export interface CodeDiffRequest {
    oid: string;
    attributes: Record<string, string>;
    textContent: string | null;
    overrideClasses: boolean | null;

    // Structural changes
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
