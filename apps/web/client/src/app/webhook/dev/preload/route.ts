import { env } from "@/env";

export async function POST(request: Request) {
    if (env.NODE_ENV !== 'development') {
        return new Response('Dev webhook not allowed in production', { status: 403 });
    }

    const body = await request.json();
    console.log('body', body.file);

    return new Response('OK', { status: 200 });
}
