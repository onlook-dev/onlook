import { env } from "@/env";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest } from "next/server";

export async function createClient(request: NextRequest) {
    // Create a server's supabase client with newly configured cookie,
    // which could be used to maintain user's session
    return createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
            },
        },
    );
}
