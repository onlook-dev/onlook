import { CodeProvider, createCodeProviderClient, getStaticCodeProvider, type Provider } from '@onlook/code-provider';

export async function forkBuildSandbox(
    sandboxId: string,
    userId: string,
    deploymentId: string,
): Promise<{ provider: Provider; sandboxId: string }> {
    const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
    const project = await CodesandboxProvider.createProject({
        source: 'template',
        id: sandboxId,
        title: 'Deployment Fork of ' + sandboxId,
        description: 'Forked sandbox for deployment',
        tags: ['deployment', 'preview', userId, deploymentId],
    });

    const forkedProvider = await createCodeProviderClient(CodeProvider.CodeSandbox, {
        providerOptions: {
            codesandbox: {
                sandboxId: project.id,
                userId,
                initClient: true,
            },
        },
    });

    return {
        provider: forkedProvider,
        sandboxId: project.id,
    };
}
