interface BaseSandboxFile {
    type: 'text' | 'binary';
    path: string;
    content: string | Uint8Array | null;
}

export interface TextSandboxFile extends BaseSandboxFile {
    type: 'text';
    content: string;
}

export interface BinarySandboxFile extends BaseSandboxFile {
    type: 'binary';
    content: Uint8Array | null;
}

export type SandboxFile = TextSandboxFile | BinarySandboxFile;

export type SandboxDirectory = {
    type: 'directory';
    path: string;
};
