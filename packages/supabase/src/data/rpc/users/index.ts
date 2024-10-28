import { Client, Json } from '/data/types';

type GetUserIdParams = {
    account_name: string;
};

export async function getUserId(params: GetUserIdParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_user_id', params);

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

export type GetUserIdResponse = Awaited<ReturnType<typeof getUserId>>;

type GetUserByIdParams = {
    user_id: string;
};

export async function getUserById(params: GetUserByIdParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_user_by_id', params);

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

export type GetUserByIdResponse = Awaited<ReturnType<typeof getUserById>>;

type GetUserByNameParams = {
    account_name: string;
};

export async function getUserByName(params: GetUserByNameParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_user_by_name', params);

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

export type GetUserByNameResponse = Awaited<ReturnType<typeof getUserByName>>;

export async function getMe(supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_me');

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

export type GetMeResponse = Awaited<ReturnType<typeof getMe>>;

type UpdateUserParams = {
    user_id: string;
    display_name?: string;
    bio?: string;
    public_metadata?: Json;
    replace_metadata?: boolean;
};

export async function updateUser(params: UpdateUserParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('update_user', params);
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

export type UpdateUserResponse = Awaited<ReturnType<typeof updateUser>>;

type SearchUsersParams = {
    account_name?: string;
};

export async function searchUsers(params: SearchUsersParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('search_users', params);

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

export type SearchUsersResponse = Awaited<ReturnType<typeof searchUsers>>;
