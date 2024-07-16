import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | undefined;

try {
    supabase = createClient(window.env.SUPABASE_API_URL || '', window.env.SUPABASE_ANON_KEY || '');
} catch (error) {
    console.error('Error initializing Supabase:', error);
}

export default supabase;
