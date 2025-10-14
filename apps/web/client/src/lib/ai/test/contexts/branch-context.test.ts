import { MessageContextType, type Branch, type BranchMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { BranchContext } from '../../src/contexts/classes/branch';

describe('BranchContext', () => {
    const createMockBranch = (overrides: Partial<Branch> = {}): Branch => ({
        id: 'branch-123',
        projectId: 'project-456',
        name: 'feature/user-authentication',
        description: 'Implement user login and registration system',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        isDefault: false,
        git: {
            branch: 'feature/user-auth',
            commitSha: 'abc123def456',
            repoUrl: 'https://github.com/example/repo.git',
        },
        sandbox: {
            id: 'sandbox-789',
        },
        ...overrides,
    });

    const createMockBranchContext = (overrides: Partial<BranchMessageContext> = {}): BranchMessageContext => ({
        type: MessageContextType.BRANCH,
        content: 'Working on user authentication flow with OAuth integration',
        displayName: 'Authentication Branch',
        branch: createMockBranch(),
        ...overrides,
    });

    describe('static properties', () => {
        test('should have correct context type', () => {
            expect(BranchContext.contextType).toBe(MessageContextType.BRANCH);
        });

        test('should have correct display name', () => {
            expect(BranchContext.displayName).toBe('Branch');
        });

        test('should have an icon', () => {
            expect(BranchContext.icon).toBeDefined();
        });
    });

    describe('getPrompt', () => {
        test('should generate correct prompt format', () => {
            const context = createMockBranchContext();
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch: feature/user-authentication (branch-123)');
            expect(prompt).toContain('Description: Working on user authentication flow with OAuth integration');
        });

        test('should handle branch with null description', () => {
            const context = createMockBranchContext({
                branch: createMockBranch({ description: null }),
                content: 'Main development branch',
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch: feature/user-authentication (branch-123)');
            expect(prompt).toContain('Description: Main development branch');
        });

        test('should handle empty content', () => {
            const context = createMockBranchContext({
                content: '',
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch: feature/user-authentication (branch-123)');
            expect(prompt).toContain('Description: ');
        });

        test('should handle branch with special characters in name', () => {
            const context = createMockBranchContext({
                branch: createMockBranch({
                    name: 'fix/bug-&-improvement-#123',
                    id: 'branch-special-456',
                }),
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch: fix/bug-&-improvement-#123 (branch-special-456)');
        });

        test('should handle very long branch names', () => {
            const longName = 'feature/very-long-branch-name-that-describes-complex-functionality-in-great-detail';
            const context = createMockBranchContext({
                branch: createMockBranch({ name: longName }),
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain(`Branch: ${longName} (branch-123)`);
        });

        test('should handle multiline content description', () => {
            const context = createMockBranchContext({
                content: 'Multi-line description:\n- Add login form\n- Implement OAuth\n- Add validation',
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Multi-line description:');
            expect(prompt).toContain('- Add login form');
            expect(prompt).toContain('- Implement OAuth');
            expect(prompt).toContain('- Add validation');
        });

        test('should handle unicode characters in branch name and content', () => {
            const context = createMockBranchContext({
                branch: createMockBranch({ name: 'feature/internationalization-🌍' }),
                content: 'Adding support for 中文 and العربية languages',
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('feature/internationalization-🌍');
            expect(prompt).toContain('中文 and العربية');
        });
    });

    describe('getLabel', () => {
        test('should use displayName when available', () => {
            const context = createMockBranchContext({
                displayName: 'Custom Branch Label',
            });
            const label = BranchContext.getLabel(context);

            expect(label).toBe('Custom Branch Label');
        });

        test('should fallback to branch name when no displayName', () => {
            const context = createMockBranchContext({
                displayName: '',
                branch: createMockBranch({ name: 'development' }),
            });
            const label = BranchContext.getLabel(context);

            expect(label).toBe('development');
        });

        test('should fallback to branch name when displayName is undefined', () => {
            const context = createMockBranchContext();
            delete (context as any).displayName;
            const label = BranchContext.getLabel(context);

            expect(label).toBe('feature/user-authentication');
        });

        test('should handle empty branch name', () => {
            const context = createMockBranchContext({
                displayName: '',
                branch: createMockBranch({ name: '' }),
            });
            const label = BranchContext.getLabel(context);

            expect(label).toBe('');
        });

        test('should handle whitespace-only displayName', () => {
            const context = createMockBranchContext({
                displayName: '   \t\n   ',
            });
            const label = BranchContext.getLabel(context);

            expect(label).toBe('   \t\n   ');
        });
    });

    describe('getBranchesContent', () => {
        test('should generate content for single branch', () => {
            const branches = [createMockBranchContext()];
            const content = BranchContext.getBranchesContent(branches);

            expect(content).toContain("I'm working on the following branches:");
            expect(content).toContain('branch-123');
            expect(content).toContain('<branches>');
            expect(content).toContain('</branches>');
        });

        test('should generate content for multiple branches', () => {
            const branches = [
                createMockBranchContext({
                    branch: createMockBranch({ id: 'branch-1', name: 'main' }),
                }),
                createMockBranchContext({
                    branch: createMockBranch({ id: 'branch-2', name: 'feature/auth' }),
                }),
                createMockBranchContext({
                    branch: createMockBranch({ id: 'branch-3', name: 'bugfix/layout' }),
                }),
            ];
            const content = BranchContext.getBranchesContent(branches);

            expect(content).toContain('branch-1, branch-2, branch-3');
            expect(content).toContain('<branches>');
        });

        test('should handle empty branches array', () => {
            const content = BranchContext.getBranchesContent([]);

            expect(content).toContain("I'm working on the following branches:");
            expect(content).toContain('<branches>');
            expect(content).toContain('</branches>');
        });

        test('should handle branches with special characters in IDs', () => {
            const branches = [
                createMockBranchContext({
                    branch: createMockBranch({ id: 'branch-special-&-chars-123' }),
                }),
                createMockBranchContext({
                    branch: createMockBranch({ id: 'branch_with_underscores' }),
                }),
            ];
            const content = BranchContext.getBranchesContent(branches);

            expect(content).toContain('branch-special-&-chars-123, branch_with_underscores');
        });

        test('should preserve branch order', () => {
            const branches = [
                createMockBranchContext({
                    branch: createMockBranch({ id: 'first' }),
                }),
                createMockBranchContext({
                    branch: createMockBranch({ id: 'second' }),
                }),
                createMockBranchContext({
                    branch: createMockBranch({ id: 'third' }),
                }),
            ];
            const content = BranchContext.getBranchesContent(branches);

            expect(content).toContain('first, second, third');
        });

        test('should handle very long branch ID lists', () => {
            const branches = Array(20).fill(0).map((_, i) =>
                createMockBranchContext({
                    branch: createMockBranch({ id: `branch-${i}` }),
                })
            );
            const content = BranchContext.getBranchesContent(branches);

            expect(content).toContain('branch-0');
            expect(content).toContain('branch-19');
            expect(content.split(',').length).toBe(20);
        });
    });

    describe('edge cases', () => {
        test('should handle branch with minimal data', () => {
            const minimalBranch = createMockBranch({
                name: 'main',
                description: null,
                git: null,
            });
            const context = createMockBranchContext({
                branch: minimalBranch,
                content: 'Main branch',
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch: main (branch-123)');
            expect(prompt).toContain('Description: Main branch');
        });

        test('should handle branch with git information', () => {
            const context = createMockBranchContext();
            // Git info is included in the branch but not directly used in prompt
            expect(context.branch.git?.branch).toBe('feature/user-auth');
            expect(context.branch.git?.commitSha).toBe('abc123def456');
        });

        test('should handle default branch', () => {
            const context = createMockBranchContext({
                branch: createMockBranch({
                    name: 'main',
                    isDefault: true,
                }),
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch: main (branch-123)');
        });

        test('should handle branch with very long description', () => {
            const longDescription = 'This is a very long description. '.repeat(50);
            const context = createMockBranchContext({
                content: longDescription,
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain(longDescription);
        });

        test('should handle branch with null or undefined properties gracefully', () => {
            const context = {
                type: MessageContextType.BRANCH,
                content: 'Test content',
                displayName: null,
                branch: {
                    id: 'test-id',
                    name: 'test-branch',
                },
            } as any;

            expect(() => BranchContext.getPrompt(context)).not.toThrow();
            expect(() => BranchContext.getLabel(context)).not.toThrow();
        });

        test('should handle branch with empty strings', () => {
            const context = createMockBranchContext({
                branch: createMockBranch({ name: '', id: '' }),
                content: '',
                displayName: '',
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('Branch:  ()');
            expect(prompt).toContain('Description: ');
        });

        test('should handle complex branch names with slashes and hyphens', () => {
            const context = createMockBranchContext({
                branch: createMockBranch({
                    name: 'feature/user-management/add-roles-and-permissions',
                }),
            });
            const prompt = BranchContext.getPrompt(context);

            expect(prompt).toContain('feature/user-management/add-roles-and-permissions');
        });
    });
});