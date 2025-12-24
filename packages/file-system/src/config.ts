import ZenFS, { configure } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

let configPromise: Promise<void> | null = null;

export async function getFS(): Promise<typeof ZenFS> {
    // Use a single promise to ensure configuration only happens once
    configPromise ??= configure({
        mounts: {
            '/': {
                backend: IndexedDB,
                storeName: 'browser-fs',
            },
        },
    }).catch((err) => {
        // Reset on error so it can be retried
        configPromise = null;
        throw err;
    });

    await configPromise;
    return ZenFS;
}
