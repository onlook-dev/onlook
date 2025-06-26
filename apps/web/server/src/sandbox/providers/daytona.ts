import { Daytona, type Sandbox } from '@daytonaio/sdk';
import type { SandboxProvider, SandboxSession, SandboxDirectory, SandboxCommand } from '../types';

interface DaytonaSessionData {
    sessionId: string;
    sandbox: Sandbox;
    commands: Map<string, SandboxCommand>;
    lastActivity: Date;
}

export class DaytonaProvider implements SandboxProvider {
    readonly type = 'daytona' as const;
    private sdk: Daytona;
    private sessions: Map<string, DaytonaSessionData> = new Map();
    private _isConnecting = false;

    constructor(apiKey: string) {
        this.sdk = new Daytona({
            apiKey,
            apiUrl: 'https://api.daytona.app',
        });
    }

    get isConnecting(): boolean {
        return this._isConnecting;
    }

    async start(sandboxId: string, userId: string): Promise<SandboxSession> {
        this._isConnecting = true;
        try {
            const sandbox = await this.sdk.get(sandboxId);
            await this.sdk.start(sandbox);

            const sessionData = await this.createSession(sandbox, userId);
            this.sessions.set(sandboxId, sessionData);

            return {
                id: sessionData.sessionId,
                sandboxId,
                userId,
                status: 'running',
                createdAt: new Date(),
                lastActivity: new Date(),
            };
        } finally {
            this._isConnecting = false;
        }
    }

    async stop(sandboxId: string): Promise<void> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        await this.sdk.stop(sessionData.sandbox);
        this.sessions.delete(sandboxId);
    }

    async hibernate(sandboxId: string): Promise<void> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            return; // Already stopped
        }

        await this.sdk.stop(sessionData.sandbox);
        this.sessions.delete(sandboxId);
    }

    async readFile(sandboxId: string, path: string): Promise<string | null> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const buffer = await sessionData.sandbox.fs.downloadFile(path);
            return buffer.toString('utf-8');
        } catch (error) {
            console.error(`Error reading file ${path}:`, error);
            return null;
        }
    }

    async writeFile(sandboxId: string, path: string, content: string): Promise<boolean> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const buffer = Buffer.from(content, 'utf-8');
            await sessionData.sandbox.fs.uploadFile(buffer, path);
            sessionData.lastActivity = new Date();
            return true;
        } catch (error) {
            console.error(`Error writing file ${path}:`, error);
            return false;
        }
    }

    async readBinaryFile(sandboxId: string, path: string): Promise<Uint8Array | null> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const buffer = await sessionData.sandbox.fs.downloadFile(path);
            return new Uint8Array(buffer);
        } catch (error) {
            console.error(`Error reading binary file ${path}:`, error);
            return null;
        }
    }

    async writeBinaryFile(sandboxId: string, path: string, content: Uint8Array): Promise<boolean> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const buffer = Buffer.from(content);
            await sessionData.sandbox.fs.uploadFile(buffer, path);
            sessionData.lastActivity = new Date();
            return true;
        } catch (error) {
            console.error(`Error writing binary file ${path}:`, error);
            return false;
        }
    }

    async listFiles(sandboxId: string, dir: string): Promise<SandboxDirectory> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const files = await sessionData.sandbox.fs.listFiles(dir);
            return {
                path: dir,
                entries: files.map((file) => ({
                    name: file.name,
                    type: file.isDir ? 'directory' : 'file',
                })),
            };
        } catch (error) {
            console.error(`Error listing files in ${dir}:`, error);
            return { path: dir, entries: [] };
        }
    }

    async listFilesRecursively(
        sandboxId: string,
        dir: string,
        ignore: string[] = [],
        extensions: string[] = []
    ): Promise<string[]> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const files = await sessionData.sandbox.fs.listFiles(dir);
            const result: string[] = [];

            for (const file of files) {
                const fullPath = `${dir}/${file.name}`.replace(/\/+/g, '/');
                
                if (ignore.some(pattern => fullPath.includes(pattern))) {
                    continue;
                }

                if (file.isDir) {
                    const subFiles = await this.listFilesRecursively(sandboxId, fullPath, ignore, extensions);
                    result.push(...subFiles);
                } else {
                    // Check file extension if specified
                    if (extensions.length === 0 || extensions.some(ext => file.name.endsWith(ext))) {
                        result.push(fullPath);
                    }
                }
            }

            return result;
        } catch (error) {
            console.error(`Error listing files recursively in ${dir}:`, error);
            return [];
        }
    }

    async runCommand(sandboxId: string, command: string, options: { name?: string } = {}): Promise<SandboxCommand> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const response = await sessionData.sandbox['toolboxApi'].executeSessionCommand(
                sessionData.sandbox.id,
                sessionData.sessionId,
                {
                    command: command,
                    name: options.name || 'command',
                }
            );

            const commandResult: SandboxCommand = {
                id: response.data.id,
                command: command,
                exitCode: response.data.exitCode,
            };

            try {
                const logs = await sessionData.sandbox['toolboxApi'].getSessionCommandLogs(
                    sessionData.sandbox.id,
                    sessionData.sessionId,
                    commandResult.id
                );
                commandResult.output = logs.data;
            } catch (logError) {
                console.error('Error getting command logs:', logError);
            }

            sessionData.commands.set(commandResult.id, commandResult);
            sessionData.lastActivity = new Date();

            return commandResult;
        } catch (error) {
            console.error(`Error running command ${command}:`, error);
            return {
                id: `error-${Date.now()}`,
                command,
                exitCode: -1,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async downloadFiles(sandboxId: string, projectName?: string): Promise<{ downloadUrl: string; fileName: string } | null> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            // for now, return null as it's not directly supported
            return null;
        } catch (error) {
            console.error('Error downloading files:', error);
            return null;
        }
    }

    async disconnect(sandboxId: string): Promise<void> {
        await this.hibernate(sandboxId);
    }

    private async createSession(sandbox: Sandbox, userId: string): Promise<DaytonaSessionData> {
        const response = await sandbox['toolboxApi'].createSession(sandbox.id, {
            sessionId: userId.substring(0, 20), // Shorten UUID like CodeSandbox
        });

        return {
            sessionId: response.data.sessionId,
            sandbox,
            commands: new Map(),
            lastActivity: new Date(),
        };
    }
} 