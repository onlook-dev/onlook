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

export type FileToRequests = Map<
    string,
    {
        oidToRequest: Map<string, CodeDiffRequest>;
        content: string;
    }
>;

export interface FileNode {
    id: string;
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
    extension?: string;
}
