import type { GitMessageCheckpoint } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import type { EditorEngine } from '../engine';

export const BACKUP_COMMIT_MESSAGE = 'Save before restoring backup';

export interface RestoreResult {
    success: boolean;
    error?: string;
}

/**
 * Restore a branch to a specific checkpoint
 * - Creates a backup commit before restoring
 * - Restores the branch to the checkpoint's commit
 * - Shows appropriate toast notifications
 */
export async function restoreCheckpoint(
    checkpoint: GitMessageCheckpoint,
    editorEngine: EditorEngine,
): Promise<RestoreResult> {
    try {
        const branchData = editorEngine.branches.getBranchDataById(checkpoint.branchId);
        if (!branchData) {
            toast.error('Branch not found');
            return { success: false, error: 'Branch not found' };
        }

        // Save current state before restoring
        const saveResult = await branchData.sandbox.gitManager.createCommit(BACKUP_COMMIT_MESSAGE);
        if (!saveResult.success) {
            toast.warning('Failed to save before restoring backup');
        }

        // Restore to the specified commit
        const restoreResult = await branchData.sandbox.gitManager.restoreToCommit(checkpoint.oid);

        if (!restoreResult.success) {
            throw new Error(restoreResult.error || 'Failed to restore commit');
        }

        const branchName = editorEngine.branches.getBranchById(checkpoint.branchId)?.name || checkpoint.branchId;
        toast.success('Restored to backup!', {
            description: `Branch "${branchName}" has been restored`,
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to restore checkpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Failed to restore checkpoint', {
            description: errorMessage,
        });
        return { success: false, error: errorMessage };
    }
}
