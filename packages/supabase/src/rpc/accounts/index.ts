import type { Client } from '../../types';

export async function getAccountsState(supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_accounts_state');

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

export type GetAccountsStateResponse = Awaited<ReturnType<typeof getAccountsState>>;
