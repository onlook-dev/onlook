//mock implemtation os codesandbox provider

import { WebSocketSession } from '@codesandbox/sdk';
import type { SandboxProvider, SandboxSession, SandboxDirectory, SandboxCommand } from '../types';

interface CodeSandboxSessionData {
    sessionId: string;
    session: WebSocketSession;
    commands: Map<string, SandboxCommand>;
    lastActivity: Date;
}

export class CodeSandboxProvider implements SandboxProvider {
    readonly type = 'codesandbox' as const;
    private sessions: Map<string, CodeSandboxSessionData> = new Map();
    private _isConnecting = false;

    get isConnecting(): boolean {
        return this._isConnecting;
    }

    async start(sandboxId: string, userId: string): Promise<SandboxSession> {
        this._isConnecting = true;
        try {
            // Note: This would need to be implemented based on the actual CodeSandbox SDK
            // For now, we'll create a mock session
            const session = {} as WebSocketSession; // Placeholder
            const sessionData: CodeSandboxSessionData = {
                sessionId: userId,
                session,
                commands: new Map(),
                lastActivity: new Date(),
            };

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

        await sessionData.session.disconnect();
        this.sessions.delete(sandboxId);
    }

    async hibernate(sandboxId: string): Promise<void> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            return; // Already stopped
        }

        await sessionData.session.disconnect();
        this.sessions.delete(sandboxId);
    }

    async readFile(sandboxId: string, path: string): Promise<string | null> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            return await sessionData.session.fs.readTextFile(path);
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
            await sessionData.session.fs.writeTextFile(path, content);
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
            return await sessionData.session.fs.readFile(path);
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
            await sessionData.session.fs.writeFile(path, content);
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
            const entries = await sessionData.session.fs.readdir(dir);
            return {
                path: dir,
                entries: entries.map((entry: any) => ({
                    name: entry.name,
                    type: entry.type,
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
            const result: string[] = [];
            await this.recursiveListFiles(sessionData.session, dir, result, ignore, extensions);
            return result;
        } catch (error) {
            console.error(`Error listing files recursively in ${dir}:`, error);
            return [];
        }
    }

    private async recursiveListFiles(
        session: any,
        dir: string,
        result: string[],
        ignore: string[],
        extensions: string[]
    ): Promise<void> {
        try {
            const entries = await session.fs.readdir(dir);
            
            for (const entry of entries) {
                const fullPath = `${dir}/${entry.name}`.replace(/\/+/g, '/');
                
                if (ignore.some(pattern => fullPath.includes(pattern))) {
                    continue;
                }

                if (entry.type === 'directory') {
                    await this.recursiveListFiles(session, fullPath, result, ignore, extensions);
                } else {
                    if (extensions.length === 0 || extensions.some(ext => entry.name.endsWith(ext))) {
                        result.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dir}:`, error);
        }
    }

    async runCommand(sandboxId: string, command: string, options: { name?: string } = {}): Promise<SandboxCommand> {
        const sessionData = this.sessions.get(sandboxId);
        if (!sessionData) {
            throw new Error(`Session not found for sandbox ${sandboxId}`);
        }

        try {
            const task = await sessionData.session.commands.runBackground(command, {
                name: options.name || 'command',
            });

            const commandResult: SandboxCommand = {
                id: `cmd-${Date.now()}`,
                command,
                exitCode: 0, 
            };


            try {
                const output = await task.waitUntilComplete();
                commandResult.output = output;
            } catch (outputError) {
                console.error('Error getting command output:', outputError);
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
            const download = await sessionData.session.fs.download('./');
            return {
                downloadUrl: download.downloadUrl,
                fileName: projectName || `sandbox-${sandboxId}.zip`,
            };
        } catch (error) {
            console.error('Error downloading files:', error);
            return null;
        }
    }

    async disconnect(sandboxId: string): Promise<void> {
        await this.hibernate(sandboxId);
    }
} 