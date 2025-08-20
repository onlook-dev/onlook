import { env } from '@/env';
import { CodeProvider, createCodeProviderClient, type Provider } from '@onlook/code-provider';
import { v4 as uuidv4 } from 'uuid';

export async function forkBuildSandbox(
    sandboxId: string,
    userId: string,
    deploymentId: string,
): Promise<{ provider: Provider; sandboxId: string }> {
    const newSandboxId = uuidv4();
    const provider = await createCodeProviderClient(CodeProvider.Coderouter, {
        providerOptions: {
            coderouter: {
                url: env.SUPAROUTA_HOST_URL,
                sandboxId: newSandboxId,
                userId: userId,
            },
        },
    });

    const project = await provider.createProject({
        source: 'template',
        id: newSandboxId,
        userId,
        title: 'Deployment Fork of ' + sandboxId,
        description: 'Forked sandbox for deployment',
        tags: ['deployment', 'preview', userId, deploymentId],
    });

    await provider.destroy();

    return {
        provider,
        sandboxId: project.id,
    };
}
