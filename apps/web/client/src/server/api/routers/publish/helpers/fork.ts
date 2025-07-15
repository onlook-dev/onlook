import { env } from "@/env";
import { Sandbox } from "@e2b/sdk";

export async function forkBuildSandbox(sandboxId: string, userId: string, deploymentId: string): Promise<{ session: Sandbox; sandboxId: string }> {
    // Create a new E2B sandbox
    const sandbox = await Sandbox.create({
        template: sandboxId,
        apiKey: env.E2B_API_KEY,
        metadata: {
            title: 'Deployment Fork of ' + sandboxId,
            description: 'Forked sandbox for deployment',
            tags: ['deployment', 'preview', userId, deploymentId],
        },
    });

    return {
        session: sandbox,
        sandboxId: sandbox.sandboxId,
    };
}
