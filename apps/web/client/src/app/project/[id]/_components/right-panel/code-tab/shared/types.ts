export interface EditorFile {
    path: string;
    type: 'text' | 'binary';
    content: string | Uint8Array;
}

export interface TextEditorFile extends EditorFile {
    type: 'text';
    content: string;
    originalHash: string;
}

// Readonly, no need to dirty or saved content
export interface BinaryEditorFile extends EditorFile {
    type: 'binary';
    content: Uint8Array;
}