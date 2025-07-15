import { env } from '@/env';
import { Sandbox } from '@e2b/sdk';
import { getSandboxPreviewUrl } from '@onlook/constants';
import { shortenUuid } from '@onlook/utility/src/id';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const sandboxRouter = createTRPCRouter({
    start: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
                userId: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            // Connect to existing E2B sandbox
            const sandbox = await Sandbox.create({
                id: input.sandboxId,
                apiKey: env.E2B_API_KEY,
            });
            
            // Return E2B sandbox connection info
            return {
                sandboxId: sandbox.sandboxId,
                url: getSandboxPreviewUrl(sandbox.sandboxId, 3000),
                sessionId: shortenUuid(input.userId ?? uuidv4(), 20),
            };
        }),
    hibernate: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            // E2B sandboxes are automatically cleaned up
            // For now, we'll just mark it as hibernated
            const sandbox = await Sandbox.create({
                id: input.sandboxId,
                apiKey: env.E2B_API_KEY,
            });
            await sandbox.kill();
        }),
    list: protectedProcedure.query(async () => {
        // E2B doesn't have a direct list API, return empty for now
        // This would need to be tracked in your database
        return [];
    }),
    fork: protectedProcedure
        .input(
            z.object({
                sandbox: z.object({
                    id: z.string(),
                    port: z.number(),
                }),
                config: z
                    .object({
                        title: z.string().optional(),
                        tags: z.array(z.string()).optional(),
                        private: z.boolean().optional(),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ input }) => {
            // Create a new E2B sandbox
            const sandbox = await Sandbox.create({
                template: input.sandbox.id,
                apiKey: env.E2B_API_KEY,
                metadata: {
                    title: input.config?.title,
                    tags: input.config?.tags,
                },
            });

            const previewUrl = getSandboxPreviewUrl(sandbox.sandboxId, input.sandbox.port);

            return {
                sandboxId: sandbox.sandboxId,
                previewUrl,
            };
        }),
    downloadFiles: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
                folderPath: z.string().default('/'),
            }),
        )
        .mutation(async ({ input }) => {
            const sandbox = await Sandbox.create({
                id: input.sandboxId,
                apiKey: env.E2B_API_KEY,
            });

            // E2B doesn't have a direct download URL API
            // You would need to implement file archiving and download
            const files = await sandbox.filesystem.list(input.folderPath);
            
            // For now, return a placeholder
            return {
                downloadUrl: `https://download.e2b.dev/${input.sandboxId}/files.zip`,
                files: files.map(f => f.path),
            };
        }),
});
