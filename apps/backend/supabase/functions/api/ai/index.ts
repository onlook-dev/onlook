
export async function aiRouteHandler(req: Request) {
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

/*
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/api/ai' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'
*/
