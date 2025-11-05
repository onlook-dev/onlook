/**
 * Mock Supabase client utilities for Storybook
 *
 * This mock prevents the import chain:
 * getFileUrlFromStorage → @/env → @t3-oss/env-nextjs → process.cwd()
 *
 * Stories should use type: 'url' for preview images instead of type: 'storage'
 * to avoid needing actual storage path resolution.
 */

export const getFileUrlFromStorage = (bucket: string, path: string) => {
    // Return a mock URL - this shouldn't be called if stories use type: 'url'
    return `https://example.com/storage/${bucket}/${path}`;
};

// Mock implementation for file info
export const getFileInfoFromStorage = async (bucket: string, path: string) => {
    return null;
};

// Mock implementation for upload
export const uploadBlobToStorage = async (
    bucket: string,
    path: string,
    file: Blob,
    options: {
        upsert?: boolean;
        contentType?: string;
        cacheControl?: string;
    }
) => {
    return null;
};
