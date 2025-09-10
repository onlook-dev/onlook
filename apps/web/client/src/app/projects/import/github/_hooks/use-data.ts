'use client';

import { api as clientApi } from '@/trpc/client';
import type { GitHubOrganization, GitHubRepository } from '@onlook/github';
import { useState } from 'react';

export const useGitHubData = () => {
    const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
    const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
    const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
    const [organizationsError, setOrganizationsError] = useState<string | null>(null);
    const [repositoriesError, setRepositoriesError] = useState<string | null>(null);

    const fetchOrganizations = async () => {
        setIsLoadingOrganizations(true);
        setOrganizationsError(null);

        try {
            const organizationsData = await clientApi.github.getOrganizations.query();
            setOrganizations(organizationsData as GitHubOrganization[]);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to fetch organizations';
            setOrganizationsError(errorMessage);
            console.error('Error fetching organizations:', error);
        } finally {
            setIsLoadingOrganizations(false);
        }
    };

    const fetchRepositories = async () => {
        setIsLoadingRepositories(true);
        setRepositoriesError(null);

        try {
            const repositoriesData = await clientApi.github.getRepositoriesWithApp.query();
            setRepositories(repositoriesData as GitHubRepository[]);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to fetch repositories';
            setRepositoriesError(errorMessage);
            console.error('Error fetching repositories:', error);
        } finally {
            setIsLoadingRepositories(false);
        }
    };

    const clearOrganizationsError = () => {
        setOrganizationsError(null);
    };

    const clearRepositoriesError = () => {
        setRepositoriesError(null);
    };

    const clearErrors = () => {
        setOrganizationsError(null);
        setRepositoriesError(null);
    };

    return {
        organizations,
        repositories,
        isLoadingOrganizations,
        isLoadingRepositories,
        organizationsError,
        repositoriesError,
        fetchOrganizations,
        fetchRepositories,
        clearOrganizationsError,
        clearRepositoriesError,
        clearErrors,
    };
};