import { previewDomains, publishedDomains } from '@onlook/db';
import { TRPCError } from '@trpc/server';
import { and, eq, inArray, ne } from 'drizzle-orm';
import type { FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { prepareDirForDeployment } from 'freestyle-sandboxes/utils';
import extract from 'extract-zip';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { initializeFreestyleSdk } from './freestyle';
import { downloadFileFromStorage } from '@/utils/supabase/server';

export const previewRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const preview = await ctx.db.query.previewDomains.findMany({
            where: eq(previewDomains.projectId, input.projectId),
        });
        return preview;
    }),
    create: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        // Check if the domain is already taken by another project
        // This should never happen, but just in case
        const existing = await ctx.db.query.previewDomains.findFirst({
            where: and(eq(previewDomains.fullDomain, input.domain), ne(previewDomains.projectId, input.projectId)),
        });

        if (existing) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Domain already taken',
            });
        }

        const [preview] = await ctx.db.insert(previewDomains).values({
            fullDomain: input.domain,
            projectId: input.projectId,
        }).returning({
            fullDomain: previewDomains.fullDomain,
        });

        if (!preview) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Failed to create preview domain, no preview domain returned',
            });
        }

        return {
            domain: preview.fullDomain,
        }
    }),
    publish: protectedProcedure
        .input(
            z.object({
                type: z.enum(['preview', 'custom']),
                projectId: z.string(),
                storagePath: z.object({ bucket: z.string(), path: z.string() }).optional(),
                files: z.record(z.string(), z.object({
                    content: z.string(),
                    encoding: z.string().optional(),
                })).optional(),
                config: z.object({
                    domains: z.array(z.string()),
                    entrypoint: z.string().optional(),
                    envVars: z.record(z.string(), z.string()).optional(),
                }),
            }).refine(data => data.storagePath || data.files, {
                message: 'Either storagePath or files must be provided',
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (input.type === 'preview') {
                const preview = await ctx.db.query.previewDomains.findFirst({
                    where: and(
                        eq(previewDomains.projectId, input.projectId),
                        inArray(previewDomains.fullDomain, input.config.domains),
                    ),
                });
                if (!preview) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No preview domain found',
                    });
                }
            } else if (input.type === 'custom') {
                const custom = await ctx.db.query.publishedDomains.findFirst({
                    where: and(
                        eq(publishedDomains.projectId, input.projectId),
                        inArray(publishedDomains.fullDomain, input.config.domains),
                    ),
                });
                if (!custom) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No custom domain found',
                    });
                }
            }

            const sdk = initializeFreestyleSdk();
            let source;
            if (input.storagePath) {
                const file = await downloadFileFromStorage(input.storagePath.bucket, input.storagePath.path);
                if (!file) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to download archive' });
                }

                const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deploy-'));
                const zipPath = path.join(tmpDir, 'archive.zip');
                await fs.writeFile(zipPath, Buffer.from(await file.arrayBuffer()));
                await extract(zipPath, { dir: tmpDir });
                source = await prepareDirForDeployment(tmpDir);
            } else {
                source = { kind: 'files', files: input.files ?? {} };
            }

            const res = await sdk.deployWeb(
                source,
                input.config,
            );
            const freestyleResponse = (await res) as {
                message?: string;
                error?: {
                    message: string;
                };
                data?: FreestyleDeployWebSuccessResponseV2;
            };
            if (!res) {
                throw new Error(freestyleResponse.error?.message || freestyleResponse.message || 'Unknown error');
            }
            return true;
        }),
});
