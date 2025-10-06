import { type CodeAction } from '../actions/code';

export interface CodeDiffRequest {
    oid: string;
    branchId: string;
    attributes: Record<string, any>;
    textContent: string | null;
    overrideClasses: boolean | null;
    structureChanges: CodeAction[];
}

export interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}

export type FileToRequests = Map<
    string,
    {
        oidToRequest: Map<string, CodeDiffRequest>;
        content: string;
    }
>;

export interface CodePosition {
    line: number;
    column: number;
}

export interface CodeRange {
    start: CodePosition;
    end: CodePosition;
}

export interface CodeNavigationTarget {
    filePath: string;
    range: CodeRange;
}
