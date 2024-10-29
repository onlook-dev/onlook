import type { Client, Json } from '/data/types';

type GetOrganizationIdParams = {
    account_name: string;
};

export async function getOrganizationId(params: GetOrganizationIdParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_organization_id', params);

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

export type GetOrganizationIdResponse = Awaited<ReturnType<typeof getOrganizationId>>;

type GetOrganizationByIdParams = {
    organization_id: string;
};

export async function getOrganizationById(params: GetOrganizationByIdParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_organization_by_id', params);

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

export type GetOrganizationByIdResponse = Awaited<ReturnType<typeof getOrganizationById>>;

type GetOrganizationByNameParams = {
    account_name: string;
};

export async function getOrganizationByName(params: GetOrganizationByNameParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_organization_by_name', params);

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

export type GetOrganizationByNameResponse = Awaited<ReturnType<typeof getOrganizationByName>>;

type CreateOrganizationParams = {
    account_name: string;
    display_name?: string;
    bio?: string;
};

export async function createOrganization(params: CreateOrganizationParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('create_organization', params);

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

export type CreateOrganizationResponse = Awaited<ReturnType<typeof createOrganization>>;

type UpdateOrganizationParams = {
    organization_id: string;
    display_name?: string;
    bio?: string;
    public_metadata?: Json;
    replace_metadata?: boolean;
};

export async function updateOrganization(params: UpdateOrganizationParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('update_organization', params);
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

export type UpdateOrganizationResponse = Awaited<ReturnType<typeof updateOrganization>>;

type UpdateOrganizationUserParams = {
    organization_id: string;
    user_id: string;
    new_membership_role: 'owner' | 'write' | 'read';
};

export async function updateOrganizationUser(
    params: UpdateOrganizationUserParams,
    supabase: Client,
) {
    try {
        const { error, data } = await supabase.rpc('update_user_on_organization', params);
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

export type UpdateOrganizationUserResponse = Awaited<ReturnType<typeof updateOrganizationUser>>;

type DeleteOrganizationParams = {
    organization_id: string;
};

export async function deleteOrganization(params: DeleteOrganizationParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('delete_organization', params);

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

export type DeleteOrganizationResponse = Awaited<ReturnType<typeof deleteOrganization>>;

type GetUserOnOrganizationParams = {
    organization_id: string;
    user_id: string;
};

export async function getUserOnOrganization(params: GetUserOnOrganizationParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_user_on_organization', params);

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

export type GetUserOnOrganizationResponse = Awaited<ReturnType<typeof getUserOnOrganization>>;

type UpdateUserOnOrganizationParams = {
    organization_id: string;
    user_id: string;
    new_membership_role: 'owner' | 'write' | 'read';
};

export async function updateUserOnOrganization(
    params: UpdateUserOnOrganizationParams,
    supabase: Client,
) {
    try {
        const { error, data } = await supabase.rpc('update_user_on_organization', params);

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

export type UpdateUserOnOrganizationResponse = Awaited<ReturnType<typeof updateUserOnOrganization>>;

export async function getCurrentUserOrganizations(supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_current_user_organizations');

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

export type GetCurrentUserOrganizationsResponse = Awaited<
    ReturnType<typeof getCurrentUserOrganizations>
>;

type GetOrganizationUsersParams = {
    organization_id: string;
};

export async function getOrganizationUsers(params: GetOrganizationUsersParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('get_organization_users', params);

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

export type GetOrganizationUsersResponse = Awaited<ReturnType<typeof getOrganizationUsers>>;

type RemoveOrganizationUserParams = {
    organization_id: string;
    user_id: string;
};

export async function removeOrganizationUser(
    params: RemoveOrganizationUserParams,
    supabase: Client,
) {
    try {
        const { error, data } = await supabase.rpc('remove_organization_user', params);

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

export type RemoveOrganizationUserResponse = Awaited<ReturnType<typeof removeOrganizationUser>>;

type SearchOrganizationsParams = {
    account_name?: string;
};

export async function searchOrganizations(params: SearchOrganizationsParams, supabase: Client) {
    try {
        const { error, data } = await supabase.rpc('search_organizations', params);

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

export type SearchOrganizationsResponse = Awaited<ReturnType<typeof searchOrganizations>>;
