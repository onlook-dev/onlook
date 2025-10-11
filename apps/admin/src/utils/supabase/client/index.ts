import { env } from '@/env';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    // Create a supabase client on the browser with project's credentials
    return createBrowserClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
}
