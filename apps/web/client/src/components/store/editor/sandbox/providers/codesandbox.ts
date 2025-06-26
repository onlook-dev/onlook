import { CodeSandbox } from '@codesandbox/sdk';
import type { WebSocketSession } from '@codesandbox/sdk';
import type { SandboxProvider, SandboxSession } from './interface';


export class CodeSandboxProvider implements SandboxProvider {
    private sdk: CodeSandbox;

    constructor(apiKey: string) {
        this.sdk = new CodeSandbox(apiKey);
    }

    async start(sandboxId: string, userId: string): Promise<SandboxSession> {
        const startData = await this.sdk.sandboxes.resume(sandboxId);
        const session = await startData.createBrowserSession({
            id: userId.substring(0, 20) // Shorten UUID for CodeSandbox
        });
        
        return this.wrapSession(session);
    }

    async hibernate(sandboxId: string): Promise<void> {
        await this.sdk.sandboxes.hibernate(sandboxId);
    }

    async list(): Promise<any> {
        return await this.sdk.sandboxes.list();
    }

    async fork(sandboxId: string): Promise<{ sandboxId: string; previewUrl: string }> {
        const sandbox = await this.sdk.sandboxes.create({
            source: 'template',
            id: sandboxId,
        });
        return {
            sandboxId: sandbox.id,
            previewUrl: `https://${sandbox.id}-8084.csb.app`,
        };
    }

    async delete(sandboxId: string): Promise<void> {
        await this.sdk.sandboxes.shutdown(sandboxId);
    }

    private wrapSession(session: WebSocketSession): SandboxSession {
        return {
            fs: {
                readTextFile: async (path: string) => {
                    return await session.fs.readTextFile(path);
                },
                writeTextFile: async (path: string, content: string) => {
                    await session.fs.writeTextFile(path, content);
                },
                readFile: async (path: string) => {
                    return await session.fs.readFile(path);
                },
                writeFile: async (path: string, content: Uint8Array) => {
                    await session.fs.writeFile(path, content);
                },
                readdir: async (path: string) => {
                    return await session.fs.readdir(path);
                },
                watch: async (path: string) => {
                    const watcher = await session.fs.watch(path);
                    return {
                        onEvent: (callback: (event: any) => void) => {
                            watcher.onEvent(callback);
                        },
                        dispose: () => {
                            watcher.dispose();
                        }
                    };
                },
                download: async (path: string) => {
                    return await session.fs.download(path);
                }
            },
            commands: {
                runBackground: async (command: string, options: { name: string }) => {
                    const cmd = await session.commands.runBackground(command, options);
                    return {
                        open: async () => {
                            await cmd.open();
                        },
                        onOutput: (callback: (output: string) => void) => {
                            return cmd.onOutput(callback);
                        },
                        waitUntilComplete: async () => {
                            return await cmd.waitUntilComplete();
                        }
                    };
                }
            },
            terminals: session.terminals,
            tasks: session.tasks,
            reconnect: async () => {
                await session.reconnect();
            },
            disconnect: async () => {
                await session.disconnect();
            }
        };
    }
} 