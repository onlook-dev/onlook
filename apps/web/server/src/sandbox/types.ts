export interface SandboxFile {
    path: string;
    content: string;
    isBinary?: boolean;
    binaryContent?: Uint8Array;
}

export interface SandboxDirectory {
    path: string;
    entries: Array<{
        name: string;
        type: 'file' | 'directory';
    }>;
}

export interface SandboxCommand {
    id: string;
    command: string;
    exitCode?: number;
    output?: string;
    error?: string;
}

export interface SandboxSession {
    id: string;
    sandboxId: string;
    userId: string;
    status: 'running' | 'stopped' | 'error';
    createdAt: Date;
    lastActivity: Date;
}

export interface FileWatchEvent {
    type: 'add' | 'change' | 'remove';
    paths: string[];
    timestamp: number;
}

export interface SandboxProvider {
    readonly type: 'codesandbox' | 'daytona';
    readonly isConnecting: boolean;
    
    start(sandboxId: string, userId: string): Promise<SandboxSession>;
    stop(sandboxId: string): Promise<void>;
    hibernate(sandboxId: string): Promise<void>;
    
    // File operations
    readFile(sandboxId: string, path: string): Promise<string | null>;
    writeFile(sandboxId: string, path: string, content: string): Promise<boolean>;
    readBinaryFile(sandboxId: string, path: string): Promise<Uint8Array | null>;
    writeBinaryFile(sandboxId: string, path: string, content: Uint8Array): Promise<boolean>;
    listFiles(sandboxId: string, dir: string): Promise<SandboxDirectory>;
    listFilesRecursively(sandboxId: string, dir: string, ignore?: string[], extensions?: string[]): Promise<string[]>;
    
    // Command execution
    runCommand(sandboxId: string, command: string, options?: { name?: string }): Promise<SandboxCommand>;
    
    // File download
    downloadFiles(sandboxId: string, projectName?: string): Promise<{ downloadUrl: string; fileName: string } | null>;
    
    // Cleanup
    disconnect(sandboxId: string): Promise<void>;
}

export interface SandboxManager {
    getProvider(type: 'codesandbox' | 'daytona'): SandboxProvider;
    createSession(sandboxId: string, userId: string, providerType: 'codesandbox' | 'daytona'): Promise<SandboxSession>;
    getSession(sessionId: string): SandboxSession | null;
    listSessions(): SandboxSession[];
    cleanupSessions(): Promise<void>;
} 