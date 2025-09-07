import { beforeEach, describe, expect, mock, test } from 'bun:test';

// CRITICAL: Mock TRPC client BEFORE any other imports
mock.module('@/trpc/client', () => ({
    api: {
        sandbox: {
            start: {
                mutate: mock(async () => ({ id: 'mock-sandbox', status: 'ready' }))
            },
            hibernate: {
                mutate: mock(async () => true)
            }
        },
        branch: {
            fork: {
                mutate: mock(async (params) => ({
                    branch: {
                        id: 'mock-branch',
                        name: 'New Fork',
                        projectId: 'mock-project',
                        description: 'Mock forked branch',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isDefault: false,
                        git: null,
                        sandbox: { id: 'mock-sandbox-id' }
                    },
                    frames: []
                }))
            },
            update: {
                mutate: mock(async () => true)
            },
            delete: { mutate: mock(async () => true) }
        }
    }
}));

// Mock toast
mock.module('@onlook/ui/sonner', () => ({
    toast: {
        success: mock(() => { }),
        error: mock(() => { }),
        info: mock(() => { }),
        loading: mock(() => { }),
        dismiss: mock(() => { })
    }
}));

// Import global test setup
import '../setup';

// Mock parser functions
mock.module('@onlook/parser', () => ({
    getAstFromContent: mock((content: string) => ({ type: 'Program', body: [] })),
    getContentFromAst: mock(async (ast: any) => ast.toString()),
    addOidsToAst: (ast: any) => ({
        ast: ast,
        modified: false,
    }),
    createTemplateNodeMap: () => new Map(),
    injectPreloadScript: mock(() => { }),
}));

import { BranchManager } from '../../src/components/store/editor/branch/manager';

describe('BranchManager', () => {
    let branchManager: BranchManager;
    let mockEditorEngine: any;
    let mockProject: any;

    test('should have TRPC mocks properly configured', async () => {
        // @ts-ignore
        const { api } = await import('@/trpc/client');

        // Test that the mocks are working
        expect(typeof api.branch.fork.mutate).toBe('function');
        expect(typeof api.branch.update.mutate).toBe('function');

        // Test a simple mock call
        const forkResult = await api.branch.fork.mutate({ branchId: 'test' });
        expect(forkResult).toBeTruthy();
        expect(forkResult.branch).toBeTruthy();
        expect(forkResult.branch.name).toBe('New Fork');

        const updateResult = await api.branch.update.mutate({ id: 'test', name: 'updated' });
        expect(updateResult).toBe(true);
    });

    beforeEach(() => {
        // Create mock EditorEngine
        mockEditorEngine = {
            frames: {
                getAll: mock(() => []),
                register: mock(() => { }),
                select: mock(() => { }),
                clear: mock(() => { }),
                applyFrames: mock(() => { }),
                selected: [] // Add the selected property that forkBranch is trying to access
            },
            screenshot: {
                captureScreenshot: mock(async () => { }),
            },
            preloadScript: {
                ensurePreloadScriptFile: mock(async () => { }),
            },
        };

        // Create mock Project
        mockProject = {
            id: 'test-project-id',
            name: 'Test Project',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Create mock initial branch
        const mockInitialBranch = {
            id: 'initial-branch-id',
            projectId: 'test-project-id',
            name: 'main',
            description: 'Initial branch',
            createdAt: new Date(),
            updatedAt: new Date(),
            isDefault: true,
            git: {
                branch: 'main',
                commitSha: 'abc123',
                repoUrl: 'https://github.com/test/repo.git',
            },
            sandbox: {
                id: 'initial-sandbox-id',
            },
        };

        branchManager = new BranchManager(mockEditorEngine);
        branchManager.initBranches([mockInitialBranch]);
    });

    test('should initialize with initial branch', () => {
        expect(branchManager.activeBranch.id).toBe('initial-branch-id');
        expect(branchManager.activeBranch.name).toBe('main');
        expect(branchManager.allBranches).toHaveLength(1);
    });

    test('should get branch by id', () => {
        const branch = branchManager.getBranchById('initial-branch-id');
        expect(branch).toBeTruthy();
        expect(branch?.name).toBe('main');

        const nonExistentBranch = branchManager.getBranchById('non-existent');
        expect(nonExistentBranch).toBeNull();
    });

    test('should get sandbox by id', () => {
        const sandbox = branchManager.getSandboxById('initial-branch-id');
        expect(sandbox).toBeTruthy();

        const nonExistentSandbox = branchManager.getSandboxById('non-existent');
        expect(nonExistentSandbox).toBeNull();
    });

    test('should fork branch without making network calls', async () => {
        // This test should not hang because TRPC is mocked
        try {
            const initialBranchCount = branchManager.allBranches.length;
            const currentBranchId = branchManager.activeBranch.id;

            // Verify we have the expected initial state
            expect(initialBranchCount).toBe(1);
            expect(currentBranchId).toBe('initial-branch-id');

            await branchManager.forkBranch('initial-branch-id');

            // Check that a new branch was added
            const finalBranchCount = branchManager.allBranches.length;
            expect(finalBranchCount).toBe(initialBranchCount + 1);

            const newBranch = branchManager.allBranches.find(b => b.name === 'New Fork');
            expect(newBranch).toBeTruthy();
            expect(newBranch?.id).toBe('mock-branch');
        } catch (error) {
            console.error('Fork branch failed:', {
                error: error?.message,
                stack: error?.stack,
                initialBranches: branchManager.allBranches.length,
                currentBranch: branchManager.activeBranch?.id
            });
            throw error;
        }
    });

    test('should update branch without making network calls', async () => {
        // This test should not hang because TRPC is mocked
        try {
            const originalBranch = branchManager.getBranchById('initial-branch-id');
            expect(originalBranch).toBeTruthy();
            expect(originalBranch?.name).toBe('main');

            await branchManager.updateBranch('initial-branch-id', {
                name: 'Updated Main',
                description: 'Updated description'
            });

            // Check that the branch was updated
            const updatedBranch = branchManager.getBranchById('initial-branch-id');
            expect(updatedBranch?.name).toBe('Updated Main');
            expect(updatedBranch?.description).toBe('Updated description');
        } catch (error) {
            console.error('Update branch failed:', {
                error: error?.message,
                stack: error?.stack,
                branchExists: !!branchManager.getBranchById('initial-branch-id'),
                currentBranch: branchManager.activeBranch?.id
            });
            throw error;
        }
    });

    test('should handle branch operations with mocked API', async () => {
        // Test that branch operations don't cause network timeouts
        const startTime = Date.now();

        try {
            await branchManager.forkBranch('initial-branch-id');
            await branchManager.updateBranch('initial-branch-id', { name: 'Updated' });
        } catch (error) {
            // Even if there are other errors, they shouldn't be network timeout errors
            expect(error).not.toMatch(/Unable to connect|ECONNREFUSED|timeout/i);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete quickly since network calls are mocked
        expect(duration).toBeLessThan(1000); // Less than 1 second
    });
});