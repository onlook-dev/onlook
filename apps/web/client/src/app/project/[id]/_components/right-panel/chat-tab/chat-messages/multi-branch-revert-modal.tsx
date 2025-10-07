'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { GitMessageCheckpoint } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Checkbox } from '@onlook/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Label } from '@onlook/ui/label';
import { toast } from '@onlook/ui/sonner';
import { useState } from 'react';

interface MultiBranchRevertModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    checkpoints: GitMessageCheckpoint[];
}

export const MultiBranchRevertModal = ({ open, onOpenChange, checkpoints }: MultiBranchRevertModalProps) => {
    const editorEngine = useEditorEngine();
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);

    const toggleBranch = (branchId: string) => {
        setSelectedBranchIds((prev) =>
            prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
        );
    };

    const handleRevert = async () => {
        if (selectedBranchIds.length === 0) {
            toast.error('Please select at least one branch to revert');
            return;
        }

        setIsRestoring(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const branchId of selectedBranchIds) {
                const checkpoint = checkpoints.find((cp) => cp.branchId === branchId);
                if (!checkpoint) {
                    failCount++;
                    continue;
                }

                try {
                    const branchData = editorEngine.branches.getBranchDataById(branchId);
                    if (!branchData) {
                        console.error(`Branch not found: ${branchId}`);
                        failCount++;
                        continue;
                    }

                    // Save current state before restoring
                    const saveResult = await branchData.sandbox.gitManager.createCommit('Save before restoring backup');
                    if (!saveResult.success) {
                        console.warn(`Failed to save before restoring branch ${branchId}`);
                    }

                    // Restore to the specified commit
                    const restoreResult = await branchData.sandbox.gitManager.restoreToCommit(checkpoint.oid);

                    if (restoreResult.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    console.error(`Failed to restore branch ${branchId}:`, error);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully restored ${successCount} branch${successCount > 1 ? 'es' : ''}`, {
                    description: failCount > 0 ? `${failCount} branch${failCount > 1 ? 'es' : ''} failed to restore` : undefined,
                });
            } else {
                toast.error('Failed to restore all selected branches');
            }

            onOpenChange(false);
            setSelectedBranchIds([]);
        } catch (error) {
            console.error('Failed to restore branches:', error);
            toast.error('Failed to restore branches', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsRestoring(false);
        }
    };

    const getBranchName = (branchId: string): string => {
        const branch = editorEngine.branches.getBranchById(branchId);
        return branch?.name || branchId;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Revert Multiple Branches</DialogTitle>
                    <DialogDescription className="pt-2">
                        Select the branches you want to revert to their checkpoint state.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-4">
                    {checkpoints.map((checkpoint) => (
                        <div key={checkpoint.branchId} className="flex items-center gap-3">
                            <Checkbox
                                id={checkpoint.branchId}
                                checked={selectedBranchIds.includes(checkpoint.branchId)}
                                onCheckedChange={() => toggleBranch(checkpoint.branchId)}
                            />
                            <Label
                                htmlFor={checkpoint.branchId}
                                className="text-sm font-normal cursor-pointer flex-1"
                            >
                                {getBranchName(checkpoint.branchId)}
                            </Label>
                        </div>
                    ))}
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
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
                        {isRestoring ? 'Restoring...' : `Revert Selected (${selectedBranchIds.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
