import { type CodeAction } from '../actions/code';

export interface CodeDiffRequest {
    oid: string;
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

export type RequestsByPath = Map<string, RequestsByOid>;

export interface RequestsByOid {
    oidToCodeDiff: Map<string, CodeDiffRequest>;
    codeBlock: string;
}
