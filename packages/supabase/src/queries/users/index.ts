import type { Client } from '../../types';

export type GetUserParams = {
    user_id?: string;
};

export async function getUserQuery(
    { user_id }: GetUserParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!user_id) {
        throw new Error('user_id is required');
    }

    let query = supabase
        .from('users')
        .select(
            `
      *,
      organizations (id, account_name, avatar_url)
    `,
        )
        .eq('id', user_id);

    if (signal) {
        query = query.abortSignal(signal);
    }

    try {
        const { data, error } = await query.maybeSingle();

        if (error) {
            throw error;
        }

        if (data) {
            return data;
        }
    } catch (error) {
        console.error(error);
    }
}

export type User = Awaited<ReturnType<typeof getUserQuery>>;
