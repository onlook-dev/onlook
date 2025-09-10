'use client';

import { Routes } from '@/utils/constants';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import {
    useGitHubAppInstallation,
    useGitHubData,
    useRepositoryImport,
    useRepositoryValidation,
} from '../_hooks';

interface GitHubOrganization {
    id: number;
    login: string;
    avatar_url: string;
    description?: string;
}

interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    default_branch: string;
    clone_url: string;
    html_url: string;
    updated_at: string;
    owner: {
        login: string;
        avatar_url: string;
    };
}

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

    // Selected repository data
    selectedRepo: GitHubRepository | null;
    setSelectedRepo: (repo: GitHubRepository | null) => void;
    selectedOrg: GitHubOrganization | null;
    setSelectedOrg: (org: GitHubOrganization | null) => void;

    // GitHub data
    organizations: GitHubOrganization[];
    repositories: GitHubRepository[];

    // Loading states
    isLoadingOrganizations: boolean;
    isLoadingRepositories: boolean;
    isLoadingFiles: boolean;
    isFinalizing: boolean;
    isCheckingAppInstallation: boolean;

    // Connection state
    hasGitHubAppInstallation: boolean;
    gitHubInstallationId: string | null;

    // Error states
    organizationsError: string | null;
    repositoriesError: string | null;
    filesError: string | null;
    appInstallationError: string | null;

    // Functions
    fetchOrganizations: () => void;
    fetchRepositories: (username?: string) => void;
    fetchUserRepositories: () => void;
    fetchOrgRepositories: (orgName: string) => void;
    importRepo: () => void;
    validateRepository: (
        owner: string,
        repo: string,
    ) => Promise<{ branch: string; isPrivateRepo: boolean } | null>;
    checkGitHubAppInstallation: () => void;
    redirectToGitHubAppInstallation: () => void;
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

    // Custom hooks
    const gitHubAppInstallation = useGitHubAppInstallation();
    const gitHubData = useGitHubData();
    const repositoryImport = useRepositoryImport();
    const repositoryValidation = useRepositoryValidation();

    useEffect(() => {
        gitHubAppInstallation.checkInstallation();
    }, []);

    useEffect(() => {
        if (gitHubAppInstallation.hasInstallation) {
            gitHubData.fetchOrganizations();
            gitHubData.fetchRepositories();
        }
    }, [gitHubAppInstallation.hasInstallation]);

    const nextStep = async () => {
        if (currentStep === 0 && !gitHubAppInstallation.hasInstallation) {
            gitHubAppInstallation.redirectToInstallation();
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
        gitHubAppInstallation.clearError();
        gitHubData.clearErrors();
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

        // GitHub data
        organizations: gitHubData.organizations,
        repositories: gitHubData.repositories,

        // Loading states
        isLoadingOrganizations: gitHubData.isLoadingOrganizations,
        isLoadingRepositories: gitHubData.isLoadingRepositories,
        isLoadingFiles: repositoryImport.isImporting,
        isFinalizing: repositoryImport.isImporting,
        isCheckingAppInstallation: gitHubAppInstallation.isChecking,

        // Connection state
        hasGitHubAppInstallation: gitHubAppInstallation.hasInstallation,
        gitHubInstallationId: gitHubAppInstallation.installationId,

        // Error states
        organizationsError: gitHubData.organizationsError,
        repositoriesError: gitHubData.repositoriesError,
        filesError: repositoryImport.error,
        appInstallationError: gitHubAppInstallation.error,

        // Functions
        fetchOrganizations: gitHubData.fetchOrganizations,
        fetchRepositories: gitHubData.fetchRepositories,
        fetchUserRepositories: gitHubData.fetchRepositories,
        fetchOrgRepositories: gitHubData.fetchRepositories,
        importRepo: () => selectedRepo && repositoryImport.importRepository(selectedRepo),
        validateRepository,
        checkGitHubAppInstallation: gitHubAppInstallation.checkInstallation,
        redirectToGitHubAppInstallation: gitHubAppInstallation.redirectToInstallation,
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
