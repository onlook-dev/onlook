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

    initializeBranches(branches: Branch[]): void {
        this.branchIdToSandboxManager.clear();
        for (const branch of branches) {
            const sandboxManager = new SandboxManager(branch, this.editorEngine);
            this.branchIdToSandboxManager.set(branch.id, sandboxManager);
        }
        // Set the current branch to the main branch
        this.currentBranchId = branches.find(b => b.isDefault)?.id ?? branches[0]?.id ?? null;
    }

    init(): void {
        // Initialize all sandbox managers
        for (const sandboxManager of this.branchIdToSandboxManager.values()) {
            sandboxManager.init?.();
        }
    }

    getCurrentSandbox(): SandboxManager | null {
        if (!this.currentBranchId) {
            console.error('No branch selected. Call switchToBranch() first.');
            return null;
        }
        return this.branchIdToSandboxManager.get(this.currentBranchId) ?? null;
    }

    async switchToBranch(branchId: string): Promise<void> {
        if (this.currentBranchId === branchId) {
            return;
        }
        this.currentBranchId = branchId;
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