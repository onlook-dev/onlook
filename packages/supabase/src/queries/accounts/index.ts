import type { Client } from '../../types';

export type GetAccountParams = {
    account_name?: string;
};

export async function getAccountQuery(
    { account_name }: GetAccountParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!account_name) {
        throw new Error('account_name is required');
    }

    let query = supabase.from('account_registry').select('*').eq('account_name', account_name);

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
export type Account = Awaited<ReturnType<typeof getAccountQuery>>;

export type GetUserAccountsParams = {
    user_id?: string;
};

export async function getUserAccountsQuery(
    { user_id }: GetUserAccountsParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!user_id) {
        throw new Error('user_id is required');
    }

    let query = supabase
        .from('account_registry')
        .select(
            `
        account_name,
        is_organization,
        ...organizations(
          ...users_on_organization()
        ),
        ...users()
      `,
        )
        .or('users.id.eq.user_id, users_on_organization.user_id.eq.user_id');

    if (signal) {
        query = query.abortSignal(signal);
    }

    try {
        const { data, error } = await query.order('created_at', {
            ascending: false,
        });

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

export type UserAccounts = Awaited<ReturnType<typeof getUserAccountsQuery>>;
