export interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    modifiedTime?: Date;
    children?: FileEntry[];
}

export interface FileInfo {
    path: string;
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    size: number;
    createdTime: Date;
    modifiedTime: Date;
    accessedTime: Date;
}

export interface FileChangeEvent {
    type: 'create' | 'update' | 'delete' | 'rename';
    path: string;
    oldPath?: string;
}
