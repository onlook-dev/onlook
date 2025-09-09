'use client';

import { login } from '@/app/login/actions';
import { api as clientApi } from '@/trpc/client';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import {
    handleInstallationCallback as parseInstallationCallback,
    type InstallationCallbackParams
} from '@onlook/github';
import { SignInMethod } from '@onlook/models/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';


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
    isCheckingConnection: boolean;
    isFinalizing: boolean;

    // Connection state
    isGitHubConnected: boolean;

    // GitHub App installation state
    isGitHubAppInstalled: boolean;
    installationId: number | null;
    isCheckingInstallation: boolean;

    // Error states
    organizationsError: string | null;
    repositoriesError: string | null;
    filesError: string | null;
    connectionError: string | null;
    installationError: string | null;

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
    checkGitHubConnection: () => void;
    clearErrors: () => void;
    retry: () => void;
    cancel: () => void;

    // GitHub App installation functions
    redirectToGitHubAppInstallation: () => void;
    handleInstallationCallback: (params: InstallationCallbackParams) => void;
    checkGitHubAppInstallation: () => void;
}

export const ImportGithubProjectProvider: React.FC<ImportGithubProjectProviderProps> = ({
    children,
    totalSteps = 1,
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Step management
    const [currentStep, setCurrentStep] = useState(0);

    // Repository data
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('');
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
    const [selectedOrg, setSelectedOrg] = useState<GitHubOrganization | null>(null);

    // GitHub data
    const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);

    // Loading states
    const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
    const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    // Connection state
    const [isGitHubConnected, setIsGitHubConnected] = useState(false);

    // GitHub App installation state
    const [isGitHubAppInstalled, setIsGitHubAppInstalled] = useState(false);
    const [installationId, setInstallationId] = useState<number | null>(null);
    const [isCheckingInstallation, setIsCheckingInstallation] = useState(false);

    // Error states
    const [organizationsError, setOrganizationsError] = useState<string | null>(null);
    const [repositoriesError, setRepositoriesError] = useState<string | null>(null);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [installationError, setInstallationError] = useState<string | null>(null);

    // Create manager
    const { data: user } = api.user.get.useQuery();

    useEffect(() => {
        checkGitHubConnection();
        checkGitHubAppInstallation();
    }, []);

    useEffect(() => {
        if (isGitHubConnected) {
            fetchOrganizations();
            fetchRepositories();
        }
    }, [isGitHubConnected]);

    // Handle GitHub App installation callback
    useEffect(() => {
        const installationId = searchParams.get('installation_id');
        const setupAction = searchParams.get('setup_action');
        const state = searchParams.get('state');

        if (installationId && setupAction) {
            handleInstallationCallback({
                installation_id: installationId,
                setup_action: setupAction as 'install' | 'update',
                state: state || undefined,
            });
        }
    }, [searchParams]);

    const validateRepo = api.github.validate.useMutation();
    const reconnectGitHub = api.github.reconnectGitHub.useMutation();

    const nextStep = async () => {
        if (currentStep === 0 && !isGitHubConnected) {
            await login(SignInMethod.GITHUB);
            return;
        }

        if (currentStep === 1) {
            // Going from SetupGithub to FinalizingGithubProject - trigger import
            setCurrentStep(2);
            await importRepo();
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

    const fetchRepositories = async (username?: string) => {
        setIsLoadingRepositories(true);
        setRepositoriesError(null);

        try {
            const repositoriesData = await clientApi.github.getRepositories.query(
                username ? { username } : undefined,
            );
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

    const fetchUserRepositories = () => {
        fetchRepositories();
    };

    const fetchOrgRepositories = (orgName: string) => {
        fetchRepositories(orgName);
    };

    const importRepo = async () => {
        setIsFinalizing(true);
        setIsLoadingFiles(true);
        setFilesError(null);

        try {
            if (!user?.id) {
                console.error('No user found');
                return;
            }

            if (!selectedRepo) {
                console.error('No repository selected');
                return;
            }

            const { sandboxId, previewUrl } = await clientApi.sandbox.createFromGitHub.mutate({
                url: selectedRepo.clone_url,
                branch: selectedRepo.default_branch,
            });

            const project = await clientApi.project.create.mutate({
                project: {
                    name: selectedRepo.name ?? 'New project',
                    description: selectedRepo.description || 'Imported from GitHub',
                    tags: ['imported', 'github'],
                },
                sandboxId,
                sandboxUrl: previewUrl,
                userId: user.id,
            });


            if (!project) {
                console.error('Failed to create project');
                return;
            }

            // Open the project
            router.push(`${Routes.PROJECT}/${project.id}`);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to import repository';
            setFilesError(errorMessage);
            console.error('Error importing repository:', error);
        } finally {
            setIsLoadingFiles(false);
            setIsFinalizing(false);
        }
    };

    const validateRepository = async (owner: string, repo: string) => {
        try {
            const result = await validateRepo.mutateAsync({ owner, repo });
            setBranch(result.branch);
            return result;
        } catch (error) {
            console.error('Error validating repository:', error);
            return null;
        }
    };

    const checkGitHubConnection = async () => {
        setIsCheckingConnection(true);
        setConnectionError(null);

        try {
            const result = await clientApi.github.checkGitHubConnection.query();
            setIsGitHubConnected(result.connected);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to check GitHub connection';
            setConnectionError(errorMessage);
            setIsGitHubConnected(false);
            console.error('Error checking GitHub connection:', error);
        } finally {
            setIsCheckingConnection(false);
        }
    };

    const clearErrors = () => {
        setOrganizationsError(null);
        setRepositoriesError(null);
        setFilesError(null);
        setConnectionError(null);
        setInstallationError(null);
    };

    const clearLoadingStates = () => {
        setIsLoadingOrganizations(false);
        setIsLoadingRepositories(false);
        setIsLoadingFiles(false);
        setIsCheckingConnection(false);
        setIsFinalizing(false);
    }

    const clearData = () => {
        setSelectedRepo(null);
        setSelectedOrg(null);
        setRepoUrl('');
        setBranch('');
    }

    const retry = () => {
        setCurrentStep(1);
        clearLoadingStates();
    };

    const cancel = () => {
        clearLoadingStates();
        clearData();
        setCurrentStep(1);
    }

    // GitHub App installation functions
    const redirectToGitHubAppInstallation = async () => {
        if (!user?.id) {
            console.error('No user found');
            return;
        }

        const installUrl = await clientApi.github.generateInstallationUrl.query({
            state: `user-${user.id}`,
        });

        window.location.href = installUrl;
    };

    const handleInstallationCallback = (params: InstallationCallbackParams) => {
        try {
            const result = parseInstallationCallback(params);

            setInstallationId(result.installationId);
            setIsGitHubAppInstalled(true);
            setInstallationError(null);

            // Clear URL parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('installation_id');
            url.searchParams.delete('setup_action');
            url.searchParams.delete('state');
            window.history.replaceState({}, '', url.toString());

            // Proceed to next step
            setCurrentStep(1);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to handle installation callback';
            setInstallationError(errorMessage);
            console.error('Error handling installation callback:', error);
        }
    };

    const checkGitHubAppInstallation = async () => {
        if (!user?.id) return;

        setIsCheckingInstallation(true);
        setInstallationError(null);

        try {
            // This would need a new API endpoint to check GitHub App installation
            // For now, we'll assume it's based on GitHub connection
            setIsGitHubAppInstalled(isGitHubConnected);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to check GitHub App installation';
            setInstallationError(errorMessage);
            console.error('Error checking GitHub App installation:', error);
        } finally {
            setIsCheckingInstallation(false);
        }
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
        organizations,
        repositories,

        // Loading states
        isLoadingOrganizations,
        isLoadingRepositories,
        isLoadingFiles,
        isCheckingConnection,
        isFinalizing,
        // Connection state
        isGitHubConnected,

        // GitHub App installation state
        isGitHubAppInstalled,
        installationId,
        isCheckingInstallation,

        // Error states
        organizationsError,
        repositoriesError,
        filesError,
        connectionError,
        installationError,

        // Functions
        fetchOrganizations,
        fetchRepositories,
        fetchUserRepositories,
        fetchOrgRepositories,
        importRepo,
        validateRepository,
        checkGitHubConnection,
        clearErrors,
        retry,
        cancel,

        // GitHub App installation functions
        redirectToGitHubAppInstallation,
        handleInstallationCallback,
        checkGitHubAppInstallation,
    };

    return (
        <ImportGithubProjectContext.Provider value={contextValue}>
            {children}
        </ImportGithubProjectContext.Provider>
    );
};

const ImportGithubProjectContext = createContext<ImportGithubContextType>({
    // Step management
    currentStep: 0,
    setCurrentStep: () => { },
    nextStep: () => { },
    prevStep: () => { },

    // Repository data
    repoUrl: '',
    setRepoUrl: () => { },
    branch: '',
    setBranch: () => { },
    selectedRepo: null,
    setSelectedRepo: () => { },
    selectedOrg: null,
    setSelectedOrg: () => { },

    // GitHub data
    organizations: [],
    repositories: [],

    // Loading states
    isLoadingOrganizations: false,
    isLoadingRepositories: false,
    isLoadingFiles: false,
    isCheckingConnection: false,
    isFinalizing: false,
    // Connection state
    isGitHubConnected: false,

    // GitHub App installation state
    isGitHubAppInstalled: false,
    installationId: null,
    isCheckingInstallation: false,

    // Error states
    organizationsError: null,
    repositoriesError: null,
    filesError: null,
    connectionError: null,
    installationError: null,

    // Functions
    fetchOrganizations: () => { },
    fetchRepositories: () => { },
    fetchUserRepositories: () => { },
    fetchOrgRepositories: () => { },
    importRepo: () => { },
    validateRepository: async () => null,
    checkGitHubConnection: () => { },
    clearErrors: () => { },
    retry: () => { },
    cancel: () => { },

    // GitHub App installation functions
    redirectToGitHubAppInstallation: () => { },
    handleInstallationCallback: () => { },
    checkGitHubAppInstallation: () => { },
});

export const useImportGithubProject = () => {
    return useContext(ImportGithubProjectContext);
};
