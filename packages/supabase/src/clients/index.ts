import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | undefined;

function getSupabaseClient(): ReturnType<typeof createClient> | undefined {
    if (supabase) return supabase;

    try {
        if (!import.meta.env.VITE_SUPABASE_API_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Supabase environment variables not set, running in offline mode');
        }
        supabase = createClient(
            import.meta.env.VITE_SUPABASE_API_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
        );
        return supabase;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return undefined;
    }
}

export default getSupabaseClient();
