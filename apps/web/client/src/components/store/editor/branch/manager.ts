import type { Branch } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { SandboxManager } from '../sandbox';

export class BranchManager {
    private editorEngine: EditorEngine;
    private currentBranchId: string | null = null;
    private branchIdToSandboxManager = new Map<string, SandboxManager>();

    constructor(editorEngine: EditorEngine) {
        this.editorEngine = editorEngine;
        makeAutoObservable(this);
    }

    get currentBranch(): string | null {
        return this.currentBranchId;
    }

    getCurrentSandbox(): SandboxManager | null {
        if (!this.currentBranchId) {
            throw new Error('No branch selected. Please select a branch first.');
        }

        if (!this.branchIdToSandboxManager.has(this.currentBranchId)) {
            // Create new SandboxManager for this branch
            const sandboxManager = new SandboxManager(this.editorEngine);
            this.branchIdToSandboxManager.set(this.currentBranchId, sandboxManager);
        }

        return this.branchIdToSandboxManager.get(this.currentBranchId) ?? null;
    }

    async switchToBranch(branchId: string): Promise<void> {
        if (this.currentBranchId === branchId) {
            return; // Already on this branch
        }

        // TODO: Validate branch exists in database
        this.currentBranchId = branchId;
    }

    async createBranch(
        name: string,
        description?: string,
        fromBranchId?: string
    ): Promise<Branch> {
        // TODO: Implement database branch creation
        // For now, return a mock branch
        const newBranch: Branch = {
            id: `branch-${Date.now()}`,
            name,
            description: description || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            git: null,
            sandbox: {
                // Mock
                id: `sandbox-${Date.now()}`,
            },
        };

        // If copying from another branch, we could copy the sandbox state here
        if (fromBranchId && this.branchIdToSandboxManager.has(fromBranchId)) {
            // TODO: Implement sandbox state copying
        }

        return newBranch;
    }

    async deleteBranch(branchId: string): Promise<void> {
        if (branchId === this.currentBranchId) {
            throw new Error('Cannot delete the currently active branch');
        }

        // Clean up sandbox manager
        const sandboxManager = this.branchIdToSandboxManager.get(branchId);
        if (sandboxManager) {
            sandboxManager.clear();
            this.branchIdToSandboxManager.delete(branchId);
        }

        // TODO: Delete branch from database
    }

    async listBranches(): Promise<Branch[]> {
        return [];
    }

    clear(): void {
        // Clear all sandbox managers
        for (const sandboxManager of this.branchIdToSandboxManager.values()) {
            sandboxManager.clear();
        }
        this.branchIdToSandboxManager.clear();
        this.currentBranchId = null;
    }
}