import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// For now, we'll create a simple proxy to the server-side sandbox
// This will be replaced with actual server-side calls when the server is running
export const sandboxRouter = createTRPCRouter({
    createSession: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            userId: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            // This would call the actual server-side sandbox manager
            // For now, return a mock response
            return {
                success: true,
                session: {
                    id: input.userId,
                    sandboxId: input.sandboxId,
                    userId: input.userId,
                    status: 'running' as const,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                }
            };
        }),

    getSession: protectedProcedure
        .input(z.string())
        .query(async ({ input }) => {
            // Mock response
            return {
                success: true,
                session: {
                    id: input,
                    sandboxId: 'mock-sandbox',
                    userId: input,
                    status: 'running' as const,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                }
            };
        }),

    stopSession: protectedProcedure
        .input(z.object({
            sessionId: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            // Mock response
            return { success: true, message: 'Session stopped successfully' };
        }),

    readFile: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            path: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            // Mock response
            return {
                success: true,
                content: `// Mock content for ${input.path}`,
                exists: true
            };
        }),

    writeFile: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            path: z.string(),
            content: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            // Mock response
            return { success: true, message: 'File written successfully' };
        }),

    listFiles: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            dir: z.string().default('./'),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            // Mock response
            return {
                success: true,
                directory: {
                    path: input.dir,
                    entries: [
                        { name: 'package.json', type: 'file' as const },
                        { name: 'src', type: 'directory' as const },
                        { name: 'README.md', type: 'file' as const },
                    ]
                }
            };
        }),

    listFilesRecursively: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            dir: z.string().default('./'),
            ignore: z.array(z.string()).default([]),
            extensions: z.array(z.string()).default([]),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            // Mock response
            return {
                success: true,
                files: [
                    'package.json',
                    'src/index.ts',
                    'src/components/App.tsx',
                    'README.md'
                ]
            };
        }),

    runCommand: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            command: z.string(),
            options: z.object({
                name: z.string().optional()
            }).optional(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            // Mock response
            return {
                success: true,
                result: {
                    id: `cmd-${Date.now()}`,
                    command: input.command,
                    exitCode: 0,
                    output: `Mock output for command: ${input.command}`,
                }
            };
        }),

    downloadFiles: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            projectName: z.string().optional(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .query(async ({ input }) => {
            // Mock response
            return {
                success: true,
                download: {
                    downloadUrl: 'https://example.com/download.zip',
                    fileName: input.projectName || `sandbox-${input.sandboxId}.zip`
                }
            };
        }),

    status: protectedProcedure
        .input(z.object({
            sessionId: z.string().optional(),
            providerType: z.enum(['codesandbox', 'daytona']).optional()
        }))
        .query(async ({ input }) => {
            // Mock response
            return {
                success: true,
                activeSessions: 1,
                sessions: [
                    {
                        id: 'mock-session',
                        status: 'running' as const,
                        lastActivity: new Date()
                    }
                ],
                timestamp: new Date().toISOString()
            };
        }),

    cleanup: protectedProcedure
        .mutation(async () => {
            // Mock response
            return { success: true, message: 'Cleanup completed successfully' };
        }),

    fork: protectedProcedure
        .input(z.object({
            sandboxId: z.string(),
            providerType: z.enum(['codesandbox', 'daytona'])
        }))
        .mutation(async ({ input }) => {
            // Mock response
            return {
                sandboxId: `forked-${input.sandboxId}`,
                previewUrl: `https://${input.sandboxId}.codesandbox.io`
            };
        }),
});
