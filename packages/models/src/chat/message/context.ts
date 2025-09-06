import type { Branch } from '../../project';

export enum MessageContextType {
    FILE = 'file',
    HIGHLIGHT = 'highlight',
    IMAGE = 'image',
    ERROR = 'error',
    PROJECT = 'project',
    BRANCH = 'branch',
}

type BaseMessageContext = {
    type: MessageContextType;
    content: string;
    displayName: string;
};

export type BranchMessageContext = BaseMessageContext & {
    type: MessageContextType.BRANCH;
    branch: Branch;
};

export type FileMessageContext = BaseMessageContext & {
    type: MessageContextType.FILE;
    path: string;
    branchId: string;
};

export type HighlightMessageContext = BaseMessageContext & {
    type: MessageContextType.HIGHLIGHT;
    path: string;
    start: number;
    end: number;
    oid?: string;
    branchId: string;
};

export type ImageMessageContext = BaseMessageContext & {
    type: MessageContextType.IMAGE;
    mimeType: string;
};

export type ErrorMessageContext = BaseMessageContext & {
    type: MessageContextType.ERROR;
    branchId: string;
};

export type ProjectMessageContext = BaseMessageContext & {
    type: MessageContextType.PROJECT;
    path: string;
};

export type MessageContext =
    | HighlightMessageContext
    | ImageMessageContext
    | ErrorMessageContext
    | ProjectMessageContext
    | BranchMessageContext
    | FileMessageContext;
