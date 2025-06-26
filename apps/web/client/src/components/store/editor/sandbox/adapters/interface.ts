import type { SandboxSession } from '../providers/interface';
import type { EditorEngine } from '../../engine';

export interface WatchEvent {
    type: 'add' | 'change' | 'remove';
    paths: string[];
}

export interface SandboxAdapter {
    readonly providerType: string;
    readonly isConnecting: boolean;
    readonly session: any;
    
    start(sandboxId: string, userId: string): Promise<SandboxSession>;
    hibernate(sandboxId: string): Promise<void>;
    disconnect(): Promise<void>;
    
    readFile(path: string): Promise<string | null>;
    writeFile(path: string, content: string): Promise<boolean>;
    readBinaryFile(path: string): Promise<Uint8Array | null>;
    writeBinaryFile(path: string, content: Uint8Array): Promise<boolean>;
    listFiles(dir: string): Promise<string[]>;
    listFilesRecursively(dir: string, ignore?: string[], extensions?: string[]): Promise<string[]>;
    
    watchFiles(onFileChange: (event: WatchEvent) => Promise<void>, excludePatterns: string[]): Promise<void>;
    stopWatching(): void;
    
    runCommand(command: string, streamCallback: (output: string) => void): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }>;
    
    downloadFiles(projectName?: string): Promise<{ downloadUrl: string; fileName: string } | null>;
    
    clear(): void;
} 