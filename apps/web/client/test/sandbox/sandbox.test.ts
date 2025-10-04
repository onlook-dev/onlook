import { describe, expect, test } from 'bun:test';
import { SandboxManager } from '../../src/components/store/editor/sandbox';

describe('SandboxManager', () => {
    test('should create instance with default properties', () => {
        const sandbox = new SandboxManager();
        
        expect(sandbox.running).toBe(false);
        expect(sandbox.projectPath).toBe('');
        expect(sandbox.url).toBe('');
        expect(sandbox.errors.length).toBe(0);
    });

    test('should handle file operations when not initialized', async () => {
        const sandbox = new SandboxManager();
        
        await expect(sandbox.readFile('test.txt')).rejects.toThrow('File system not initialized');
        await expect(sandbox.writeFile('test.txt', 'content')).rejects.toThrow('File system not initialized');
    });

    test('should handle directory operations when not initialized', async () => {
        const sandbox = new SandboxManager();
        
        await expect(sandbox.readDir('/')).rejects.toThrow('File system not initialized');
        await expect(sandbox.fileExists('test.txt')).rejects.toThrow('File system not initialized');
    });

    test('should handle session state', () => {
        const sandbox = new SandboxManager();
        
        // Should have session manager
        expect(sandbox.session).toBeDefined();
        expect(sandbox.session.running).toBe(false);
    });

    test('should handle error state', () => {
        const sandbox = new SandboxManager();
        
        // Should start with no errors
        expect(sandbox.errors).toEqual([]);
        expect(sandbox.hasErrors).toBe(false);
    });
});