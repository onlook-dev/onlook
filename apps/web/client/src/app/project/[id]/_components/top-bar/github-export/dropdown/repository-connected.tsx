'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Separator } from '@onlook/ui/separator';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';

interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch?: string;
    owner: {
        login: string;
        avatar_url: string;
    };
}

interface RepositoryConnectedStepProps {
    repositoryData: GitHubRepository;
    onBack?: () => void;
}

export const RepositoryConnectedStep = observer(({ repositoryData}: RepositoryConnectedStepProps) => {
    const editorEngine = useEditorEngine();
    const [newBranchName, setNewBranchName] = useState('feature-');
    const [showCreateBranch, setShowCreateBranch] = useState(false);
    const [isPullingChanges, setIsPullingChanges] = useState(false);
    const [isPushingChanges, setIsPushingChanges] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<string>('');

    const { data: branches, isLoading: loadingBranches, refetch: refetchBranches } = 
        api.github.getBranches.useQuery({
            owner: repositoryData.owner.login,
            repo: repositoryData.name,
        });

    const createBranchMutation = api.github.createBranch.useMutation();
    const pullChangesMutation = api.github.pullChanges.useMutation();
    const pushChangesMutation = api.github.syncProjectFiles.useMutation();
    const switchBranchMutation = api.github.switchGitBranch.useMutation();

    const { data: projectConnection } = api.github.getProjectRepositoryConnection.useQuery({
        projectId: editorEngine.projectId,
    });

    useEffect(() => {
        const savedBranch = localStorage.getItem(`selectedGitBranch-${editorEngine.projectId}`);
        const currentGitBranch = editorEngine.branches.activeGitBranch;
        
        if (savedBranch) {
            setSelectedBranch(savedBranch);
        } else if (currentGitBranch) {
            setSelectedBranch(currentGitBranch);
        } else if (projectConnection?.branch) {
            setSelectedBranch(projectConnection.branch);
        } else if (repositoryData.default_branch) {
            setSelectedBranch(repositoryData.default_branch);
        }
    }, [projectConnection?.branch, repositoryData.default_branch, editorEngine.projectId, editorEngine.branches.activeGitBranch]);

    const handleSwitchBranch = async (branchName: string) => {
        if (branchName === selectedBranch) return;

        try {
            const branch = branches?.find(b => b.name === branchName);
            
            const result = await switchBranchMutation.mutateAsync({
                projectId: editorEngine.projectId,
                branchName,
                commitSha: branch?.commit.sha,
                currentActiveBranchId: editorEngine.branches.activeBranch?.id,
            });
            
            await editorEngine.branches.reloadBranchesForGitContext(branchName);
            
            setSelectedBranch(branchName);
            localStorage.setItem(`selectedGitBranch-${editorEngine.projectId}`, branchName);
            
            if (result.action === 'created') {
                toast.success(`Created and switched to new Git branch: ${branchName}`, {
                    description: `Forked from current sandbox`,
                    duration: 5000,
                });
            } else if (result.action === 'migrated') {
                toast.success(`Migrated and switched to Git branch: ${branchName}`, {
                    description: `Updated ${result.branchCount} existing sandbox${result.branchCount === 1 ? '' : 'es'}`,
                    duration: 5000,
                });
            } else {
                toast.success(`Switched to Git branch: ${branchName}`, {
                    description: `Found ${result.branchCount} existing sandbox${result.branchCount === 1 ? '' : 'es'}`,
                    duration: 5000,
                });
            }
        } catch (error) {
            console.error('Failed to switch branch:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to switch branch';
            toast.error('Git branch switch failed', {
                description: errorMessage,
                duration: 5000,
            });
        }
    };

    const handlePullChanges = async () => {
        setIsPullingChanges(true);
        try {
            const result = await pullChangesMutation.mutateAsync({
                owner: repositoryData.owner.login,
                repo: repositoryData.name,
                projectId: editorEngine.projectId,
                branch: selectedBranch,
            });
            
            toast.success(`Successfully pulled ${result.filesCount} files from GitHub!`, {
                description: `Updated to commit: ${result.commitSha}`,
                action: {
                    label: 'View on GitHub',
                    onClick: () => window.open(result.commitUrl, '_blank'),
                },
                duration: 5000,
            });
        } catch (error) {
            console.error('Failed to pull changes:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error('Failed to pull changes', {
                description: errorMessage,
                duration: 5000,
            });
        } finally {
            setIsPullingChanges(false);
        }
    };

    const handlePushChanges = async () => {
        setIsPushingChanges(true);
        try {
            const result = await pushChangesMutation.mutateAsync({
                owner: repositoryData.owner.login,
                repo: repositoryData.name,
                projectId: editorEngine.projectId,
                message: 'Push changes from Onlook',
                branch: selectedBranch,
            });
            
            // Show success notification
            toast.success(`Successfully pushed ${result.filesCount} files to GitHub!`, {
                description: `Commit: ${result.commitSha}`,
                action: {
                    label: 'View on GitHub',
                    onClick: () => window.open(result.commitUrl, '_blank'),
                },
                duration: 5000,
            });
        } catch (error) {
            console.error('Failed to push changes:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error('Failed to push changes', {
                description: errorMessage,
                duration: 5000,
            });
        } finally {
            setIsPushingChanges(false);
        }
    };

    const handleCreateBranch = async () => {
        if (!newBranchName.trim()) return;

        try {
            await createBranchMutation.mutateAsync({
                owner: repositoryData.owner.login,
                repo: repositoryData.name,
                branchName: newBranchName.trim(),
                fromBranch: repositoryData.default_branch || 'main',
            });

            setNewBranchName('feature-');
            setShowCreateBranch(false);
            await refetchBranches();
        } catch (error) {
            console.error('Failed to create branch:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create branch';
            toast.error('Failed to create branch', {
                description: errorMessage,
                duration: 5000,
            });
        }
    };

    const isCreatingBranch = createBranchMutation.isPending;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Icons.CheckCircled className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground-primary">
                        {repositoryData.full_name}
                    </span>
                    {selectedBranch && (
                        <span className="text-xs text-foreground-secondary flex items-center gap-1">
                            <Icons.Commit className="h-3 w-3" />
                            Git branch: {selectedBranch}
                        </span>
                    )}
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(repositoryData.html_url, '_blank')}
                            className="h-6 w-6 p-0"
                        >
                            <Icons.ExternalLink className="h-3 w-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Open on GitHub
                    </TooltipContent>
                </Tooltip>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="space-y-3">
                    <h5 className="text-xs font-semibold text-foreground-primary">Quick Actions</h5>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handlePullChanges()}
                            disabled={isPullingChanges}
                            size="lg"
                            className="flex-1 h-11 text-sm font-medium"
                            variant="outline"
                        >
                            {isPullingChanges ? (
                                <>
                                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                    Pulling...
                                </>
                            ) : (
                                <>
                                    <Icons.Download className="mr-2 h-4 w-4" />
                                    Pull Changes
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={() => handlePushChanges()}
                            disabled={isPushingChanges}
                            size="lg"
                            className="flex-1 h-11 text-sm font-medium"
                        >
                            {isPushingChanges ? (
                                <>
                                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                    Pushing...
                                </>
                            ) : (
                                <>
                                    <Icons.ArrowUp className="mr-2 h-4 w-4" />
                                    Push Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <Separator />

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h5 className="text-xs font-semibold text-foreground-primary">GitHub Branches</h5>
                    <Button
                        onClick={() => setShowCreateBranch(!showCreateBranch)}
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                    >
                        <Icons.Plus className="mr-1 h-3 w-3" />
                        New
                    </Button>
                </div>

                {showCreateBranch && (
                    <div className="space-y-3 p-3 bg-background-secondary rounded-md">
                        <div>
                            <Label htmlFor="branch-name" className="text-xs font-medium">
                                Branch Name
                            </Label>
                            <Input
                                id="branch-name"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                placeholder="feature-awesome-update"
                                className="mt-1"
                                disabled={isCreatingBranch}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleCreateBranch}
                                disabled={!newBranchName.trim() || isCreatingBranch}
                                size="sm"
                                className="flex-1"
                            >
                                {isCreatingBranch ? (
                                    <>
                                        <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Branch'
                                )}
                            </Button>
                            <Button
                                onClick={() => setShowCreateBranch(false)}
                                size="sm"
                                variant="ghost"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
                
                {loadingBranches ? (
                    <div className="flex items-center justify-center py-4">
                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin text-foreground-secondary" />
                    </div>
                ) : branches && branches.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {branches.map((branch) => {
                            const isSelectedBranch = branch.name === selectedBranch;
                            const isDefaultBranch = branch.name === repositoryData.default_branch;
                            return (
                                <div
                                    key={branch.name}
                                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer hover:bg-background-secondary transition-colors ${
                                        isSelectedBranch ? 'bg-accent/50 border border-accent' : ''
                                    }`}
                                    onClick={() => handleSwitchBranch(branch.name)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icons.Commit className="h-3 w-3 text-foreground-secondary" />
                                        <span className="font-mono">{branch.name}</span>
                                        {isSelectedBranch && (
                                            <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] rounded-full font-medium">
                                                Active
                                            </span>
                                        )}
                                        {isDefaultBranch && !isSelectedBranch && (
                                            <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full font-medium">
                                                Default
                                            </span>
                                        )}
                                        {branch.protected && (
                                            <Icons.LockClosed className="h-3 w-3 text-amber-500" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-foreground-secondary text-center py-2">
                        No branches found
                    </p>
                )}
                </div>
            </div>
        </div>
    );
});