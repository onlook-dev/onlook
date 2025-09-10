'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';

export default function GitHubSetupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    
    const handleInstallationCallback = api.github.handleInstallationCallback.useMutation();

    useEffect(() => {
        const installationId = searchParams.get('installation_id');
        const setupAction = searchParams.get('setup_action');
        const state = searchParams.get('state');

        if (installationId && setupAction) {
            handleInstallationCallback.mutate(
                {
                    installationId,
                    setupAction,
                    state: state || undefined,
                },
                {
                    onSuccess: () => {
                        // Redirect back to GitHub import flow
                        router.push(Routes.IMPORT_GITHUB);
                    },
                    onError: (error) => {
                        setError(error.message);
                        console.error('GitHub App installation callback failed:', error);
                    },
                }
            );
        } else {
            setError('Missing required parameters for GitHub App setup');
        }
    }, [searchParams, handleInstallationCallback, router]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 mb-4">GitHub Setup Error</div>
                <div className="text-sm text-gray-600 mb-4">{error}</div>
                <button 
                    onClick={() => router.push(Routes.IMPORT_GITHUB)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Return to Import
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <div>Setting up GitHub App...</div>
        </div>
    );
}