import {
    ApiRoutes,
    BASE_API_ROUTE,
    FUNCTIONS_ROUTE,
    HostingRoutes,
} from '@onlook/models/constants';
import type { CustomDomain, DomainVerificationResponse } from '@onlook/models/hosting';
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

export async function createDomainVerification(
    domain: string,
): Promise<DomainVerificationResponse> {
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
    const domainVerification = (await res.json()) as {
        data: DomainVerificationResponse;
        error: string;
    };
    if (domainVerification.error) {
        throw new Error(`Failed to create domain verification, error: ${domainVerification.error}`);
    }
    return domainVerification.data;
}

export async function verifyDomain(domain: string): Promise<DomainVerificationResponse> {
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
    const domainVerification = (await res.json()) as {
        data: DomainVerificationResponse;
        error: string;
    };
    if (domainVerification.error) {
        throw new Error(`Failed to verify domain, error: ${domainVerification.error}`);
    }
    return domainVerification.data;
}
