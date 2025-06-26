import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { ServerSandboxManager } from '../../sandbox/manager';

// Initialize the sandbox manager
const sandboxManager = new ServerSandboxManager();

export const sandboxRouter = router({
    // Session management
    createSession: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            userId: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            try {
                const session = await sandboxManager.createSession(
                    input.sandboxId,
                    input.userId,
                    input.providerType
                );
                return { success: true, session };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    getSession: publicProcedure
        .input(z.string())
        .query(({ input }) => {
            const session = sandboxManager.getSession(input);
            return session ? { success: true, session } : { success: false, error: 'Session not found' };
        }),

    listSessions: publicProcedure
        .query(() => {
            const sessions = sandboxManager.listSessions();
            return { success: true, sessions };
        }),

    stopSession: publicProcedure
        .input(z.object({
            sessionId: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                await provider.stop(input.sessionId);
                return { success: true, message: 'Session stopped successfully' };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    // File operations
    readFile: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            path: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                const content = await provider.readFile(input.sandboxId, input.path);
                return { 
                    success: true, 
                    content: content || '',
                    exists: content !== null 
                };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    writeFile: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            path: z.string(),
            content: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                const success = await provider.writeFile(input.sandboxId, input.path, input.content);
                return { success, message: success ? 'File written successfully' : 'Failed to write file' };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    listFiles: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            dir: z.string().default('./'),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                const directory = await provider.listFiles(input.sandboxId, input.dir);
                return { success: true, directory };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    listFilesRecursively: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            dir: z.string().default('./'),
            ignore: z.array(z.string()).default([]),
            extensions: z.array(z.string()).default([]),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                const files = await provider.listFilesRecursively(
                    input.sandboxId,
                    input.dir,
                    input.ignore,
                    input.extensions
                );
                return { success: true, files };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    // Command execution
    runCommand: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            command: z.string(),
            options: z.object({
                name: z.string().optional()
            }).optional(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                const result = await provider.runCommand(
                    input.sandboxId,
                    input.command,
                    input.options
                );
                return { success: true, result };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    // File download
    downloadFiles: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            projectName: z.string().optional(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            try {
                const provider = sandboxManager.getProvider(input.providerType);
                const download = await provider.downloadFiles(input.sandboxId, input.projectName);
                return { success: true, download };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),

    // Status and health
    status: publicProcedure
        .input(z.object({
            sessionId: z.string().optional(),
            providerType: z.enum(['codesandbox', 'daytona']).optional()
        }))
        .query(({ input }) => {
            if (input.sessionId) {
                const session = sandboxManager.getSession(input.sessionId);
                return {
                    success: true,
                    session,
                    timestamp: new Date().toISOString()
                };
            }

            const sessions = sandboxManager.listSessions();
            return {
                success: true,
                activeSessions: sessions.length,
                sessions: sessions.map(s => ({
                    id: s.id,
                    status: s.status,
                    lastActivity: s.lastActivity
                })),
                timestamp: new Date().toISOString()
            };
        }),

    // Cleanup
    cleanup: publicProcedure
        .mutation(async () => {
            try {
                await sandboxManager.cleanupSessions();
                return { success: true, message: 'Cleanup completed successfully' };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        }),
});
