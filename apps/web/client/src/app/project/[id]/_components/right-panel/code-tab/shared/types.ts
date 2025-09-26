export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    depth?: number;
    parentPath?: string | null;
}

export interface EditorFile {
    path: string;
    type: 'text' | 'binary';
    content: string | Uint8Array;
    isDirty: boolean;
    originalContent?: string;
}

export interface TextEditorFile extends EditorFile {
    type: 'text';
    content: string;
    originalContent: string;
    isDirty: boolean;
}

// Readonly, no need to dirty or saved content
export interface BinaryEditorFile extends EditorFile {
    type: 'binary';
    content: Uint8Array;
    isDirty: false;
}