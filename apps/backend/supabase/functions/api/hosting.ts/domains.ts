import { CustomDomain } from "@onlook/models/hosting/index.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { PostgrestSingleResponse } from "npm:@supabase/postgrest-js@1.17.11";

export async function customDomainsRouteHandler(client: SupabaseClient): Promise<Response> {
    const res = await getCustomDomains(client);
    return new Response(JSON.stringify({
        data: res,
        error: null,
    }));
}

export async function getCustomDomains(client: SupabaseClient): Promise<CustomDomain[]> {
    try {
        const domains: PostgrestSingleResponse<CustomDomain[]> = await client.from('custom_domains').select('*');
        if (domains.error) {
            throw new Error('Failed to get custom domains');
        }
        return domains.data;
    } catch (error) {
        console.error('Failed to get custom domains', error);
        return [];
    }
}
