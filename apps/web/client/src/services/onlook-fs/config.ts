import { configure, fs } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

let configPromise: Promise<void> | null = null;

export async function getFS(): Promise<typeof fs> {
    // Use a single promise to ensure configuration only happens once
    if (!configPromise) {
        configPromise = configure({
            mounts: {
                '/': {
                    backend: IndexedDB,
                    storeName: 'onlook-fs',
                },
            },
        }).catch((err) => {
            // Reset on error so it can be retried
            configPromise = null;
            throw err;
        });
    }

    await configPromise;
    return fs;
}