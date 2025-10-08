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
 * - Pauses sync to prevent race conditions during git restore
 * - Creates a backup commit before restoring
 * - Restores the branch to the checkpoint's commit
 * - Resumes sync and re-syncs from sandbox
 * - Shows appropriate toast notifications
 * - Falls back to active branch for legacy checkpoints without branchId
 */
export async function restoreCheckpoint(
    checkpoint: GitMessageCheckpoint,
    editorEngine: EditorEngine,
): Promise<RestoreResult> {
    try {
        // Fall back to active branch for legacy checkpoints
        const targetBranchId = checkpoint.branchId ?? editorEngine.branches.activeBranch.id;
        const branchData = editorEngine.branches.getBranchDataById(targetBranchId);

        if (!branchData) {
            toast.error('Branch not found');
            return { success: false, error: 'Branch not found' };
        }

        // Pause sync for this sandbox to prevent race conditions during git restore
        // All sync engines for this sandbox will respect the pause via the global set
        // Git restore fires rapid remove/add/change events that can cause spurious deletes
        const sync = branchData.sandbox.sync;
        if (!sync) {
            toast.error('Sync engine not initialized');
            return { success: false, error: 'Sync engine not initialized' };
        }

        console.log(`[Restore] Pausing sandbox ${targetBranchId} for git restore`);
        sync.pause('git-restore');

        try {
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

            // Wait for git and sandbox events to settle before resuming sync
            // Git restore fires many rapid events that can take time to propagate
            await new Promise(resolve => setTimeout(resolve, 500));

            const branchName = editorEngine.branches.getBranchById(targetBranchId)?.name || targetBranchId;
            toast.success('Restored to backup!', {
                description: `Branch "${branchName}" has been restored`,
            });

            return { success: true };
        } finally {
            // Always resume sync and re-sync from sandbox to ensure consistency
            console.log(`[Restore] Resuming sandbox ${targetBranchId} after git restore`);
            await sync.resume(true, 'git-restore');
        }
    } catch (error) {
        console.error('Failed to restore checkpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Failed to restore checkpoint', {
            description: errorMessage,
        });
        return { success: false, error: errorMessage };
    }
}
