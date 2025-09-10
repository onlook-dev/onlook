'use client';

import { api } from '@/trpc/react';
import { useState } from 'react';

export const useGitHubAppInstallation = () => {
    const [hasInstallation, setHasInstallation] = useState(false);
    const [installationId, setInstallationId] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateInstallationUrl = api.github.generateInstallationUrl.useMutation();
    const checkAppInstallation = api.github.checkGitHubAppInstallation.useQuery(undefined, {
        enabled: false,
        refetchOnWindowFocus: false,
    });

    const checkInstallation = async () => {
        setIsChecking(true);
        setError(null);

        try {
            const result = await checkAppInstallation.refetch();
            if (result.data) {
                setHasInstallation(result.data.hasInstallation);
                setInstallationId(result.data.installationId);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to check GitHub App installation';
            setError(errorMessage);
            setHasInstallation(false);
            setInstallationId(null);
            console.error('Error checking GitHub App installation:', error);
        } finally {
            setIsChecking(false);
        }
    };

    const redirectToInstallation = async (redirectUrl?: string) => {
        try {
            const finalRedirectUrl = redirectUrl || `${window.location.origin}/projects/import/github/setup`;
            const result = await generateInstallationUrl.mutateAsync({
                redirectUrl: finalRedirectUrl,
            });

            if (result?.url) {
                window.location.href = result.url;
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to generate GitHub App installation URL';
            setError(errorMessage);
            console.error('Error generating GitHub App installation URL:', error);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return {
        hasInstallation,
        installationId,
        isChecking,
        error,
        checkInstallation,
        redirectToInstallation,
        clearError,
    };
};