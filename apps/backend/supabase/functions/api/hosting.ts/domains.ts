import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function customDomainsRouteHandler(client: SupabaseClient): Promise<Response> {
    const res = await client.from('custom_domains').select('*');
    console.log(res);
    if (error) {
        return new Response(JSON.stringify(error), { status: 500 });
    }
    return new Response(JSON.stringify(customDomains));
}