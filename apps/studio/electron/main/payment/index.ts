import { ApiRoutes, BASE_API_ROUTE, FUNCTIONS_ROUTE } from '@onlook/models/constants';
import type { AuthTokens } from '@onlook/models/settings';
import { shell } from 'electron';
import { getRefreshedAuthTokens } from '../auth';

export const checkoutWithStripe = async (): Promise<{
    success: boolean;
    error?: string;
}> => {
    try {
        const checkoutUrl = await createCheckoutSession();
        shell.openExternal(checkoutUrl);
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

const createCheckoutSession = async () => {
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
    if (!url) {
        throw new Error('No checkout URL received');
    }
    return url;
};

export const checkSubscription = async (): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> => {
    try {
        const authTokens: AuthTokens = await getRefreshedAuthTokens();
        if (!authTokens) {
            throw new Error('No auth tokens found');
        }

        const response: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.CHECK_SUBSCRIPTION}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authTokens.accessToken}`,
                },
            },
        );
        const { data, error } = await response.json();
        if (error || !data) {
            throw new Error(error);
        }
        return { success: true, data };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

export const manageSubscription = async (): Promise<{
    success: boolean;
    error?: string;
}> => {
    try {
        const subscriptionUrl = await createCustomerPortalSession();
        shell.openExternal(subscriptionUrl);
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

const createCustomerPortalSession = async () => {
    const authTokens: AuthTokens = await getRefreshedAuthTokens();
    if (!authTokens) {
        throw new Error('No auth tokens found');
    }

    const response: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.CREATE_CUSTOMER_PORTAL_SESSION}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authTokens.accessToken}`,
            },
        },
    );
    const { url } = await response.json();
    if (!url) {
        throw new Error('No subscription URL received');
    }
    return url;
};
