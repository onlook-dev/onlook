import { Context } from 'jsr:@hono/hono';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, User } from 'jsr:@supabase/supabase-js@2';

type AuthResult = {
    success: boolean;
    response?: Response;
    user?: User;
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

    // Create Supabase client
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
            global: { headers: { Authorization: authHeader } }
        }
    );

    // Verify the user's session
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return {
            success: false,
            response: new Response(error?.message || 'Invalid authentication', { status: 401 })
        };
    }

    return {
        success: true,
        user
    };
};
