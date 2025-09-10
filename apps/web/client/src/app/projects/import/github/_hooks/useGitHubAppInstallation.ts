'use client';

import { api } from '@/trpc/react';
import { useEffect, useState } from 'react';

export interface GitHubAppInstallation {
    hasInstallation: boolean;
    installationId: string | null;
    isChecking: boolean;
    error: string | null;
    redirectToInstallation: (redirectUrl?: string) => Promise<void>;
    refetch: () => void;
    clearError: () => void;
}

export const useGitHubAppInstallation: () => GitHubAppInstallation = () => {
    const generateInstallationUrl = api.github.generateInstallationUrl.useMutation();
    const { data: installationId, refetch: checkInstallation, isFetching: isChecking, error: checkInstallationError } = api.github.checkGitHubAppInstallation.useQuery(undefined, {
        refetchOnWindowFocus: true,
    });
    const [error, setError] = useState<string | null>(null);
    const hasInstallation = !!installationId;

    useEffect(() => {
        setError(checkInstallationError?.message || null);
    }, [checkInstallationError]);

    const clearError = () => {
        setError(null);
    };

    const redirectToInstallation = async (redirectUrl?: string) => {
        try {
            const finalRedirectUrl = redirectUrl;
            const result = await generateInstallationUrl.mutateAsync({
                redirectUrl: finalRedirectUrl,
            });

            if (result?.url) {
                window.open(result.url, '_blank');
            }
        } catch (error) {
            console.error('Error generating GitHub App installation URL:', error);
        }
    };

    return {
        hasInstallation,
        installationId: installationId || null,
        isChecking,
        error,
        redirectToInstallation,
        refetch: checkInstallation,
        clearError,
    };
};