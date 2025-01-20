import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function customDomainsRouteHandler(client: SupabaseClient): Promise<Response> {
    const res = await client.from('custom_domains').select('*');
    if (res.error) {
        return new Response(JSON.stringify(res.error), { status: 500 });
    }
    return new Response(JSON.stringify({
        data: res.data,
        error: res.error,
    }));
}
