import { BASE_PROXY_ROUTE, FUNCTIONS_ROUTE, ProxyRoutes } from '@onlook/models/constants';
import { FreestyleSandboxes, type FreestyleDeployWebConfiguration } from 'freestyle-sandboxes';
import { getRefreshedAuthTokens } from '../auth';
import type { FileRecord } from './helpers';

export function getFreestyleClient(accessToken: string): FreestyleSandboxes {
    return new FreestyleSandboxes({
        apiKey: accessToken,
        baseUrl: `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_PROXY_ROUTE}${ProxyRoutes.FREESTYLE}`,
    });
}

export async function deployToFreestyle(files: FileRecord, urls: string[]): Promise<string> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const config: FreestyleDeployWebConfiguration = {
            domains: urls,
            entrypoint: 'server.js',
        };

        const freestyleClient = getFreestyleClient(authTokens.accessToken);
        const response = await freestyleClient.deployWeb(files, config);
        return response.deploymentId ?? '';
    } catch (error) {
        console.error('Failed to deploy to preview environment', error);
        throw new Error(`Failed to deploy to preview environment, error: ${error}`);
    }
}

export async function createDomainVerification(domain: string): Promise<string> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const freestyleClient = getFreestyleClient(authTokens.accessToken);
        const response = await freestyleClient.createDomainVerificationRequest(domain);
        return response.verificationCode;
    } catch (error) {
        console.error('Failed to create domain verification', error);
        throw new Error(`Failed to create domain verification, error: ${error}`);
    }
}

export async function verifyDomain(domain: string): Promise<boolean> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const freestyleClient = getFreestyleClient(authTokens.accessToken);
        const response = await freestyleClient.verifyDomain(domain);

        // @ts-expect-error message exists on HandleVerifyDomainError
        if (response.message) {
            // @ts-expect-error message exists on HandleVerifyDomainError
            throw new Error(response.message);
        }
        return true;
    } catch (error) {
        console.error('Failed to verify domain', error);
        return false;
    }
}
