'use client';

import { useState } from 'react';

import type { GitMessageCheckpoint } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { restoreCheckpoint } from '@/components/store/editor/git';

interface MultiBranchRevertModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    checkpoints: GitMessageCheckpoint[];
}

export const MultiBranchRevertModal = ({
    open,
    onOpenChange,
    checkpoints,
}: MultiBranchRevertModalProps) => {
    const editorEngine = useEditorEngine();
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);

    const allAreSelected = selectedBranchIds.length === checkpoints.length;

    const toggleBranch = (branchId: string) => {
        setSelectedBranchIds((prev) =>
            prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
        );
    };

    const selectAll = () => {
        setSelectedBranchIds(
            checkpoints.map((cp) => cp.branchId).filter((id): id is string => !!id),
        );
    };

    const selectNone = () => {
        setSelectedBranchIds([]);
    };

    const handleRevert = async () => {
        try {
            if (selectedBranchIds.length === 0) {
                toast.error('Please select at least one branch to revert');
                return;
            }

            setIsRestoring(true);

            const restorePromises = selectedBranchIds.map(async (branchId) => {
                const checkpoint = checkpoints.find((cp) => cp.branchId === branchId);
                if (!checkpoint) {
                    return { success: false };
                }
                return restoreCheckpoint(checkpoint, editorEngine);
            });

            const results = await Promise.all(restorePromises);
            const successCount = results.filter((r) => r.success).length;
            const failCount = results.length - successCount;

            if (failCount > 0) {
                toast.error('Failed to restore all selected branches');
            }
        } catch (error) {
            toast.error('Failed to restore branches', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsRestoring(false);
            onOpenChange(false);
            setSelectedBranchIds([]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Restore Multiple Branches</DialogTitle>
                    <DialogDescription className="pt-2">
                        Select the branches you want to restore to their previous state.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 py-4">
                    <div className="mb-1 flex justify-end gap-1">
                        {allAreSelected ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selectNone}
                                disabled={isRestoring}
                            >
                                Select None
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selectAll}
                                disabled={isRestoring}
                            >
                                Select All
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        {checkpoints.map((checkpoint) => {
                            // Skip legacy checkpoints without branchId (shouldn't happen in multi-branch modal)
                            if (!checkpoint.branchId) return null;
                            const isSelected = selectedBranchIds.includes(checkpoint.branchId);
                            return (
                                <button
                                    key={checkpoint.branchId}
                                    onClick={() => toggleBranch(checkpoint.branchId!)}
                                    disabled={isRestoring}
                                    className={cn(
                                        'flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-all',
                                        'hover:bg-background-secondary/50',
                                        isSelected
                                            ? 'border-primary/50 bg-primary/5'
                                            : 'border-border/50',
                                        isRestoring && 'cursor-not-allowed opacity-50',
                                    )}
                                >
                                    <span className="text-sm">
                                        {editorEngine.branches.getBranchById(checkpoint.branchId)
                                            ?.name ?? checkpoint.branchId}
                                    </span>
                                    {isSelected && <Icons.Check className="text-primary h-4 w-4" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                            setSelectedBranchIds([]);
                        }}
                        disabled={isRestoring}
                        className="order-2 sm:order-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleRevert}
                        disabled={isRestoring || selectedBranchIds.length === 0}
                        className="order-1 sm:order-2"
                    >
                        {isRestoring ? 'Restoring...' : 'Restore Selected'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
