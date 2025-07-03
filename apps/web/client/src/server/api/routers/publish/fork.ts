import { env } from "@/env";
import { CodeSandbox, type SandboxBrowserSession } from "@codesandbox/sdk";

const sdk = new CodeSandbox(env.CSB_API_KEY);

export async function forkBuildSandbox(sandboxId: string, userId: string, deploymentId: string): Promise<SandboxBrowserSession> {
    const sandbox = await sdk.sandboxes.create({
        source: 'template',
        id: sandboxId,
        title: 'Deployment Fork of ' + sandboxId,
        description: 'Forked sandbox for deployment',
        tags: ['deployment', 'preview', userId, deploymentId],
    });

    const session = await sandbox.connect()
    return {
        session,
        sandboxId: sandbox.id,
    }
}
