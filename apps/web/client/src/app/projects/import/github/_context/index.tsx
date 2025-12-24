'use client';

import { Routes } from '@/utils/constants';
import type { GitHubOrganization, GitHubRepository } from '@onlook/github';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import {
    useGitHubAppInstallation,
    useGitHubData,
    useRepositoryImport,
    useRepositoryValidation,
} from '../_hooks';

interface ImportGithubProjectProviderProps {
    children: React.ReactNode;
    totalSteps: number;
}

interface ImportGithubContextType {
    // Step management
    currentStep: number;
    setCurrentStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;

    // Repository data
    repoUrl: string;
    setRepoUrl: (repoUrl: string) => void;
    branch: string;
    setBranch: (branch: string) => void;
    selectedRepo: GitHubRepository | null;
    setSelectedRepo: (repo: GitHubRepository | null) => void;
    selectedOrg: GitHubOrganization | null;
    setSelectedOrg: (org: GitHubOrganization | null) => void;

    // Hook instances (exposed directly)
    installation: ReturnType<typeof useGitHubAppInstallation>;
    githubData: ReturnType<typeof useGitHubData>;
    repositoryImport: ReturnType<typeof useRepositoryImport>;
    repositoryValidation: ReturnType<typeof useRepositoryValidation>;

    // Utility functions
    validateRepository: (
        owner: string,
        repo: string,
    ) => Promise<{ branch: string; isPrivateRepo: boolean } | null>;
    clearErrors: () => void;
    retry: () => void;
    cancel: () => void;
}

export const ImportGithubProjectProvider: React.FC<ImportGithubProjectProviderProps> = ({
    children,
    totalSteps = 1,
}) => {
    const router = useRouter();

    // Step management
    const [currentStep, setCurrentStep] = useState(0);

    // Repository data
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('');
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
    const [selectedOrg, setSelectedOrg] = useState<GitHubOrganization | null>(null);

    // Hook instances
    const installation = useGitHubAppInstallation();
    const githubData = useGitHubData();
    const repositoryImport = useRepositoryImport();
    const repositoryValidation = useRepositoryValidation();

    useEffect(() => {
        installation.refetch();
    }, []);

    useEffect(() => {
        if (installation.hasInstallation) {
            githubData.fetchOrganizations();
            githubData.fetchRepositories();
        }
    }, [installation.hasInstallation]);

    const nextStep = async () => {
        if (currentStep === 0 && !installation.hasInstallation) {
            installation.redirectToInstallation();
            return;
        }

        if (currentStep === 1) {
            setCurrentStep(2);
            if (selectedRepo) {
                await repositoryImport.importRepository(selectedRepo);
            }
        } else if (currentStep < totalSteps - 1) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep === 0) {
            router.push(Routes.IMPORT_PROJECT);
            return;
        }
        setCurrentStep((prev) => prev - 1);
    };

    const validateRepository = async (owner: string, repo: string) => {
        const result = await repositoryValidation.validateRepository(owner, repo);
        if (result) {
            setBranch(result.branch);
        }
        return result;
    };

    const clearErrors = () => {
        installation.clearError();
        githubData.clearErrors();
        repositoryImport.clearError();
        repositoryValidation.clearError();
    };

    const clearData = () => {
        setSelectedRepo(null);
        setSelectedOrg(null);
        setRepoUrl('');
        setBranch('');
    };

    const retry = () => {
        setCurrentStep(1);
    };

    const cancel = () => {
        clearData();
        setCurrentStep(1);
    };

    const contextValue: ImportGithubContextType = {
        // Step management
        currentStep,
        setCurrentStep,
        nextStep,
        prevStep,

        // Repository data
        repoUrl,
        setRepoUrl,
        branch,
        setBranch,
        selectedRepo,
        setSelectedRepo,
        selectedOrg,
        setSelectedOrg,

        // Hook instances (exposed directly)
        installation,
        githubData,
        repositoryImport,
        repositoryValidation,

        // Utility functions
        validateRepository,
        clearErrors,
        retry,
        cancel,
    };

    return (
        <ImportGithubProjectContext.Provider value={contextValue}>
            {children}
        </ImportGithubProjectContext.Provider>
    );
};

const ImportGithubProjectContext = createContext<ImportGithubContextType | null>(null);

export const useImportGithubProject = () => {
    const context = useContext(ImportGithubProjectContext);
    if (!context) {
        throw new Error('useImportGithubProject must be used within ImportGithubProjectProvider');
    }
    return context;
};
