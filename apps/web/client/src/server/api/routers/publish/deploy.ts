import {
    HostingProvider
} from '@onlook/models';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { HostingProviderFactory } from '../domain/hosting-factory';

export const deployFreestyle = async (
    {
        files,
        urls,
        envVars,
    }: {
        files: Record<string, FreestyleFile>,
        urls: string[],
        envVars?: Record<string, string>,
    }
): Promise<{
    success: boolean;
    message?: string;
}> => {
    const entrypoint = 'server.js';
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
        config: {
            domains: urls,
            entrypoint,
            envVars,
        },
    });

    if (!result.success) {
        throw new Error(result.message ?? 'Failed to deploy project');
    }

    return result;
}
