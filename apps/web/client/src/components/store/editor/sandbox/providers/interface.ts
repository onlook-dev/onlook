// Terminal and Task interfaces for type safety
export interface TerminalInterface {
    onOutput: (callback: (data: string) => void) => void;
    write: (data: string) => void;
    open: () => Promise<string>;
    kill: () => void;
}

export interface TaskInterface {
    open: () => Promise<string>;
    onOutput: (callback: (data: string) => void) => { dispose: () => void };
}

export interface TerminalsInterface {
    create: () => Promise<TerminalInterface>;
}

export interface TasksInterface {
    get: (name: string) => TaskInterface | undefined;
}

export interface SandboxSession {
    fs: {
        readTextFile: (path: string) => Promise<string>;
        writeTextFile: (path: string, content: string) => Promise<void>;
        readFile: (path: string) => Promise<Uint8Array>;
        writeFile: (path: string, content: Uint8Array) => Promise<void>;
        readdir: (path: string) => Promise<Array<{ name: string; type: 'file' | 'directory' }>>;
        watch: (path: string) => Promise<{
            onEvent: (callback: (event: any) => void) => void;
            dispose: () => void;
        }>;
        download: (path: string) => Promise<{ downloadUrl: string }>;
    };
    commands: {
        runBackground: (command: string, options: { name: string }) => Promise<{
            open: () => Promise<void>;
            onOutput: (callback: (output: string) => void) => { dispose: () => void };
            waitUntilComplete: () => Promise<string>;
        }>;
    };
    // For backward compatibility with original CodeSandbox implementation
    terminals?: TerminalsInterface;
    tasks?: TasksInterface;
    reconnect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

export interface SandboxProvider {
    start: (sandboxId: string, userId: string) => Promise<SandboxSession>;
    hibernate: (sandboxId: string) => Promise<void>;
    list: () => Promise<any>;
    fork: (sandboxId: string) => Promise<{ sandboxId: string; previewUrl: string }>;
    delete: (sandboxId: string) => Promise<void>;
}


// Mock daytona sdk
export interface DaytonaClient {
    workspaces: {
        resume: (workspaceId: string) => Promise<DaytonaWorkspace>;
        create: (options: { templateId: string }) => Promise<DaytonaWorkspace>;
        list: () => Promise<DaytonaWorkspace[]>;
        hibernate: (workspaceId: string) => Promise<void>;
        delete: (workspaceId: string) => Promise<void>;
    };
}

export interface DaytonaWorkspace {
    id: string;
    createSession: (options: { userId: string }) => Promise<DaytonaSession>;
}

export interface DaytonaSession {
    filesystem: {
        readTextFile: (path: string) => Promise<string>;
        writeTextFile: (path: string, content: string) => Promise<void>;
        readFile: (path: string) => Promise<Uint8Array>;
        writeFile: (path: string, content: Uint8Array) => Promise<void>;
        readdir: (path: string) => Promise<Array<{ name: string; type: 'file' | 'directory' }>>;
        watch: (path: string) => Promise<DaytonaWatcher>;
        download: (path: string) => Promise<{ downloadUrl: string }>;
    };
    terminal: {
        runCommand: (command: string, options: { name: string }) => Promise<DaytonaCommand>;
    };
    reconnect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

export interface DaytonaWatcher {
    onEvent: (callback: (event: any) => void) => void;
    dispose: () => void;
}

interface DaytonaCommand {
    open: () => Promise<void>;
    onOutput: (callback: (output: string) => void) => { dispose: () => void };
    waitUntilComplete: () => Promise<string>;
}

export enum SandboxProviderType {
    CODESANDBOX = 'codesandbox',
    DAYTONA = 'daytona',
} 