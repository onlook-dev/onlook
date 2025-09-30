import { env } from '@/env';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client with service role key
 * This client has full access to the database and can bypass RLS policies
 * Use with extreme caution and only in admin procedures
 */
export const createAdminClient = () => {
    return createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
};
