/**
 * Domain utility functions
 */

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
export const createSecureUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return '';
    }

    const trimmedUrl = url.trim();

    try {
        // If it already has a protocol, validate it's http or https
        if (trimmedUrl.includes('://')) {
            const parsedUrl = new URL(trimmedUrl);
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                return parsedUrl.toString();
            }
            // Invalid protocol, return empty string
            return '';
        }

        // No protocol, add https and validate
        const httpsUrl = `https://${trimmedUrl}`;
        const parsedUrl = new URL(httpsUrl);
        return parsedUrl.toString();
    } catch {
        // Invalid URL format
        return '';
    }
};
