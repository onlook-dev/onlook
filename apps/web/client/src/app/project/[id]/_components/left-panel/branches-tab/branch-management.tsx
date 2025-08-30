import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/client';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { toast } from 'sonner';

interface BranchManagementProps {
    branchId: string;
    branchName: string;
}

export const BranchManagement = observer(({ branchId, branchName }: BranchManagementProps) => {
    const editorEngine = useEditorEngine();
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(branchName);
    const [isForking, setIsForking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isActiveBranch = editorEngine.branches.activeBranch.id === branchId;

    const handleClose = () => {
        editorEngine.state.branchTab = null;
    };

    const handleRename = async () => {
        if (newName.trim() === branchName || !newName.trim()) {
            setIsRenaming(false);
            setNewName(branchName);
            return;
        }

        try {
            const success = await api.branch.update.mutate({
                id: branchId,
                name: newName.trim(),
            });
            
            if (success) {
                // Update local branch state
                const branch = editorEngine.branches.getBranchById(branchId);
                if (branch) {
                    branch.name = newName.trim();
                }
                toast.success(`Branch renamed to "${newName.trim()}"`);
                setIsRenaming(false);
            } else {
                throw new Error('Failed to update branch');
            }
        } catch (error) {
            console.error('Failed to rename branch:', error);
            toast.error('Failed to rename branch');
            setNewName(branchName);
            setIsRenaming(false);
        }
    };

    const handleFork = async () => {
        if (isForking) return;
        
        try {
            setIsForking(true);
            // Switch to the branch first if it's not already active
            if (!isActiveBranch) {
                await editorEngine.branches.switchToBranch(branchId);
            }
            await editorEngine.branches.forkBranch();
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
        if (isDeleting || isActiveBranch) return;
        
        try {
            setIsDeleting(true);
            
            const success = await api.branch.delete.mutate({
                branchId: branchId,
            });
            
            if (success) {
                // Remove branch from local state
                editorEngine.branches.removeBranch(branchId);
                toast.success('Branch deleted successfully');
                handleClose();
            } else {
                throw new Error('Failed to delete branch');
            }
        } catch (error) {
            console.error('Failed to delete branch:', error);
            toast.error('Failed to delete branch');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewName(branchName);
        }
    };

    return (
        <div className="flex flex-col h-full text-xs text-active flex-grow w-full p-0">
            {/* Header Section */}
            <div className="flex justify-between items-center pl-4 pr-2.5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Icons.GitBranch className="w-4 h-4" />
                    <h2 className="text-sm font-normal text-foreground">Branch Settings</h2>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-background-secondary"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>

            {/* Branch Info Section */}
            <div className="p-4 border-b border-border space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-muted-foreground">Branch Name</label>
                        {isActiveBranch && (
                            <span className="text-xs bg-accent text-foreground px-2 py-1 rounded">
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
                            className="flex items-center justify-between p-2 bg-background-secondary rounded-md cursor-pointer hover:bg-background-secondary/70"
                            onClick={() => setIsRenaming(true)}
                        >
                            <span className="font-medium">{branchName}</span>
                            <Icons.Pencil className="w-3 h-3 text-muted-foreground" />
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex-1 p-4 space-y-3">
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Actions</h3>
                    
                    {/* Fork Branch */}
                    <Button
                        variant="ghost"
                        className="w-full h-11 justify-start text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                        onClick={handleFork}
                        disabled={isForking}
                    >
                        {isForking ? (
                            <div className="flex items-center gap-2">
                                <Icons.LoadingSpinner className="w-4 h-4" />
                                <span>Forking...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Icons.GitBranch className="w-4 h-4" />
                                <span>Fork Branch</span>
                            </div>
                        )}
                    </Button>

                    {/* Delete Branch */}
                    <Button
                        variant="ghost"
                        className="w-full h-11 justify-start text-sm text-destructive hover:text-destructive bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                        onClick={handleDelete}
                        disabled={isDeleting || isActiveBranch}
                        title={isActiveBranch ? "Cannot delete active branch" : "Delete branch"}
                    >
                        {isDeleting ? (
                            <div className="flex items-center gap-2">
                                <Icons.LoadingSpinner className="w-4 h-4" />
                                <span>Deleting...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Icons.Trash className="w-4 h-4" />
                                <span>Delete Branch</span>
                            </div>
                        )}
                    </Button>
                </div>

                {/* Placeholder Sections */}
                <div className="pt-4 border-t border-border">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground">Branch Info</h3>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>Created: Coming soon</div>
                            <div>Last modified: Coming soon</div>
                            <div>Commits: Coming soon</div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground">Collaboration</h3>
                        <div className="space-y-2">
                            <Button
                                variant="ghost"
                                className="w-full h-9 justify-start text-sm text-muted-foreground bg-background-secondary rounded-lg border border-white/5"
                                disabled
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Share className="w-4 h-4" />
                                    <span>Share Branch (Coming Soon)</span>
                                </div>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});