import { useEffect, useRef, useState } from 'react';

import { type Provider } from '@onlook/code-provider';
import { type FileSystem } from '@onlook/file-system';

import { CodeProviderSync, type SyncConfig } from './sync-engine';

interface UseSyncEngineOptions {
    provider: Provider | null;
    fs: FileSystem | null;
    config?: SyncConfig;
}

/**
 * TODO from @saddlepaddle:
 * the hook needs to be turned into a singleton / throw an error probably (i.e. we don't allow for multiple sync engines with the same inputs to be created).
 * Probably a source of bugs if we don't do this
 */
export function useSyncEngine({ provider, fs, config = {} }: UseSyncEngineOptions) {
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const syncRef = useRef<CodeProviderSync | null>(null);

    // Serialize config to a stable string for dependency comparison
    const configKey = JSON.stringify(config);

    useEffect(() => {
        if (!provider || !fs) {
            setIsLoading(false);
            return;
        }

        let mounted = true;
        setIsLoading(true);

        const initSync = async () => {
            try {
                // Create sync engine
                const sync = new CodeProviderSync(provider, fs, config);

                if (!mounted) return;

                syncRef.current = sync;

                // Start syncing
                await sync.start();

                if (mounted) {
                    setError(null);
                    setIsLoading(false);
                }
            } catch (error) {
                if (mounted) {
                    setError(error instanceof Error ? error : new Error('Failed to start sync'));
                    setIsLoading(false);
                }
            }
        };

        void initSync();

        return () => {
            mounted = false;
            if (syncRef.current) {
                syncRef.current.stop();
                syncRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider, fs, configKey]);

    return {
        error,
        isLoading,
    };
}
