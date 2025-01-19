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
        const res = await deployWeb(files, config);
        return new Response(JSON.stringify({
            success: true,
            message: 'Deployment created',
            data: res,
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                message: 'Failed to create deployment',
                error: error,
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500
            }
        );
    }
}

async function deployWeb(files: Record<string, {
    content: string;
    encoding?: string;
}>, config: FreestyleDeployWebConfiguration): Promise<FreestyleDeployWebSuccessResponse> {

    const apiKey = Deno.env.get('FREESTYLE_API_KEY');
    if (!apiKey) {
        console.error('Freestyle API key not found.');
        throw new Error('Freestyle API key not found.');
    }

    const res = await fetch('https://api.freestyle.sh/web/v1/deploy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ files, config }),
    });

    if (!res.ok) {
        throw new Error(`Failed to deploy to Freestyle, error: ${res.statusText}`);
    }

    return res.json();
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