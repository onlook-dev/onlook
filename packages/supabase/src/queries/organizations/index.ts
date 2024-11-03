import type { Client } from '../../types';

export type GetOrganizationParams = {
    organization_id?: string;
};

export async function getOrganizationQuery(
    { organization_id }: GetOrganizationParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!organization_id) {
        return;
    }

    let query = supabase
        .from('organizations')
        .select(
            `
      *,
      users (*, organization_role:users_on_organization(membership_role)),
      projects (*)
      `,
        )
        .eq('id', organization_id);

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

export type Organization = Awaited<ReturnType<typeof getOrganizationQuery>>;

export type GetUserOrganizationsParams = {
    user_id?: string;
};

export async function getUserOrganizationsQuery(
    { user_id }: GetUserOrganizationsParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!user_id) {
        throw new Error('user_id is required');
    }

    let query = supabase.from('users_on_organization').select('*').eq('user_id', user_id);

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

        return data ?? [];
    } catch (error) {
        console.error(error);
    }
}

export type UserOrganizations = Awaited<ReturnType<typeof getUserOrganizationsQuery>>;

export type GetOrganizationUsersParams = {
    organization_id?: string;
};

export async function getOrganizationUsersQuery(
    { organization_id }: GetOrganizationUsersParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!organization_id) {
        throw new Error('organization_id is required');
    }

    let query = supabase
        .from('users_on_organization')
        .select('*')
        .eq('organization_id', organization_id);

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

        return data ?? [];
    } catch (error) {
        console.error(error);
    }
}

export type OrganizationUsers = Awaited<ReturnType<typeof getOrganizationUsersQuery>>;

export type GetOrganizationUserParams = {
    organization_id?: string;
    user_id?: string;
};

export async function getOrganizationUserQuery(
    { organization_id, user_id }: GetOrganizationUserParams,
    supabase: Client,
    signal?: AbortSignal,
) {
    if (!organization_id) {
        throw new Error('organization_id is required');
    }

    if (!user_id) {
        throw new Error('user_id is required');
    }

    let query = supabase
        .from('users_on_organization')
        .select('*, user:users!user_id(*), organization:organizations!organization_id(*)')
        .eq('user_id', user_id)
        .eq('organization_id', organization_id);

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

export type OrganizationUser = Awaited<ReturnType<typeof getOrganizationUserQuery>>;
