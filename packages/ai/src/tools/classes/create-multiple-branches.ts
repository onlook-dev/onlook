import { api } from '@onlook/web-client/src/trpc/client';
import { CodeFileSystem } from '@onlook/file-system';
import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { ErrorManager } from '@onlook/web-client/src/components/store/editor/error';
import { HistoryManager } from '@onlook/web-client/src/components/store/editor/history';
import { SandboxManager } from '@onlook/web-client/src/components/store/editor/sandbox';
import { z } from 'zod';
import { ClientTool } from '../models/client';

interface BranchCreationResult {
    branchId: string;
    branchName: string;
    ready: boolean;
    error?: string;
}

export class CreateMultipleBranchesTool extends ClientTool {
    static readonly toolName = 'create_multiple_branches';
    static readonly description = 'Create multiple duplicate branches of a selected branch, positioned side-by-side underneath the source branch. Useful for creating multiple variations or versions of a branch to compare different implementations. All branches will be created and their sandboxes will be initialized before returning.';
    static readonly parameters = z.object({
        branchId: z.string().uuid().optional().describe('The branch ID to fork. If not provided, uses the currently active branch.'),
        count: z.number().int().min(1).max(5).describe('Number of branches to create (1-5). Maximum of 5 branches to limit resource usage.'),
    });
    static readonly icon = Icons.Branch;

    async handle(
        args: z.infer<typeof CreateMultipleBranchesTool.parameters>,
        editorEngine: EditorEngine,
    ): Promise<string> {
        // Determine source branch
        let sourceBranchId: string;
        if (args.branchId) {
            sourceBranchId = args.branchId;
        } else {
            const activeBranch = editorEngine.branches.activeBranch;
            if (!activeBranch) {
                throw new Error('No branch is currently selected. Please select a branch first or provide a branchId parameter.');
            }
            sourceBranchId = activeBranch.id;
        }

        // Verify source branch exists
        const sourceBranch = editorEngine.branches.getBranchById(sourceBranchId);
        if (!sourceBranch) {
            throw new Error(`Branch with ID ${sourceBranchId} not found.`);
        }

        // Get source branch frame for positioning reference
        const sourceFrames = editorEngine.frames.getAll().filter(
            frameData => frameData.frame.branchId === sourceBranchId
        );
        
        if (sourceFrames.length === 0) {
            throw new Error(`Source branch "${sourceBranch.name}" has no frames. Cannot determine positioning.`);
        }

        const sourceFrame = sourceFrames[0]!.frame;
        const frameWidth = sourceFrame.dimension.width;
        const frameHeight = sourceFrame.dimension.height;
        const sourceX = sourceFrame.position.x;
        const sourceY = sourceFrame.position.y;

        // Calculate positions for branches in horizontal row underneath source
        const SPACING = 100;
        const baseY = sourceY + frameHeight + SPACING;
        const positions: Array<{ x: number; y: number }> = [];
        
        for (let i = 0; i < args.count; i++) {
            positions.push({
                x: sourceX + (i * (frameWidth + SPACING)),
                y: baseY,
            });
        }

        // Store original active branch ID to preserve it
        const originalActiveBranchId = editorEngine.branches.activeBranch.id;

        // Create branches sequentially
        const results: BranchCreationResult[] = [];
        const errors: string[] = [];

        for (let i = 0; i < args.count; i++) {
            try {
                const result = await api.branch.fork.mutate({
                    branchId: sourceBranchId,
                    positionOverride: positions[i],
                });

                // Add the new branch to the local branch map
                // Replicate the logic from BranchManager.createBranchData (which is private)
                const codeEditorApi = new CodeFileSystem(editorEngine.projectId, result.branch.id);
                const errorManager = new ErrorManager(result.branch);
                const sandboxManager = new SandboxManager(result.branch, editorEngine, errorManager, codeEditorApi);
                const historyManager = new HistoryManager(editorEngine);

                const branchData = {
                    branch: result.branch,
                    sandbox: sandboxManager,
                    history: historyManager,
                    error: errorManager,
                    codeEditor: codeEditorApi,
                };

                // Access the private branchMap to add the branch data
                (editorEngine.branches as any).branchMap.set(result.branch.id, branchData);
                
                await branchData.codeEditor.initialize();
                await branchData.sandbox.init();

                // Add the created frames to the frame manager
                if (result.frames && result.frames.length > 0) {
                    editorEngine.frames.applyFrames(result.frames);
                }

                results.push({
                    branchId: result.branch.id,
                    branchName: result.branch.name,
                    ready: false, // Will be updated after sandbox check
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Failed to create branch ${i + 1}: ${errorMessage}`);
                results.push({
                    branchId: '',
                    branchName: `Failed branch ${i + 1}`,
                    ready: false,
                    error: errorMessage,
                });
            }
        }

        // Wait for all sandboxes to be ready
        const MAX_WAIT_TIME = 60000; // 60 seconds per sandbox
        const POLL_INTERVAL = 500; // Check every 500ms

        for (let i = 0; i < results.length; i++) {
            const result = results[i]!;
            if (result.error) {
                continue; // Skip failed branches
            }

            let ready = false;
            const branchStartTime = Date.now();

            while (!ready && (Date.now() - branchStartTime) < MAX_WAIT_TIME) {
                const branchData = editorEngine.branches.getBranchDataById(result.branchId);
                if (branchData?.sandbox?.session.provider) {
                    ready = true;
                    result.ready = true;
                    break;
                }
                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            }

            if (!ready) {
                result.error = `Sandbox initialization timeout after ${MAX_WAIT_TIME / 1000}s`;
            }
        }

        // Ensure original active branch is still selected
        if (editorEngine.branches.activeBranch.id !== originalActiveBranchId) {
            await editorEngine.branches.switchToBranch(originalActiveBranchId);
        }

        // Format response
        const successfulBranches = results.filter(r => r.ready);
        const failedBranches = results.filter(r => !r.ready || r.error);

        let response = `Created ${successfulBranches.length} of ${args.count} branches from "${sourceBranch.name}":\n\n`;
        
        successfulBranches.forEach((result, index) => {
            response += `${index + 1}. "${result.branchName}" (ID: ${result.branchId}) - Ready\n`;
        });

        if (failedBranches.length > 0) {
            response += `\nFailed branches:\n`;
            failedBranches.forEach((result, index) => {
                response += `${index + 1}. "${result.branchName}" - ${result.error || 'Not ready'}\n`;
            });
        }

        if (errors.length > 0) {
            response += `\nErrors encountered:\n${errors.join('\n')}`;
        }

        return response;
    }

    static getLabel(input?: z.infer<typeof CreateMultipleBranchesTool.parameters>): string {
        const count = input?.count ?? 1;
        return `Creating ${count} branch${count > 1 ? 'es' : ''}`;
    }
}

