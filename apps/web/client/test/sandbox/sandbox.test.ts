import { describe, expect, test } from 'bun:test';
import { SandboxManager } from '../../src/components/store/editor/sandbox';
import { ErrorManager } from '../../src/components/store/editor/errors';

describe('SandboxManager', () => {
    test('should create instance with dependencies', () => {
        const mockBranch = {
            sandbox: { id: 'test-sandbox-id' },
            id: 'test-branch-id'
        };
        const errorManager = new ErrorManager();
        const sandbox = new SandboxManager(mockBranch as any, errorManager);
        
        expect(sandbox.running).toBe(false);
        expect(sandbox.projectPath).toBe('');
        expect(sandbox.url).toBe('');
    });

    test('should handle file operations when not initialized', async () => {
        const mockBranch = {
            sandbox: { id: 'test-sandbox-id' },
            id: 'test-branch-id'
        };
        const errorManager = new ErrorManager();
        const sandbox = new SandboxManager(mockBranch as any, errorManager);
        
        await expect(sandbox.readFile('test.txt')).rejects.toThrow('File system not initialized');
        await expect(sandbox.writeFile('test.txt', 'content')).rejects.toThrow('File system not initialized');
    });

    test('should handle directory operations when not initialized', async () => {
        const mockBranch = {
            sandbox: { id: 'test-sandbox-id' },
            id: 'test-branch-id'
        };
        const errorManager = new ErrorManager();
        const sandbox = new SandboxManager(mockBranch as any, errorManager);
        
        await expect(sandbox.readDir('/')).rejects.toThrow('File system not initialized');
        await expect(sandbox.fileExists('test.txt')).rejects.toThrow('File system not initialized');
    });

    test('should handle session state', () => {
        const mockBranch = {
            sandbox: { id: 'test-sandbox-id' },
            id: 'test-branch-id'
        };
        const errorManager = new ErrorManager();
        const sandbox = new SandboxManager(mockBranch as any, errorManager);
        
        // Should have session manager
        expect(sandbox.session).toBeDefined();
        expect(sandbox.session.running).toBe(false);
    });

    test('should handle error state', () => {
        const mockBranch = {
            sandbox: { id: 'test-sandbox-id' },
            id: 'test-branch-id'
        };
        const errorManager = new ErrorManager();
        const sandbox = new SandboxManager(mockBranch as any, errorManager);
        
        // Should have error manager
        expect(sandbox.errors).toBeDefined();
        expect(sandbox.hasErrors).toBe(false);
    });
});