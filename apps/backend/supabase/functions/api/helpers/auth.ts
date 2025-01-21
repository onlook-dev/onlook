import { Context } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { User } from "npm:@supabase/auth-js@2.67.3";

type AuthResult = {
    success: boolean;
    response?: Response;
    user?: User;
    client?: SupabaseClient;
};

export const authenticateUser = async (c: Context): Promise<AuthResult> => {
    // Get the authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return {
            success: false,
            response: new Response('Missing authorization header', { status: 401 })
        };
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

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return {
            success: false,
            response: new Response('Auth header is malformed', { status: 401 })
        };
    }

    // Get the user from the auth token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        console.error(error);
        return {
            success: false,
            response: new Response(error?.message || 'Invalid authentication', { status: 401 })
        };
    }

    return {
        success: true,
        user,
        client: supabase
    };
};
