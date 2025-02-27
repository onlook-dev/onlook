import {
    ApiRoutes,
    BASE_API_ROUTE,
    FUNCTIONS_ROUTE,
    HostingRoutes,
} from '@onlook/models/constants';
import type {
    CreateDomainVerificationResponse,
    CustomDomain,
    GetOwnedDomainsResponse,
    VerifyDomainResponse,
} from '@onlook/models/hosting';
import { getRefreshedAuthTokens } from '../auth';

export async function getCustomDomains(): Promise<CustomDomain[]> {
    const authTokens = await getRefreshedAuthTokens();
    const res: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.HOSTING}${ApiRoutes.CUSTOM_DOMAINS}`,
        {
            headers: {
                Authorization: `Bearer ${authTokens.accessToken}`,
            },
        },
    );
    const customDomains = (await res.json()) as {
        data: CustomDomain[];
        error: string;
    };
    if (customDomains.error) {
        throw new Error(`Failed to get custom domains, error: ${customDomains.error}`);
    }
    return customDomains.data;
}

export async function getOwnedDomains(): Promise<GetOwnedDomainsResponse> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const res: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.HOSTING_V2}${HostingRoutes.OWNED_DOMAINS}`,
            {
                headers: {
                    Authorization: `Bearer ${authTokens.accessToken}`,
                },
            },
        );
        if (!res.ok) {
            const error = await res.json();
            throw new Error(`Failed to get owned domains, error: ${error.error.message}`);
        }
        const ownedDomains = (await res.json()) as GetOwnedDomainsResponse;
        if (!ownedDomains.success) {
            throw new Error(`Failed to get owned domains, error: ${ownedDomains.message}`);
        }
        return ownedDomains;
    } catch (error) {
        console.error('Failed to get owned domains', error);
        return {
            success: false,
            message: `${error}`,
        };
    }
}

export async function createDomainVerification(
    domain: string,
): Promise<CreateDomainVerificationResponse> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const res: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.HOSTING_V2}${HostingRoutes.CREATE_DOMAIN_VERIFICATION}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authTokens.accessToken}`,
                },
                body: JSON.stringify({ domain }),
            },
        );
        if (!res.ok) {
            const error = await res.json();
            throw new Error(`Failed to create domain verification, error: ${error.error.message}`);
        }
        const domainVerification = (await res.json()) as {
            data: CreateDomainVerificationResponse;
            error: string;
        };
        if (domainVerification.error) {
            throw new Error(
                `Failed to create domain verification, error: ${domainVerification.error}`,
            );
        }
        return {
            success: true,
            message: 'Domain verification created',
            verificationCode: domainVerification.data.verificationCode,
        };
    } catch (error) {
        console.error('Failed to create domain verification', error);
        return {
            success: false,
            message: `${error}`,
        };
    }
}

export async function verifyDomain(domain: string): Promise<VerifyDomainResponse> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const res: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.HOSTING_V2}${HostingRoutes.VERIFY_DOMAIN}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authTokens.accessToken}`,
                },
                body: JSON.stringify({ domain }),
            },
        );
        if (!res.ok) {
            const error = await res.json();
            throw new Error(`Failed to verify domain, error: ${error.error.message}`);
        }

        const domainVerification = (await res.json()) as {
            success: boolean;
        };
        return {
            success: domainVerification.success,
            message: 'Domain verified',
        };
    } catch (error) {
        console.error('Failed to verify domain', error);
        return {
            success: false,
            message: `${error}`,
        };
    }
}
