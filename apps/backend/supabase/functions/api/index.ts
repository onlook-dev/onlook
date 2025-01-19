import { ApiRoutes } from "@onlook/models/constants/api.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { aiRouteHandler } from "./ai/index.ts";

Deno.serve((req) => {
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)

    // Handle different sub-routes
    switch (path[path.length - 1]) {
        case ApiRoutes.AI:
            return aiRouteHandler(req)
        default:
            return handleDefaultRoute(req)
    }
})

async function handleDefaultRoute(req: Request) {
    const { name } = await req.json() as { name: string }
    const data = {
        message: ApiRoutes,
    }
    return new Response(
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } },
    )
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/