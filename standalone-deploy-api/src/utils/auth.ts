import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { User, DatabaseTables } from '../types';

export interface AuthResult {
    client?: SupabaseClient;
    errorResponse?: Response;
}

export const getAuthenticatedClient = (req: Request, res: Response): AuthResult => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return { 
            errorResponse: res.status(401).json({ error: 'Missing authorization header' })
        };
    }

    const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || '',
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
    return createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
};
