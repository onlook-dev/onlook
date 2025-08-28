import type { Branch } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
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

    constructor(editorEngine: EditorEngine) {
        this.editorEngine = editorEngine;
        makeAutoObservable(this);
    }

    initializeBranches(branches: Branch[]): void {
        this.branchMap.clear();
        for (const branch of branches) {
            const sandboxManager = new SandboxManager(branch, this.editorEngine);
            this.branchMap.set(branch.id, {
                branch,
                sandbox: sandboxManager,
            });
        }
        this.currentBranchId = branches.find(b => b.isDefault)?.id ?? branches[0]?.id ?? null;
        if (!this.currentBranchId) {
            throw new Error('No branch selected. This should not happen after proper initialization.');
        }
    }

    init(): void {
        for (const branchData of this.branchMap.values()) {
            branchData.sandbox.init();
        }
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

    async listBranches(): Promise<Branch[]> {
        return [];
    }

    clear(): void {
        for (const branchData of this.branchMap.values()) {
            branchData.sandbox.clear();
        }
        this.branchMap.clear();
        this.currentBranchId = null;
    }
}