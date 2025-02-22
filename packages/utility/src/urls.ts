export function getValidUrl(url: string) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'http://' + url;
    }
    return url;
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
