import { api } from '@/trpc/client';
import type { Branch } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import type { ParsedError } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { ErrorManager } from '../error';
import { HistoryManager } from '../history';
import { SandboxManager } from '../sandbox';

interface BranchData {
    branch: Branch;
    sandbox: SandboxManager;
    history: HistoryManager;
    error: ErrorManager;
}

export interface BranchError extends ParsedError {
    branchId: string;
    branchName: string;
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
        for (const { sandbox, history, error } of this.branchMap.values()) {
            sandbox.clear();
            history.clear();
            error.clear();
        }
        this.branchMap.clear();
        for (const branch of branches) {
            const sandboxManager = new SandboxManager(branch, this.editorEngine);
            const historyManager = new HistoryManager(this.editorEngine);
            const errorManager = new ErrorManager();
            this.branchMap.set(branch.id, {
                branch,
                sandbox: sandboxManager,
                history: historyManager,
                error: errorManager,
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

    get activeHistory(): HistoryManager {
        return this.activeBranchData.history;
    }

    get activeError(): ErrorManager {
        return this.activeBranchData.error;
    }

    async switchToBranch(branchId: string): Promise<void> {
        if (this.currentBranchId === branchId) {
            return;
        }
        this.currentBranchId = branchId;
    }

    getBranchDataById(branchId: string): BranchData | null {
        return this.branchMap.get(branchId) ?? null;
    }

    getBranchById(branchId: string): Branch | null {
        return this.getBranchDataById(branchId)?.branch ?? null;
    }

    getSandboxById(branchId: string): SandboxManager | null {
        return this.getBranchDataById(branchId)?.sandbox ?? null;
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
            toast.loading('Forking branch...');
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
            const historyManager = new HistoryManager(this.editorEngine);
            const errorManager = new ErrorManager();
            this.branchMap.set(result.branch.id, {
                branch: result.branch,
                sandbox: sandboxManager,
                history: historyManager,
                error: errorManager,
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
        } finally {
            toast.dismiss();
        }
    }

    async createBlankSandbox(branchName?: string): Promise<void> {
        try {
            toast.loading('Creating blank sandbox...');
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

            // Get current project ID from existing branches
            const currentBranches = Array.from(this.branchMap.values());
            if (currentBranches.length === 0) {
                throw new Error('No project context available');
            }
            const projectId = currentBranches[0]!.branch.projectId;

            // Call the createBlank API
            const result = await api.branch.createBlank.mutate({
                projectId,
                branchName,
                framePosition,
            });

            // Add the new branch to the local branch map
            const sandboxManager = new SandboxManager(result.branch, this.editorEngine);
            const historyManager = new HistoryManager(this.editorEngine);
            const errorManager = new ErrorManager();
            this.branchMap.set(result.branch.id, {
                branch: result.branch,
                sandbox: sandboxManager,
                history: historyManager,
                error: errorManager,
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
            console.error('Failed to create blank sandbox:', error);
            toast.error('Failed to create blank sandbox');
            throw error;
        } finally {
            toast.dismiss();
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

            // Clean up the sandbox, history, and error manager
            branchData.sandbox.clear();
            branchData.history.clear();
            branchData.error.clear();
            // Clean up template nodes for this branch
            this.editorEngine.templateNodes.clearBranch(branchId);
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
            branchData.history.clear();
            branchData.error.clear();
        }
        this.branchMap.clear();
        this.currentBranchId = null;
    }

    // Helper methods for error management
    getAllErrors(): BranchError[] {
        const allErrors: BranchError[] = [];
        for (const branchData of this.branchMap.values()) {
            const branchErrors = branchData.error.errors.map(error => ({
                ...error,
                branchId: branchData.branch.id,
                branchName: branchData.branch.name,
            }));
            allErrors.push(...branchErrors);
        }
        return allErrors;
    }

    getTotalErrorCount(): number {
        return Array.from(this.branchMap.values()).reduce(
            (total, branchData) => total + branchData.error.errors.length,
            0
        );
    }

    getErrorsForBranch(branchId: string): ParsedError[] {
        const branchData = this.getBranchDataById(branchId);
        return branchData?.error.errors || [];
    }
}