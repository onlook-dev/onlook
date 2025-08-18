import normalizeUrl from 'normalize-url';
import { parse } from 'tldts';

export function getValidUrl(url: string) {
    // If the url is not https, convert it to https
    const prependedUrl = prependHttp(url);
    const normalizedUrl = normalizeUrl(prependedUrl);
    return normalizedUrl;
}

export function isApexDomain(domain: string): {
    isValid: boolean;
    error?: string;
} {
    const parsed = parse(domain);
    if (parsed.subdomain) {
        return {
            isValid: false,
            error: 'Please enter a domain without subdomains (e.g., example.com or example.co.uk)',
        };
    }

    if (!parsed.publicSuffix) {
        return {
            isValid: false,
            error: 'Please enter a domain with suffix (e.g., example.com or example.co.uk)',
        };
    }

    return {
        isValid: true,
    };
}

export function prependHttp(url: string, { https = true } = {}) {
    if (typeof url !== 'string') {
        throw new TypeError(`Expected \`url\` to be of type \`string\`, got \`${typeof url}\``);
    }

    url = url.trim();

    if (/^\.*\/|^(?!localhost)(\w+?:)/.test(url)) {
        return url;
    }

    // Special case for localhost - use http:// instead of https://
    if (url.startsWith('localhost')) {
        return `http://${url}`;
    }

    return url.replace(/^(?!(?:\w+?:)?\/\/)/, https ? 'https://' : 'http://');
}

export const getValidSubdomain = (subdomain: string) => {
    // Make this a valid subdomain by:
    // 1. Converting to lowercase
    // 2. Replacing invalid characters with hyphens
    // 3. Removing consecutive hyphens
    // 4. Removing leading/trailing hyphens
    return subdomain
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

export const getPublishUrls = (url: string) => {
    // Return a list including url and www.url
    return [url, `www.${url}`];
};

export const inferPageFromUrl = (url: string): { name: string; path: string } => {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        if (pathname === '/' || pathname === '') {
            return { name: 'Home', path: '/' };
        }

        const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);

        const lastSegment = segments[segments.length - 1];

        const pageName = lastSegment ? lastSegment.replace(/[-_]/g, ' ') : 'page';

        return { name: pageName, path: pathname };
    } catch (error) {
        console.error('Failed to parse URL:', error);
        return { name: 'Unknown Page', path: '/' };
    }
};

export function sanitizeReturnUrl(returnUrl: string | null): string {
    // Default to home page if no return URL
    if (!returnUrl) {
        return '/';
    }

    try {
        // If it's a relative path, it's safe
        if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
            return returnUrl;
        }

        // Parse as URL to check if it's same-origin
        const url = new URL(returnUrl, window.location.origin);

        // Only allow same-origin URLs
        if (url.origin === window.location.origin) {
            return url.pathname + url.search + url.hash;
        }
    } catch {
        // Invalid URL format, fall back to default
    }

    // Default to home page for any invalid or external URLs
    return '/';
}
