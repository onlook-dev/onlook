import { api } from '@/trpc/client';
import type { Branch } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { SandboxManager } from '../sandbox';

interface BranchData {
    branch: Branch;
    sandbox: SandboxManager;
}

export class BranchManager {
    private editorEngine: EditorEngine;
    private currentBranchId: string | null = null;
    private branchMap = new Map<string, BranchData>();
    private reactionDisposer: (() => void) | null = null;

    constructor(editorEngine: EditorEngine) {
        this.editorEngine = editorEngine;
        makeAutoObservable(this);
    }

    initBranches(branches: Branch[]): void {
        this.reactionDisposer?.();
        this.reactionDisposer = null;
        for (const { sandbox } of this.branchMap.values()) {
            sandbox.clear();
        }
        this.branchMap.clear();
        for (const branch of branches) {
            const sandboxManager = new SandboxManager(branch, this.editorEngine);
            this.branchMap.set(branch.id, {
                branch,
                sandbox: sandboxManager,
            });
        }
        // Preserve previous selection if still present; else default; else first; else null
        const prev = this.currentBranchId;
        if (prev && this.branchMap.has(prev)) {
            this.currentBranchId = prev;
        } else {
            this.currentBranchId =
                branches.find(b => b.isDefault)?.id
                ?? branches[0]?.id
                ?? null;
        }
    }

    init(): void {
        for (const branchData of this.branchMap.values()) {
            branchData.sandbox.init();
        }
        this.setupActiveFrameReaction();
    }

    private setupActiveFrameReaction(): void {
        this.reactionDisposer?.();
        this.reactionDisposer = reaction(
            () => {
                const selectedFrames = this.editorEngine.frames.selected;
                const activeFrame = selectedFrames.length > 0 ? selectedFrames[0] : this.editorEngine.frames.getAll()[0];
                return activeFrame?.frame?.branchId || null;
            },
            (activeBranchId) => {
                if (activeBranchId && activeBranchId !== this.currentBranchId && this.branchMap.has(activeBranchId)) {
                    this.currentBranchId = activeBranchId;
                }
            }
        );
    }

    get activeBranchData(): BranchData {
        if (!this.currentBranchId) {
            throw new Error('No branch selected. This should not happen after proper initialization.');
        }
        const branchData = this.branchMap.get(this.currentBranchId);
        if (!branchData) {
            throw new Error(`Branch not found for branch ${this.currentBranchId}. This should not happen after proper initialization.`);
        }
        return branchData;
    }

    get activeBranch(): Branch {
        return this.activeBranchData.branch;
    }

    get activeSandbox(): SandboxManager {
        return this.activeBranchData.sandbox;
    }

    async switchToBranch(branchId: string): Promise<void> {
        if (this.currentBranchId === branchId) {
            return;
        }
        this.currentBranchId = branchId;
    }

    getBranchById(branchId: string): Branch | null {
        return this.branchMap.get(branchId)?.branch ?? null;
    }

    get allBranches(): Branch[] {
        return Array.from(this.branchMap.values()).map(({ branch }) => branch);
    }

    async listBranches(): Promise<Branch[]> {
        return [];
    }

    async forkBranch(branchName?: string): Promise<void> {
        if (!this.currentBranchId) {
            throw new Error('No active branch to fork');
        }

        try {
            // Get current active frame for positioning
            const activeFrames = this.editorEngine.frames.selected;
            const activeFrame = activeFrames.length > 0 ? activeFrames[0] : this.editorEngine.frames.getAll()[0];

            let framePosition;
            if (activeFrame) {
                const frame = activeFrame.frame;
                framePosition = {
                    x: frame.position.x,
                    y: frame.position.y,
                    width: frame.dimension.width,
                    height: frame.dimension.height,
                };
            }

            // Call the fork API
            const result = await api.branch.fork.mutate({
                sourceBranchId: this.currentBranchId,
                branchName,
                framePosition,
            });

            // Add the new branch to the local branch map
            const sandboxManager = new SandboxManager(result.branch, this.editorEngine);
            this.branchMap.set(result.branch.id, {
                branch: result.branch,
                sandbox: sandboxManager,
            });

            // Initialize the new sandbox
            sandboxManager.init();

            // Add the created frames to the frame manager
            if (result.frames && result.frames.length > 0) {
                this.editorEngine.frames.applyFrames(result.frames);
            }

            // Switch to the new branch
            await this.switchToBranch(result.branch.id);
        } catch (error) {
            console.error('Failed to fork branch:', error);
            toast.error('Failed to fork branch');
            throw error;
        }
    }

    async updateBranch(branchId: string, updates: Partial<Branch>): Promise<void> {
        const branchData = this.branchMap.get(branchId);
        if (!branchData) {
            throw new Error('Branch not found');
        }

        try {
            const success = await api.branch.update.mutate({
                id: branchId,
                ...updates,
            });

            if (success) {
                // Update local branch state
                Object.assign(branchData.branch, updates);
            } else {
                throw new Error('Failed to update branch');
            }
        } catch (error) {
            console.error('Failed to update branch:', error);
            throw error;
        }
    }

    removeBranch(branchId: string): void {
        const branchData = this.branchMap.get(branchId);
        if (branchData) {
            // Remove all frames associated with this branch
            const framesToRemove = this.editorEngine.frames.getAll().filter(
                frameState => frameState.frame.branchId === branchId
            );

            for (const frameState of framesToRemove) {
                this.editorEngine.frames.delete(frameState.frame.id);
            }

            // Clean up the sandbox
            branchData.sandbox.clear();
            // Remove from the map
            this.branchMap.delete(branchId);

            // If this was the current branch, switch to default or first available
            if (this.currentBranchId === branchId) {
                const remainingBranches = Array.from(this.branchMap.values()).map(({ branch }) => branch);
                this.currentBranchId =
                    remainingBranches.find(b => b.isDefault)?.id
                    ?? remainingBranches[0]?.id
                    ?? null;
            }
        }
    }

    clear(): void {
        this.reactionDisposer?.();
        this.reactionDisposer = null;
        for (const branchData of this.branchMap.values()) {
            branchData.sandbox.clear();
        }
        this.branchMap.clear();
        this.currentBranchId = null;
    }
}