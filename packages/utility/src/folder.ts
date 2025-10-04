/**
 * Normalizes a path by removing empty segments and double slashes
 */
export const normalizePath = (path: string): string => {
    return path.split('/').filter(Boolean).join('/');
};
