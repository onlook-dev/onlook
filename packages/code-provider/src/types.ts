import type {
    CREATE_FILE_TOOL_PARAMETERS,
    EDIT_FILE_TOOL_PARAMETERS,
    LIST_FILES_TOOL_PARAMETERS,
    READ_FILES_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_PARAMETERS,
} from '@onlook/ai';
import type { SandboxFile } from '@onlook/models';
import type { z } from 'zod';

export interface CreateFileInput {
    // args: z.infer<typeof CREATE_FILE_TOOL_PARAMETERS>;
    // args above does not support Uint8Array
    args: {
        path: string;
        content: string | Uint8Array;
    };
}
export interface CreateFileOutput {}

export interface EditFileInput {
    args: z.infer<typeof EDIT_FILE_TOOL_PARAMETERS>;
    applyDiff: (args: {
        originalCode: string;
        updateSnippet: string;
        instruction: string;
    }) => Promise<{
        result: string;
        error: string | null;
    }>;
}
export interface EditFileOutput {}

export interface StatFileInput {
    args: {
        path: string;
    };
}

export interface StatFileOutput {
    type: 'file' | 'directory';
}

export interface RenameFileInput {
    args: {
        oldPath: string;
        newPath: string;
    };
}
export interface RenameFileOutput {}

export interface ListFilesInput {
    args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>;
}
export interface ListFilesOutputFile {
    path: string;
    type: 'file' | 'directory';
}
export interface ListFilesOutput {
    files: ListFilesOutputFile[];
}

export interface ReadFilesInput {
    args: z.infer<typeof READ_FILES_TOOL_PARAMETERS>;
}
export type ReadFilesOutputFile = SandboxFile & { toString: () => string };
export interface ReadFilesOutput {
    files: ReadFilesOutputFile[];
}

export interface DeleteFilesInput {
    args: {
        path: string;
        recursive?: boolean;
    };
}
export interface DeleteFilesOutput {}

export interface TerminalCommandInput {
    args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>;
}
export interface TerminalCommandOutputs {
    output: string;
}

export interface DownloadFilesInput {
    args: {
        path: string;
    };
}
export interface DownloadFilesOutput {
    url?: string;
}

export interface CopyFilesInput {
    args: {
        sourcePath: string;
        targetPath: string;
        recursive?: boolean;
        overwrite?: boolean;
    };
}
export interface CopyFileOutput {}

export interface WatchEvent {
    type: 'add' | 'change' | 'remove';
    paths: string[];
}

export interface WatchFilesInput {
    args: {
        path: string;
        recursive?: boolean;
        excludes?: string[];
        onFileChange?: (event: WatchEvent) => Promise<void>;
    };
}
export interface WatchFilesOutput {
    watcher: ProviderFileWatcher;
}

export abstract class Provider {
    abstract createFile(input: CreateFileInput): Promise<CreateFileOutput>;
    abstract editFile(input: EditFileInput): Promise<EditFileOutput>;
    abstract renameFile(input: RenameFileInput): Promise<RenameFileOutput>;
    abstract statFile(input: StatFileInput): Promise<StatFileOutput>;
    abstract deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput>;
    abstract listFiles(input: ListFilesInput): Promise<ListFilesOutput>;
    abstract readFiles(input: ReadFilesInput): Promise<ReadFilesOutput>;
    abstract runTerminalCommand(input: TerminalCommandInput): Promise<TerminalCommandOutputs>;
    abstract downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput>;
    abstract copyFiles(input: CopyFilesInput): Promise<CopyFileOutput>;
    abstract watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput>;

    /**
     * `Provider` is meant to be a singleton; this method is called when the first instance is created.
     * Use this to establish a connection or run operations that requires I/O.
     */
    abstract initialize(): void | Promise<void>;

    abstract reload(): Promise<boolean>;
    abstract reconnect(): Promise<void>;
    abstract ping(): Promise<boolean>;
    abstract destroy(): Promise<void>;
}

export abstract class ProviderFileWatcher {
    abstract start(input: WatchFilesInput): Promise<void>;
    abstract stop(): Promise<void>;
    abstract registerEventCallback(callback: (event: WatchEvent) => Promise<void>): void;
}
