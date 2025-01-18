import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve((req) => {
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)

    // Handle different sub-routes
    switch (path[path.length - 1]) {
        case 'ai':
            return handleAIRoute(req)
        default:
            return handleDefaultRoute(req)
    }
})

async function handleDefaultRoute(req: Request) {
    const { name } = await req.json() as { name: string }
    const data = {
        message: `api ${name}`,
    }
    return new Response(
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } },
    )
}

async function handleAIRoute(req: Request) {
    // Handle AI-specific logic here
    const { name } = await req.json() as { name: string }
    const data = {
        message: `api/ai ${name}`,
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
