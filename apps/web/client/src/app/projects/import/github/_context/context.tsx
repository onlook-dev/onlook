'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/trpc/react';
import { api as clientApi } from '@/trpc/client';
import { useCreateManager } from '@/components/store/create';
import { useRouter } from 'next/navigation';
import { redirect } from 'next/navigation';
import { login } from '@/app/login/actions';
import { SignInMethod } from '@onlook/models/auth';
import { Routes } from '@/utils/constants';
import { useUserManager } from '@/components/store/user';

const FAKE_ORGANIZATIONS = [
    {
        login: 'onlook-dev',
        id: 157326433,
        avatar_url: 'https://avatars.githubusercontent.com/u/157326433?v=4',
    },
];

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

    // Error states
    organizationsError: string | null;
    repositoriesError: string | null;
    filesError: string | null;
    connectionError: string | null;

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

    // Error states
    const [organizationsError, setOrganizationsError] = useState<string | null>(null);
    const [repositoriesError, setRepositoriesError] = useState<string | null>(null);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Create manager
    const createManager = useCreateManager();
    const userManager = useUserManager();

    useEffect(() => {
        checkGitHubConnection();
    }, []);

    useEffect(() => {
        if (isGitHubConnected) {
            fetchOrganizations();
            fetchRepositories();
        }
    }, [isGitHubConnected]);

    const validateRepo = api.github.validate.useMutation();
    const reconnectGitHub = api.github.reconnectGitHub.useMutation();

    const nextStep = async () => {
        if (currentStep < totalSteps - 1) {
            if (!isGitHubConnected) {
                await login(SignInMethod.GITHUB);
            }
            setCurrentStep((prev) => prev + 1);
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep === 0) {
            return;
        }
        setCurrentStep((prev) => prev - 1);
    };

    const fetchOrganizations = async () => {
        setIsLoadingOrganizations(true);
        setOrganizationsError(null);

        try {
            const organizationsData = await clientApi.github.getOrganizations.query();
            console.log('organizationsData', organizationsData);
            // TODO: remove this
            setOrganizations(FAKE_ORGANIZATIONS as GitHubOrganization[]);
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
            if (!userManager.user?.id) {
                console.error('No user found');
                return;
            }

            const { sandboxId, previewUrl } = await createManager.createSandboxFromGithub(
                selectedRepo?.clone_url || '',
                selectedRepo?.default_branch || '',
            );

            const project = await clientApi.project.create.mutate({
                project: {
                    name: selectedRepo?.name ?? 'New project',
                    sandboxId,
                    sandboxUrl: previewUrl,
                    description: 'Your new project',
                },
                userId: userManager.user.id,
            });
            if (!project) {
                console.error('Failed to create project');
                return;
            }
            // Open the project
            router.push(`${Routes.PROJECT}/${project.id}`);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to fetch repository files';
            setFilesError(errorMessage);
            console.error('Error fetching repository files:', error);
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
            console.log('result', result);
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

        // Error states
        organizationsError,
        repositoriesError,
        filesError,
        connectionError,

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
    setCurrentStep: () => {},
    nextStep: () => {},
    prevStep: () => {},

    // Repository data
    repoUrl: '',
    setRepoUrl: () => {},
    branch: '',
    setBranch: () => {},
    selectedRepo: null,
    setSelectedRepo: () => {},
    selectedOrg: null,
    setSelectedOrg: () => {},

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

    // Error states
    organizationsError: null,
    repositoriesError: null,
    filesError: null,
    connectionError: null,

    // Functions
    fetchOrganizations: () => {},
    fetchRepositories: () => {},
    fetchUserRepositories: () => {},
    fetchOrgRepositories: () => {},
    importRepo: () => {},
    validateRepository: async () => null,
    checkGitHubConnection: () => {},
    clearErrors: () => {},
    retry: () => {},
    cancel: () => {},
});

export const useImportGithubProject = () => {
    return useContext(ImportGithubProjectContext);
};
