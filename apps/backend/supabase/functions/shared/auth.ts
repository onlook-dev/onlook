import { Database } from '@onlook/models/supabase/db.ts';
import { Context } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { User } from "npm:@supabase/auth-js@2.67.3";

export const getAuthenticatedClient = (c: Context): { client?: SupabaseClient, errorResponse?: Response } => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return { errorResponse: new Response('Missing authorization header', { status: 401 }) };
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        }
    );

    return { client: supabase };
};

export const getUser = async (client: SupabaseClient): Promise<User> => {
    const user = await client.auth.getUser();
    if (!user.data.user) {
        throw new Error('User not found');
    }
    return user.data.user;
};

export const getServiceRoleClient = (): SupabaseClient => {
    return createClient<Database>(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
};
