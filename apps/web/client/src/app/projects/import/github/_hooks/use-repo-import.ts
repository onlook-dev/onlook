'use client';

import { api as clientApi } from '@/trpc/client';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { GitHubRepository } from '@onlook/github';

export const useRepositoryImport = () => {
    const router = useRouter();
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: user } = api.user.get.useQuery();

    const importRepository = async (selectedRepo: GitHubRepository) => {
        if (!user?.id) {
            setError('No user found');
            return;
        }

        if (!selectedRepo) {
            setError('No repository selected');
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            const { sandboxId, previewUrl } = await clientApi.sandbox.createFromGitHub.mutate({
                repoUrl: selectedRepo.clone_url,
                branch: selectedRepo.default_branch,
            });

            const project = await clientApi.project.create.mutate({
                project: {
                    name: selectedRepo.name ?? 'New project',
                    description: selectedRepo.description || 'Imported from GitHub',
                },
                userId: user.id,
                sandboxId,
                sandboxUrl: previewUrl,
            });

            if (!project) {
                throw new Error('Failed to create project');
            }

            router.push(`${Routes.PROJECT}/${project.id}`);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to import repository';
            setError(errorMessage);
            console.error('Error importing repository:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return {
        isImporting,
        error,
        importRepository,
        clearError,
    };
};