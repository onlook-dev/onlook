import { FREESTYLE_CUSTOM_HOSTNAME } from '@onlook/constants';
import { customDomainVerification, type CustomDomainVerification } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import { TRPCError } from '@trpc/server';
import { type HandleVerifyDomainError, type HandleVerifyDomainResponse } from 'freestyle-sandboxes';
import { initializeFreestyleSdk } from '../../freestyle';
import { getARecords } from './records';

export const createDomainVerification = async (
    db: DrizzleDb,
    domain: string,
    projectId: string,
    customDomainId: string,
    subdomain: string | null,
): Promise<CustomDomainVerification> => {
    const sdk = initializeFreestyleSdk();
    const { id: freestyleVerificationId, verificationCode } = await sdk.createDomainVerificationRequest(domain);
    const [verification] = await db.insert(customDomainVerification).values({
        customDomainId,
        fullDomain: domain,
        projectId,
        freestyleVerificationId,
        txtRecord: {
            type: 'TXT',
            name: FREESTYLE_CUSTOM_HOSTNAME,
            value: verificationCode,
            verified: false,
        },
        aRecords: getARecords(subdomain),
    }).returning();
    if (!verification) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create domain verification',
        });
    }
    return verification;
}

export const verifyFreestyleDomain = async (verificationId: string): Promise<string | null> => {
    try {
        const sdk = initializeFreestyleSdk();
        const res: HandleVerifyDomainResponse = await sdk.verifyDomainVerificationRequest(verificationId);
        if (!res.domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to verify domain',
            });
        }

        return res.domain;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export const verifyFreestyleDomainWithCustomDomain = async (domain: string): Promise<string | null> => {
    try {
        const sdk = initializeFreestyleSdk();
        const res = await sdk.verifyDomain(domain) as HandleVerifyDomainResponse & HandleVerifyDomainError & { domain: string | null, message: string | null };
        if (!res.domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: res.message ?? 'Failed to verify domain',
            });
        }

        const verifiedDomain = res.domain;
        if (!verifiedDomain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Domain not found',
            });
        }

        return verifiedDomain;
    } catch (error) {
        console.error(error);
        return null;
    }
}
