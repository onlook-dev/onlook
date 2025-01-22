import { ApiRoutes, BASE_API_ROUTE, FUNCTIONS_ROUTE } from '@onlook/models/constants';
import type { AuthTokens } from '@onlook/models/settings';
import { getRefreshedAuthTokens } from '../auth';

export const createCheckoutUrl = async (): Promise<string> => {
    const authTokens: AuthTokens = await getRefreshedAuthTokens();
    if (!authTokens) {
        throw new Error('No auth tokens found');
    }

    const response: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.CREATE_CHECKOUT}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authTokens.accessToken}`,
            },
        },
    );

    const { url } = await response.json();
    return url;
};
