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

    getCurrentSandbox(): SandboxManager {
        if (!this.currentBranchId) {
            throw new Error('No branch selected. Call switchToBranch() first.');
        }

        if (!this.branchIdToSandboxManager.has(this.currentBranchId)) {
            const sandboxManager = new SandboxManager(this.editorEngine);
            this.branchIdToSandboxManager.set(this.currentBranchId, sandboxManager);
        }

        return this.branchIdToSandboxManager.get(this.currentBranchId)!;
    }

    async startCurrentBranchSandbox(): Promise<void> {
        if (!this.currentBranchId) {
            throw new Error('No branch selected. Call switchToBranch() first.');
        }

        const branch = await this.getBranchById(this.currentBranchId);
        await this.getCurrentSandbox().session.start(branch.sandbox.id);
    }

    async switchToBranch(branchId: string): Promise<void> {
        if (this.currentBranchId === branchId) {
            return;
        }

        this.currentBranchId = branchId;
    }

    async createBranch(
        name: string,
        description?: string,
        fromBranchId?: string,
        isDefault = false
    ): Promise<Branch> {
        const newBranch: Branch = {
            id: `branch-${Date.now()}`,
            name,
            description: description || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            git: null,
            sandbox: {
                id: `sandbox-${Date.now()}`,
            },
        };

        return newBranch;
    }

    async deleteBranch(branchId: string): Promise<void> {
        if (branchId === this.currentBranchId) {
            throw new Error('Cannot delete the currently active branch');
        }

        const sandboxManager = this.branchIdToSandboxManager.get(branchId);
        if (sandboxManager) {
            sandboxManager.clear();
            this.branchIdToSandboxManager.delete(branchId);
        }
    }

    async getDefaultBranch(): Promise<Branch> {
        return {
            id: 'main-branch-id',
            name: 'main',
            description: 'Default main branch',
            createdAt: new Date(),
            updatedAt: new Date(),
            git: null,
            sandbox: {
                id: 'main-sandbox-id',
            },
        };
    }

    async getBranchById(branchId: string): Promise<Branch> {
        return {
            id: branchId,
            name: branchId === 'main-branch-id' ? 'main' : `branch-${branchId}`,
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            git: null,
            sandbox: {
                id: `${branchId}-sandbox`,
            },
        };
    }


    private async createMainBranch(): Promise<Branch> {
        return {
            id: 'main-branch-id',
            name: 'main',
            description: 'Default main branch',
            createdAt: new Date(),
            updatedAt: new Date(),
            git: null,
            sandbox: {
                id: 'main-sandbox-id',
            },
        };
    }

    async listBranches(): Promise<Branch[]> {
        return [];
    }

    clear(): void {
        for (const sandboxManager of this.branchIdToSandboxManager.values()) {
            sandboxManager.clear();
        }
        this.branchIdToSandboxManager.clear();
        this.currentBranchId = null;
    }
}