import { previewDomains, publishedDomains } from '@onlook/db';
import { HostingProvider } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { HostingProviderFactory } from './hosting-factory';

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
                files: z.record(z.string(), z.object({
                    content: z.string(),
                    encoding: z.string().optional(),
                })),
                config: z.object({
                    domains: z.array(z.string()),
                    entrypoint: z.string().optional(),
                    envVars: z.record(z.string(), z.string()).optional(),
                }),
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

            const adapter = HostingProviderFactory.create(HostingProvider.FREESTYLE);

            const deploymentFiles: Record<string, { content: string; encoding?: 'utf-8' | 'base64' }> = {};
            for (const [path, file] of Object.entries(input.files)) {
                deploymentFiles[path] = {
                    content: file.content,
                    encoding: (file.encoding === 'base64' ? 'base64' : 'utf-8')
                };
            }

            const result = await adapter.deploy({
                files: deploymentFiles,
                config: input.config
            });

            return result;
        }),
});
