import type { SandboxAdapter, WatchEvent } from './interface';
import { SandboxProviderType } from '../providers/interface';
import { api } from '../../../../../trpc/client';

export class ServerSandboxAdapter implements SandboxAdapter {
    readonly providerType: string;
    readonly isConnecting: boolean = false;
    readonly session: any = null;
    
    private sandboxId: string = '';
    private userId: string = '';
    private currentProviderType: SandboxProviderType = SandboxProviderType.DAYTONA;
    private fileWatchers: Map<string, (event: WatchEvent) => void> = new Map();

    constructor(providerType: SandboxProviderType) {
        this.providerType = providerType;
        this.currentProviderType = providerType;
    }

    async start(sandboxId: string, userId: string): Promise<any> {
        this.sandboxId = sandboxId;
        this.userId = userId;

        try {
            const result = await api.sandbox.createSession.mutate({
                sandboxId,
                userId,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            if (!result.success) {
                throw new Error('Failed to create session');
            }

            return result.session;
        } catch (error) {
            console.error('Error starting sandbox session:', error);
            throw error;
        }
    }

    async hibernate(sandboxId: string): Promise<void> {
        try {
            await api.sandbox.stopSession.mutate({
                sessionId: this.userId,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });
        } catch (error) {
            console.error('Error hibernating sandbox:', error);
        }
    }

    async disconnect(): Promise<void> {
        try {
            await api.sandbox.stopSession.mutate({
                sessionId: this.userId,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });
        } catch (error) {
            console.error('Error disconnecting sandbox:', error);
        }
    }

    async readFile(path: string): Promise<string | null> {
        try {
            const result = await api.sandbox.readFile.query({
                sandboxId: this.sandboxId,
                path,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            if (!result.success) {
                console.error('Error reading file');
                return null;
            }

            return result.content;
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        try {
            const result = await api.sandbox.writeFile.mutate({
                sandboxId: this.sandboxId,
                path,
                content,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            return result.success;
        } catch (error) {
            console.error('Error writing file:', error);
            return false;
        }
    }

    async readBinaryFile(path: string): Promise<Uint8Array | null> {
        // For binary files, we'll need to implement a different approach
        // This could involve base64 encoding/decoding or using a different endpoint
        console.warn('Binary file reading not implemented in server adapter');
        return null;
    }

    async writeBinaryFile(path: string, content: Uint8Array): Promise<boolean> {
        // For binary files, we'll need to implement a different approach
        console.warn('Binary file writing not implemented in server adapter');
        return false;
    }

    async listFiles(dir: string): Promise<string[]> {
        try {
            const result = await api.sandbox.listFiles.query({
                sandboxId: this.sandboxId,
                dir,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            if (!result.success) {
                console.error('Error listing files');
                return [];
            }

            return result.directory.entries
                .filter((entry: { type: string }) => entry.type === 'file')
                .map((entry: { name: string }) => `${dir}/${entry.name}`.replace(/\/+/g, '/'));
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    async listFilesRecursively(
        dir: string, 
        ignore: string[] = [], 
        extensions: string[] = []
    ): Promise<string[]> {
        try {
            const result = await api.sandbox.listFilesRecursively.query({
                sandboxId: this.sandboxId,
                dir,
                ignore,
                extensions,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            if (!result.success) {
                console.error('Error listing files recursively');
                return [];
            }

            return result.files;
        } catch (error) {
            console.error('Error listing files recursively:', error);
            return [];
        }
    }

    async watchFiles(
        onFileChange: (event: WatchEvent) => Promise<void>, 
        excludePatterns: string[]
    ): Promise<void> {
        // Note: File watching is not directly supported in the server adapter
        // This would require WebSocket connections or polling
        console.warn('File watching not implemented in server adapter');
        
        // Store the callback for potential future implementation
        this.fileWatchers.set('default', onFileChange);
    }

    stopWatching(): void {
        this.fileWatchers.clear();
    }

    async runCommand(
        command: string, 
        streamCallback: (output: string) => void
    ): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        try {
            const result = await api.sandbox.runCommand.mutate({
                sandboxId: this.sandboxId,
                command,
                options: { name: 'command' },
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            if (!result.success) {
                return {
                    output: '',
                    success: false,
                    error: 'Command execution failed'
                };
            }

            const output = result.result.output || '';
            streamCallback(output);

            return {
                output,
                success: result.result.exitCode === 0,
                error: null
            };
        } catch (error) {
            console.error('Error running command:', error);
            return {
                output: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async downloadFiles(projectName?: string): Promise<{ downloadUrl: string; fileName: string } | null> {
        try {
            const result = await api.sandbox.downloadFiles.query({
                sandboxId: this.sandboxId,
                projectName,
                providerType: this.currentProviderType === SandboxProviderType.DAYTONA ? 'daytona' : 'codesandbox'
            });

            if (!result.success) {
                console.error('Error downloading files');
                return null;
            }

            return result.download;
        } catch (error) {
            console.error('Error downloading files:', error);
            return null;
        }
    }

    clear(): void {
        this.fileWatchers.clear();
        this.sandboxId = '';
        this.userId = '';
    }
} 