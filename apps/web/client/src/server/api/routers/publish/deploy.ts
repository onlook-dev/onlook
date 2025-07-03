import { previewDomains, publishedDomains } from '@onlook/db';
import {
    HostingProvider,
    PublishType
} from '@onlook/models';
import { and, eq, inArray } from 'drizzle-orm';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { HostingProviderFactory } from '../domain/hosting-factory';

export const deployFreestyle = async (
    db: any,
    type: PublishType,
    projectId: string,
    files: Record<string, FreestyleFile>,
    config: {
        domains: string[];
        entrypoint: string;
        envVars?: Record<string, string>;
    },
): Promise<{
    success: boolean;
    message?: string;
}> => {
    try {
        if (type === PublishType.PREVIEW) {
            const preview = await db.query.previewDomains.findFirst({
                where: and(
                    eq(previewDomains.projectId, projectId),
                    inArray(previewDomains.fullDomain, config.domains),
                ),
            });
            if (!preview) {
                throw new Error('No preview domain found');
            }
        } else if (type === PublishType.CUSTOM) {
            const custom = await db.query.publishedDomains.findFirst({
                where: and(
                    eq(publishedDomains.projectId, projectId),
                    inArray(publishedDomains.fullDomain, config.domains),
                ),
            });
            if (!custom) {
                throw new Error('No custom domain found');
            }
        }

        const adapter = HostingProviderFactory.create(HostingProvider.FREESTYLE);
        const deploymentFiles: Record<string, { content: string; encoding?: 'utf-8' | 'base64' }> = {};
        for (const [path, file] of Object.entries(files)) {
            deploymentFiles[path] = {
                content: file.content,
                encoding: (file.encoding === 'base64' ? 'base64' : 'utf-8')
            };
        }

        const result = await adapter.deploy({
            files: deploymentFiles,
            config: config,
        });

        return {
            success: result.success,
            message: result.message,
        };
    } catch (error) {
        console.error('Failed to deploy project', error);
        return {
            success: false,
            message: 'Failed to deploy project',
        };
    }
}