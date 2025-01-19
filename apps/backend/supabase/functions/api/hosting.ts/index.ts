import { FreestyleDeployWebConfiguration, FreestyleSandboxes, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';

export async function hostingRouteHandler({ files,
    config,
}: {
    files: Record<string, {
        content: string;
        encoding?: string;
    }>,
    config: FreestyleDeployWebConfiguration
}): Promise<Response> {
    try {
        const freestyle = initFreestyleClient();
        if (!freestyle) {
            return new Response('Freestyle client not found. Disabling hosting.', {
                headers: { "Content-Type": "application/json" },
                status: 500
            });
        }
        const res: FreestyleDeployWebSuccessResponse = await freestyle.deployWeb(
            files,
            config,
        );

        console.log('res', res);
        return new Response(JSON.stringify(res), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify(error),
            {
                headers: { "Content-Type": "application/json" },
                status: 500
            }
        );
    }
}

function initFreestyleClient() {
    const apiKey = Deno.env.get('FREESTYLE_API_KEY');
    if (!apiKey) {
        console.error('Freestyle API key not found.');
        return null;
    }
    return new FreestyleSandboxes({
        apiKey,
    });
}
