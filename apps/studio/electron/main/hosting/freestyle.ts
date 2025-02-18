import { BASE_PROXY_ROUTE, FUNCTIONS_ROUTE, ProxyRoutes } from '@onlook/models/constants';
import type { DomainVerificationResponse, VerifyDomainResponse } from '@onlook/models/hosting';
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

export async function createDomainVerification(
    domain: string,
): Promise<DomainVerificationResponse> {
    try {
        const authTokens = await getRefreshedAuthTokens();
        const freestyleClient = getFreestyleClient(authTokens.accessToken);
        const response = await freestyleClient.createDomainVerificationRequest(domain);
        return {
            success: true,
            message: 'Domain verification created',
            verificationCode: response.verificationCode,
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
        const freestyleClient = getFreestyleClient(authTokens.accessToken);
        const response = await freestyleClient.verifyDomain(domain);

        // @ts-expect-error message exists on HandleVerifyDomainError
        if (response.message) {
            // @ts-expect-error message exists on HandleVerifyDomainError
            throw new Error(response.message);
        }
        return {
            success: true,
            message: 'Domain verified',
        };
    } catch (error) {
        console.error('Failed to verify domain', error);
        return {
            success: false,
            message: 'Failed to verify domain',
        };
    }
}
