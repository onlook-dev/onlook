import { FREESTYLE_IP_ADDRESS } from '@onlook/constants';
import { type CustomDomainVerification } from '@onlook/db';
import { type AVerificationRecord } from '@onlook/models';
import { promises as dns } from 'dns';
import { parse } from 'psl';

export const getARecords = (subdomain: string | null): AVerificationRecord[] => {
    if (!subdomain) {
        return [{
            type: 'A',
            name: '@',
            value: FREESTYLE_IP_ADDRESS,
            verified: false,
        }, {
            type: 'A',
            name: 'www',
            value: FREESTYLE_IP_ADDRESS,
            verified: false,
        }];
    }

    return [
        {
            type: 'A',
            name: subdomain,
            value: FREESTYLE_IP_ADDRESS,
            verified: false,
        },
    ];
}

export const getFailureReason = async (verification: CustomDomainVerification): Promise<string> => {
    const errors: string[] = [];
    const txtRecord = verification.txtRecord;
    const txtRecordResponse = await isTxtRecordPresent(verification.fullDomain, txtRecord.name, txtRecord.value);

    if (!txtRecordResponse.isPresent) {
        let txtError = `TXT Record Missing:\n`;
        txtError += `    Expected:\n`;
        txtError += `        host: ${txtRecord.name}\n`;
        txtError += `        value: "${txtRecord.value}"\n`;
        if (txtRecordResponse.foundRecords.length > 0) {
            txtError += `    Found:\n`;
            txtError += `        value: ${txtRecordResponse.foundRecords.map(record => `"${record}"`).join(', ')}`;
        } else {
            txtError += `    Found: No TXT records`;
        }
        errors.push(txtError);
    }

    const aRecords = verification.aRecords;
    for (const aRecord of aRecords) {
        const aRecordResponse = await isARecordPresent(verification.fullDomain, aRecord.value);
        if (!aRecordResponse.isPresent) {
            let aError = `A Record Missing:\n`;
            aError += `    Expected:\n`;
            aError += `        host: ${aRecord.name}\n`;
            aError += `        value: ${aRecord.value}\n`;
            if (aRecordResponse.foundRecords.length > 0) {
                aError += `    Found:\n`;
                aError += `        value: ${aRecordResponse.foundRecords.join(', ')}`;
            } else {
                aError += `    Found: No A records`;
            }
            errors.push(aError);
        }
    }

    errors.push('DNS records may take up to 24 hours to update');
    return errors.join('\n\n');
};

export async function isTxtRecordPresent(fullDomain: string, name: string, expectedValue: string): Promise<{
    isPresent: boolean;
    foundRecords: string[];
}> {
    try {
        const parsedDomain = parse(fullDomain);
        if (parsedDomain.error) {
            return {
                isPresent: false,
                foundRecords: [],
            };
        }

        const domain = parsedDomain.domain ?? fullDomain;
        const records = await dns.resolveTxt(`${name}.${domain}`);
        const foundRecords = records.map(entry => entry.join(''));
        return {
            isPresent: foundRecords.includes(expectedValue),
            foundRecords,
        };
    } catch {
        return {
            isPresent: false,
            foundRecords: [],
        };
    }
}

export async function isARecordPresent(name: string, expectedIp: string): Promise<{
    isPresent: boolean;
    foundRecords: string[];
}> {
    try {
        const records = await dns.resolve4(name);
        return {
            isPresent: records.includes(expectedIp),
            foundRecords: records,
        };
    } catch {
        return {
            isPresent: false,
            foundRecords: [],
        };
    }
}

