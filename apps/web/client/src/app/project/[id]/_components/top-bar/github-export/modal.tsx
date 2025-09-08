'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { toast } from 'sonner';

type ExportStep = 'create-repo' | 'select-branch' | 'uploading';

interface GitHubRepository {
    id: number;
    name: string;
    fullName: string;
    htmlUrl: string;
    cloneUrl: string;
    sshUrl: string;
    private: boolean;
    defaultBranch: string;
}

interface OwnerOption {
    value: string;
    label: string;
    type: 'user' | 'org';
}

export const GithubExportModal = observer(() => {
    const editorEngine = useEditorEngine();
    const [currentStep, setCurrentStep] = useState<ExportStep>('create-repo');
    const [repositoryName, setRepositoryName] = useState('');
    const [selectedOwner, setSelectedOwner] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('main');
    const [customBranch, setCustomBranch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [connectedRepo, setConnectedRepo] = useState<GitHubRepository | null>(null);

    const { data: userInfo } = api.github.getUserInfo.useQuery();
    const { data: organizations } = api.github.getOrganizations.useQuery();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    
    const createRepoMutation = api.github.createRepository.useMutation();
    const uploadFilesMutation = api.github.uploadProjectFiles.useMutation();

    const getRepositoryStorageKey = () => `onlook-github-repo-${editorEngine.projectId}`;
    
    const saveRepositoryConnection = (repository: GitHubRepository) => {
        try {
            localStorage.setItem(getRepositoryStorageKey(), JSON.stringify({
                repository,
                owner: selectedOwner,
                timestamp: Date.now()
            }));
        } catch {
            // Silent fail - localStorage not critical
        }
    };

    const loadRepositoryConnection = () => {
        try {
            const stored = localStorage.getItem(getRepositoryStorageKey());
            if (stored) {
                const data = JSON.parse(stored);
                const isStale = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
                return isStale ? null : data;
            }
        } catch {
            // Silent fail - localStorage not critical
        }
        return null;
    };

    const clearRepositoryConnection = () => {
        try {
            localStorage.removeItem(getRepositoryStorageKey());
        } catch {
            // Silent fail
        }
    };

    const handleDisconnectRepository = () => {
        clearRepositoryConnection();
        setConnectedRepo(null);
        setRepositoryName('');
        setCurrentStep('create-repo');
        toast.info('Repository disconnected');
    };

    React.useEffect(() => {
        const existingConnection = loadRepositoryConnection();
        if (existingConnection) {
            setConnectedRepo(existingConnection.repository);
            setSelectedOwner(existingConnection.owner);
            setRepositoryName(existingConnection.repository.name);
            setCurrentStep('select-branch');
        }
    }, []);

    React.useEffect(() => {
        if (userInfo?.login && !selectedOwner) {
            setSelectedOwner(userInfo.login);
        }
    }, [userInfo?.login, selectedOwner]);

    React.useEffect(() => {
        if (project?.name && !repositoryName) {
            const sanitizedName = project.name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            setRepositoryName(sanitizedName || 'onlook-project');
        }
    }, [project?.name, repositoryName]);

    const handleClose = () => {
        editorEngine.state.setGithubExportOpen(false);
        setCurrentStep('create-repo');
        setRepositoryName('');
        setSelectedOwner('');
        setSelectedBranch('main');
        setCustomBranch('');
        setIsCreating(false);
        setConnectedRepo(null);
    };

    const encodeToBase64 = (bytes: Uint8Array) => {
        let binary = '';
        const chunkSize = 0x8000; 
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        return btoa(binary);
    };

    const handleCreateRepository = async () => {
        if (!repositoryName.trim()) {
            toast.error('Repository name is required');
            return;
        }

        if (!selectedOwner) {
            toast.error('Please select a Git scope');
            return;
        }

        setIsCreating(true);

        try {
            const isOrganization = organizations?.some((org) => org.login === selectedOwner) ?? false;
            const result = await createRepoMutation.mutateAsync({
                name: repositoryName.trim(),
                description: 'Created with Onlook - Visual editor for React apps',
                private: true,
                owner: selectedOwner,
                isOrg: isOrganization,
            });

            setConnectedRepo(result.repository);
            saveRepositoryConnection(result.repository);
            setCurrentStep('select-branch');
            toast.success('Repository created successfully!');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (errorMessage.includes('Repository name already exists')) {
                toast.error('Repository name already exists. Please choose a different name.');
            } else {
                toast.error('Failed to create repository', {
                    description: errorMessage || 'Please try again or contact support.',
                });
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleConnectToBranch = async () => {
        if (!connectedRepo) return;

        setCurrentStep('uploading');

        try {
            // Collect and upload files
            const allPaths = editorEngine.activeSandbox.listAllFiles();
            const filesMap = await editorEngine.activeSandbox.readFiles(allPaths);
            const files = Object.entries(filesMap).map(([path, file]) => {
                if (file.type === 'text') {
                    return { path: path.replace(/^\.\//, ''), content: file.content, encoding: 'utf-8' as const };
                }
                if (!file.content) {
                    throw new Error(`File content is null for ${path}`);
                }
                const base64 = encodeToBase64(file.content as Uint8Array);
                return { path: path.replace(/^\.\//, ''), content: base64, encoding: 'base64' as const };
            });

            const branchToUse = selectedBranch === 'custom' ? customBranch : selectedBranch;

            const repositoryOwner = connectedRepo.fullName?.split('/')[0] || selectedOwner;
            
            await uploadFilesMutation.mutateAsync({
                owner: repositoryOwner,
                repo: connectedRepo.name,
                files,
                commitMessage: `Initial project setup - ${branchToUse} branch`,
            });

            handleClose();
            
            toast.success('Project exported successfully!', {
                description: `Files uploaded to ${connectedRepo.fullName}`,
                action: {
                    label: 'View Repository',
                    onClick: () => window.open(connectedRepo.htmlUrl, '_blank'),
                }
            });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            toast.error('Failed to upload project files', {
                description: errorMessage || 'Please try again or contact support.',
            });
            
            setCurrentStep('select-branch');
        }
    };

    const getAvailableOwners = (): OwnerOption[] => {
        const owners: OwnerOption[] = [];
        
        if (userInfo) {
            owners.push({
                value: userInfo.login,
                label: userInfo.login,
                type: 'user'
            });
        }
        
        if (organizations) {
            organizations.forEach(org => {
                owners.push({
                    value: org.login,
                    label: org.login,
                    type: 'org'
                });
            });
        }
        
        return owners;
    };

    if (!userInfo) {
        return (
            <div className="p-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Icons.GitHubLogo className="h-5 w-5" />
                        <h3 className="font-semibold text-lg">Connect to GitHub</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Sign in to GitHub to export your project as a repository.
                    </p>
                    <Button
                        onClick={() => window.location.href = '/login'}
                        className="w-full flex items-center gap-2"
                    >
                        <Icons.GitHubLogo className="h-4 w-4" />
                        Sign in with GitHub
                    </Button>
                </div>
            </div>
        );
    }

    const availableOwners = getAvailableOwners();

    if (currentStep === 'create-repo') {
        return (
            <div className="p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Create Repository</h3>
                        <p className="text-sm text-muted-foreground">
                            Create a new private repository to sync changes to. v0 will push changes to a branch on this repository each time you send a message.
                        </p>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="git-scope" className="text-sm font-medium">Git Scope</Label>
                            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                                <SelectTrigger className="w-full mt-1">
                                    <div className="flex items-center gap-2">
                                        <Icons.GitHubLogo className="h-4 w-4" />
                                        <SelectValue placeholder="Select Git Scope" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableOwners.map((owner) => (
                                        <SelectItem key={owner.value} value={owner.value}>
                                            <div className="flex items-center gap-2">
                                                <Icons.GitHubLogo className="h-4 w-4" />
                                                {owner.label}
                                                {owner.type === 'org' && (
                                                    <span className="text-xs text-muted-foreground">(org)</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="repository-name" className="text-sm font-medium">Repository Name</Label>
                            <Input
                                id="repository-name"
                                value={repositoryName}
                                onChange={(e) => setRepositoryName(e.target.value)}
                                placeholder={project?.name?.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') || 'my-project'}
                                className="w-full mt-1"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button 
                            variant="outline" 
                            onClick={handleClose}
                            disabled={isCreating}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateRepository}
                            disabled={!repositoryName.trim() || !selectedOwner || isCreating}
                            className="flex-1"
                        >
                            {isCreating ? (
                                <>
                                    <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                'Create Repository'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'select-branch') {
        return (
            <div className="p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Select a Branch</h3>
                        <p className="text-sm text-muted-foreground">
                            Select which branch you want to sync changes to.
                        </p>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <Icons.GitHubLogo className="h-4 w-4" />
                                <span className="font-medium">{connectedRepo?.fullName || `${selectedOwner}/${repositoryName}`}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDisconnectRepository}
                                className="text-xs h-auto p-1 text-muted-foreground hover:text-foreground"
                            >
                                Change
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Active Branch</Label>
                        
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                    <Icons.GitHubLogo className="h-4 w-4" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">
                                    <div className="flex items-center gap-2">
                                        <Icons.GitHubLogo className="h-4 w-4" />
                                        main
                                    </div>
                                </SelectItem>
                                <SelectItem value="custom">
                                    <div className="flex items-center gap-2">
                                        <Icons.Plus className="h-4 w-4" />
                                        Create Branch
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {selectedBranch === 'custom' && (
                            <Input
                                value={customBranch}
                                onChange={(e) => setCustomBranch(e.target.value)}
                                placeholder="Enter branch name"
                                className="w-full"
                            />
                        )}
                    </div>

                    <div className="pt-4">
                        <Button 
                            onClick={handleConnectToBranch}
                            disabled={selectedBranch === 'custom' && !customBranch.trim()}
                            className="w-full"
                        >
                            Connect to branch
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Uploading
    if (currentStep === 'uploading') {
        return (
            <div className="p-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                        <h3 className="font-semibold text-lg">Uploading Project</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Please wait while we upload your project files to GitHub...
                    </p>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                            <Icons.GitHubLogo className="h-4 w-4" />
                            <span className="font-medium">
                                {selectedOwner}/{repositoryName} → {selectedBranch === 'custom' ? customBranch : selectedBranch}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="text-center space-y-2">
                <p>Something went wrong. Please close and try again.</p>
                <Button onClick={handleClose} variant="outline">
                    Close
                </Button>
            </div>
        </div>
    );
});