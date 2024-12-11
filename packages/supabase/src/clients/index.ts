import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | undefined;

try {
    if (!process.env.SUPABASE_API_URL || !process.env.SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables not set, running in offline mode');
    }
    supabase = createClient(process.env.SUPABASE_API_URL, process.env.SUPABASE_ANON_KEY);
} catch (error) {
    console.error('Error initializing Supabase:', error);
}

export default supabase;
