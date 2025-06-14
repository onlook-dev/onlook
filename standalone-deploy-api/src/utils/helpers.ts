const HOSTING_DOMAIN = 'onlook.dev';

export function verifyDomainOwnership(requestDomains: string[], ownedDomains: string[]) {
    return requestDomains.every(requestDomain => {
        if (ownedDomains.includes(requestDomain)) {
            return true;
        }

        const withoutWww = requestDomain.replace(/^www\./, '');
        if (ownedDomains.includes(withoutWww)) {
            return true;
        }

        if (requestDomain.endsWith(`.${HOSTING_DOMAIN}`)) {
            return true;
        }

        return false;
    });
}
