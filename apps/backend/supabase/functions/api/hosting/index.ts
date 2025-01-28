import { HOSTING_DOMAIN } from '@onlook/models/constants/editor.ts';
import { CustomDomain } from "@onlook/models/hosting/index.ts";
import { FreestyleDeployWebConfiguration, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getCustomDomains } from "./domains.ts";

interface FreestyleArgs {
    files: Record<string, {
        content: string;
        encoding?: string;
    }>,
    config: FreestyleDeployWebConfiguration
}

export async function hostingRouteHandler(client: SupabaseClient, {
    files,
    config,
}: FreestyleArgs): Promise<Response> {
    try {
        const res = await deployWeb(client, files, config);
        return new Response(JSON.stringify({
            success: true,
            data: res,
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
}

async function deployWeb(client: SupabaseClient, files: Record<string, {
    content: string;
    encoding?: string;
}>, config: FreestyleDeployWebConfiguration): Promise<FreestyleDeployWebSuccessResponse> {
    const apiKey = Deno.env.get('FREESTYLE_API_KEY');
    if (!apiKey) {
        console.error('Freestyle API key not found.');
        throw new Error('Freestyle API key not found.');
    }

    const domains = await getCustomDomains(client);
    if (!verifyDomain(config.domains ?? [], domains)) {
        throw new Error('Domain ownership not verified');
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
        const data = await res.json();
        throw new Error(`Failed to deploy to Freestyle, error: ${data.message || 'Unknown error'}`);
    }

    return res.json();
}

export function verifyDomain(requestDomains: string[], customDomains: CustomDomain[]) {
    return requestDomains.every(requestDomain => {
        // Check if it's a hosting domain or matches any custom domain/subdomain
        return requestDomain.endsWith(HOSTING_DOMAIN) ||
            customDomains.some(customDomain => {
                // Check exact domain match
                if (customDomain.domain === requestDomain) {
                    return true;
                }
                // Check subdomain matches
                return customDomain.subdomains.some(subdomain =>
                    `${subdomain}.${customDomain.domain}` === requestDomain
                );
            });
    });
}
