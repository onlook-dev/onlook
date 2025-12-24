/**
 * Domain utility functions
 */

import normalizeUrl from 'normalize-url';

/**
 * Verifies domain ownership by checking various conditions
 * @param requestDomains - Array of domains to verify
 * @param ownedDomains - Array of domains that are owned
 * @param hostingDomain - The main hosting domain (optional)
 * @returns True if all request domains are owned or valid, false otherwise
 */
export const verifyDomainOwnership = (
    requestDomains: string[],
    ownedDomains: string[],
    hostingDomain?: string,
): boolean => {
    return requestDomains.every((requestDomain) => {
        // Check if domain is directly owned
        if (ownedDomains.includes(requestDomain)) {
            return true;
        }

        // Check if www version of owned domain
        const withoutWww = requestDomain.replace(/^www\./, '');
        if (ownedDomains.includes(withoutWww)) {
            return true;
        }

        // Check if subdomain of hosting domain
        if (hostingDomain && requestDomain.endsWith(`.${hostingDomain}`)) {
            return true;
        }

        return false;
    });
};

/**
 * Checks if a domain is a subdomain of a given parent domain
 * @param domain - The domain to check
 * @param parentDomain - The parent domain
 * @returns True if domain is a subdomain of parentDomain
 */
export const isSubdomain = (domain: string, parentDomain: string): boolean => {
    return domain !== parentDomain && domain.endsWith(`.${parentDomain}`);
};

/**
 * Extracts the root domain from a full domain (removes subdomains)
 * @param domain - The domain to extract root from
 * @returns The root domain
 */
export const getRootDomain = (domain: string): string => {
    const parts = domain.split('.');
    if (parts.length <= 2) {
        return domain;
    }
    return parts.slice(-2).join('.');
};

/**
 * Validates if a string is a valid domain format
 * @param domain - The domain string to validate
 * @returns True if the domain format is valid
 */
export const isValidDomain = (domain: string): boolean => {
    const domainRegex =
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    return domainRegex.test(domain) && domain.length <= 253;
};

/**
 * Creates a secure URL from a given URL string
 * @param url - The URL string to create a secure URL from
 * @returns The secure URL string
 */
export const createSecureUrl = (url: string | undefined | null): string => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return '';
    }

    try {
        const normalizedUrl = normalizeUrl(url, {
            forceHttps: true,
            stripAuthentication: true,
            removeTrailingSlash: true,
            stripWWW: false,
            defaultProtocol: 'https',
        });

        // For single-word strings like 'test', normalize-url returns 'https://test',
        // which is not what we want. A valid domain should have at least one dot.
        const { protocol, hostname, pathname } = new URL(normalizedUrl);
        if (!hostname.includes('.') && pathname === '/') {
            return '';
        }

        if (protocol !== 'https:' && protocol !== 'http:') {
            const urlObject = new URL(normalizedUrl);
            urlObject.protocol = 'https:';
            return urlObject.toString().replace(/\/$/, '');
        }

        return normalizedUrl;
    } catch (error) {
        // Invalid URL format
        console.error(
            `Invalid URL format. Input: "${url}", Error: ${error instanceof Error ? error.message : error}`,
        );
        return '';
    }
};
