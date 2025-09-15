import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    owner: {
        login: string;
        avatar_url: string;
    };
}

interface RepositoryConnectedStepProps {
    repositoryData: GitHubRepository;
    onBack: () => void;
}

export const RepositoryConnectedStep = observer(({ repositoryData, onBack }: RepositoryConnectedStepProps) => {
    const [newBranchName, setNewBranchName] = useState('feature-');
    const [showCreateBranch, setShowCreateBranch] = useState(false);

    const { data: branches, isLoading: loadingBranches, refetch: refetchBranches } = 
        api.github.getBranches.useQuery({
            owner: repositoryData.owner.login,
            repo: repositoryData.name,
        });

    const createBranchMutation = api.github.createBranch.useMutation();
    const syncChangesMutation = api.github.syncProjectChanges.useMutation();

    const handleCreateBranch = async () => {
        if (!newBranchName.trim()) return;

        try {
            await createBranchMutation.mutateAsync({
                owner: repositoryData.owner.login,
                repo: repositoryData.name,
                branchName: newBranchName.trim(),
                fromBranch: 'main',
            });

            setNewBranchName('feature-');
            setShowCreateBranch(false);
            await refetchBranches();
        } catch (error) {
            // TODO: Add user-facing error handling
            console.error('Failed to create branch:', error);
        }
    };

    const handleSyncChanges = async () => {
        try {
            // TODO: Get projectId from context instead of repository id
            await syncChangesMutation.mutateAsync({
                projectId: repositoryData.id.toString(),
            });
        } catch (error) {
            // TODO: Add user-facing error handling
            console.error('Failed to sync changes:', error);
        }
    };

    const isCreatingBranch = createBranchMutation.isPending;
    const isSyncing = syncChangesMutation.isPending;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground-primary">
                    Repository Connected
                </h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-6 px-2 text-xs"
                >
                    <Icons.ArrowLeft className="mr-1 h-3 w-3" />
                    Back
                </Button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-950/20 rounded-md border border-teal-200 dark:border-teal-800">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/20 rounded-full flex items-center justify-center">
                    <Icons.CheckCircled className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-foreground-primary">
                        {repositoryData.full_name}
                    </p>
                    <p className="text-xs text-foreground-secondary">
                        Successfully exported and connected
                    </p>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(repositoryData.html_url, '_blank')}
                    className="h-8 px-2"
                >
                    <Icons.ExternalLink className="h-4 w-4" />
                </Button>
            </div>

            <Separator />

            <div className="space-y-3">
                <h5 className="text-xs font-semibold text-foreground-primary">Quick Actions</h5>
                
                <Button
                    onClick={handleSyncChanges}
                    disabled={isSyncing}
                    className="w-full justify-start"
                    size="sm"
                    variant="secondary"
                >
                    {isSyncing ? (
                        <>
                            <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                            Syncing Changes...
                        </>
                    ) : (
                        <>
                            <Icons.Upload className="mr-2 h-4 w-4" />
                            Sync Current Changes
                        </>
                    )}
                </Button>

                <Button
                    onClick={() => setShowCreateBranch(!showCreateBranch)}
                    className="w-full justify-start"
                    size="sm"
                    variant="secondary"
                >
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Create New Branch
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

            <Separator />

            <div className="space-y-2">
                <h5 className="text-xs font-semibold text-foreground-primary">Branches</h5>
                
                {loadingBranches ? (
                    <div className="flex items-center justify-center py-4">
                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin text-foreground-secondary" />
                    </div>
                ) : branches && branches.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {branches.map((branch) => (
                            <div
                                key={branch.name}
                                className="flex items-center justify-between p-2 rounded text-xs hover:bg-background-secondary"
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Commit className="h-3 w-3 text-foreground-secondary" />
                                    <span className="font-mono">{branch.name}</span>
                                    {branch.protected && (
                                        <Icons.LockClosed className="h-3 w-3 text-amber-500" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-foreground-secondary text-center py-2">
                        No branches found
                    </p>
                )}
            </div>
        </div>
    );
});