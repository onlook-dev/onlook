import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { toast } from 'sonner';

import type { Branch } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { timeAgo } from '@onlook/utility/src/time';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/client';

interface BranchManagementProps {
    branch: Branch;
}

export const BranchManagement = observer(({ branch }: BranchManagementProps) => {
    const editorEngine = useEditorEngine();
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(branch.name);
    const [isForking, setIsForking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isActiveBranch = editorEngine.branches.activeBranch.id === branch.id;
    const isOnlyBranch = editorEngine.branches.allBranches.length === 1;

    const handleClose = () => {
        editorEngine.state.branchTab = null;
        editorEngine.state.manageBranchId = null;
    };

    const handleRename = async () => {
        if (newName.trim() === branch.name || !newName.trim()) {
            setIsRenaming(false);
            setNewName(branch.name);
            return;
        }

        try {
            await editorEngine.branches.updateBranch(branch.id, {
                name: newName.trim(),
            });
            toast.success(`Branch renamed to "${newName.trim()}"`);
            setIsRenaming(false);
        } catch (error) {
            console.error('Failed to rename branch:', error);
            toast.error('Failed to rename branch', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
            setNewName(branch.name);
            setIsRenaming(false);
        }
    };

    const handleFork = async () => {
        if (isForking) return;

        try {
            setIsForking(true);
            await editorEngine.branches.forkBranch(branch.id);
            toast.success('Branch forked successfully');
            handleClose();
        } catch (error) {
            console.error('Failed to fork branch:', error);
            toast.error('Failed to fork branch');
        } finally {
            setIsForking(false);
        }
    };

    const handleDelete = async () => {
        if (isDeleting) return;

        try {
            setIsDeleting(true);

            // If this is the active branch, switch to a different one first
            if (isActiveBranch) {
                const allBranches = editorEngine.branches.allBranches;
                const otherBranches = allBranches.filter((b) => b.id !== branch.id);

                if (otherBranches.length === 0) {
                    throw new Error('Cannot delete the last remaining branch');
                }

                // Find the default branch, or use the first available branch
                const targetBranch = otherBranches.find((b) => b.isDefault) || otherBranches[0];

                if (!targetBranch) {
                    throw new Error('No target branch available for switching');
                }

                // Switch to the target branch first
                await editorEngine.branches.switchToBranch(targetBranch.id);
            }

            const success = await api.branch.delete.mutate({
                branchId: branch.id,
            });

            if (success) {
                editorEngine.branches.removeBranch(branch.id);
                toast.success('Branch deleted successfully');
                handleClose();
            } else {
                throw new Error('Failed to delete branch');
            }
        } catch (error) {
            console.error('Failed to delete branch:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete branch');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewName(branch.name);
        }
    };

    return (
        <div className="text-active flex h-full w-full flex-grow flex-col p-0 text-xs">
            <div className="border-border flex items-center justify-start gap-2 border-b py-3 pr-2.5 pl-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-background-secondary h-7 w-7 rounded-md"
                    onClick={handleClose}
                >
                    <Icons.ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-foreground text-sm font-normal">Branch Settings</h2>
            </div>

            <div className="border-border space-y-4 border-b p-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-foreground text-sm">Name</label>
                        {isActiveBranch && (
                            <span className="rounded bg-teal-800 px-2 py-1 text-xs text-teal-200">
                                Active
                            </span>
                        )}
                    </div>
                    {isRenaming ? (
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleRename}
                            className="h-9 text-sm"
                            autoFocus
                        />
                    ) : (
                        <div
                            className="bg-background-secondary hover:bg-background-secondary/70 flex cursor-pointer items-start justify-between rounded-md border p-2"
                            onClick={() => setIsRenaming(true)}
                        >
                            <span className="mr-2 min-w-0 flex-1 leading-tight font-medium break-words">
                                {branch.name}
                            </span>
                            <Icons.Pencil className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-3 p-4">
                <div className="space-y-2">
                    <h3 className="text-foreground text-sm">Actions</h3>
                    <div className="flex w-full flex-col items-center gap-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleFork}
                            disabled={isForking}
                        >
                            {isForking ? (
                                <div className="flex items-center gap-2">
                                    <Icons.LoadingSpinner className="h-4 w-4" />
                                    <span>Forking...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Icons.Branch className="h-4 w-4" />
                                    <span>Fork</span>
                                </div>
                            )}
                        </Button>

                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleDelete}
                            disabled={isDeleting || isOnlyBranch}
                            title={
                                isOnlyBranch
                                    ? 'Cannot delete the last remaining branch'
                                    : 'Delete branch'
                            }
                        >
                            {isDeleting ? (
                                <div className="flex items-center gap-2">
                                    <Icons.LoadingSpinner className="h-4 w-4" />
                                    <span>Deleting...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-400">
                                    <Icons.Trash className="h-4 w-4" />
                                    <span>Delete</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="border-border border-t pt-4">
                    <div className="space-y-2">
                        <div className="text-foreground-tertiary/80 space-y-1 text-xs">
                            <div>Created {timeAgo(branch.createdAt)} ago</div>
                            <div>Last modified {timeAgo(branch.updatedAt)} ago</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
