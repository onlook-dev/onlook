import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | undefined;

try {
    if (!import.meta.env.VITE_SUPABASE_API_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables not set, running in offline mode');
    }
    supabase = createClient(
        import.meta.env.VITE_SUPABASE_API_URL || '',
        import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    );
} catch (error) {
    console.error('Error initializing Supabase:', error);
}

export default supabase;
