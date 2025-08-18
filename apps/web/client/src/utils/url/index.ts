import { LocalForageKeys, Routes } from '@/utils/constants';

export function getReturnUrlQueryParam(returnUrl: string | null): string {
    return returnUrl ? `${LocalForageKeys.RETURN_URL}=${encodeURIComponent(returnUrl)}` : '';
}

export function sanitizeReturnUrl(returnUrl: string | null): string {
    // Default to home page if no return URL
    if (!returnUrl) {
        return Routes.HOME;
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
    return Routes.HOME;
}
