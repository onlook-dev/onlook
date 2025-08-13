import { CodeProvider, createCodeProviderClient, type Provider } from '@onlook/code-provider';

export async function forkBuildSandbox(
    sandboxId: string,
    userId: string,
    deploymentId: string,
): Promise<{ provider: Provider; sandboxId: string }> {
    // not a big fan of this pattern... may need to refactor `createProject` into a static method
    // though, that entirely depends on other provider implementations
    const provider = await createCodeProviderClient(CodeProvider.CodeSandbox, {
        providerOptions: {
            codesandbox: {},
        },
    });

    const project = await provider.createProject({
        source: 'template',
        id: sandboxId,
        title: 'Deployment Fork of ' + sandboxId,
        description: 'Forked sandbox for deployment',
        tags: ['deployment', 'preview', userId, deploymentId],
    });

    await provider.destroy();

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
